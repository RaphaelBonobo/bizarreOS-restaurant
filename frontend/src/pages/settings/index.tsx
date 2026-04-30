import { useEffect, useState } from "react";
import { useCustom, useCustomMutation } from "@refinedev/core";
import {
  Card, Form, Input, Button, message,
  Tag, Divider, Typography, Space, Flex,
} from "antd";
import {
  CheckCircleFilled, CloseCircleFilled,
  CloudUploadOutlined, CloudDownloadOutlined, CheckOutlined, CloseOutlined,
} from "@ant-design/icons";
import { API_URL } from "../../config";

const { Text } = Typography;

type AppSetting = { value: string; configured: boolean; sensitive: boolean };
type AppSettings = Record<string, AppSetting>;
type BackupStatus = { ok: boolean; date: string; key?: string; error?: string } | null;
type SaveStatus = { ok: boolean; at: string } | null;

const BACKUP_LS_KEY = "bz_last_backup";

const INTEGRATIONS = [
  {
    section: "Claude AI (Anthropic)",
    description: "Nécessaire pour l'analyse automatique des factures PDF.",
    fields: [
      { key: "ANTHROPIC_API_KEY", label: "Clé API Anthropic", sensitive: true, placeholder: "sk-ant-api03-…" },
    ],
  },
  {
    section: "Stockage de documents (S3 Infomaniak)",
    description: "Stockage des factures et pièces jointes sur votre bucket S3.",
    fields: [
      { key: "S3_ENDPOINT",          label: "Serveur S3",          sensitive: false, placeholder: "https://s3.pub1.infomaniak.cloud" },
      { key: "S3_BUCKET_NAME",       label: "Bucket",              sensitive: false, placeholder: "mon-bucket" },
      { key: "S3_ACCESS_KEY_ID",     label: "Identifiant d'accès", sensitive: true,  placeholder: "PCU-XXXXXXX" },
      { key: "S3_SECRET_ACCESS_KEY", label: "Clé secrète",         sensitive: true,  placeholder: "••••••••••••" },
    ],
  },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ConfiguredBadge({ configured }: { configured: boolean }) {
  return configured
    ? <Tag icon={<CheckCircleFilled />} color="success">Configurée</Tag>
    : <Tag icon={<CloseCircleFilled />} color="default">Non configurée</Tag>;
}

function SaveFeedback({ status }: { status: SaveStatus }) {
  if (!status) return null;
  return (
    <Text
      style={{ fontSize: 12, marginLeft: 12 }}
      type={status.ok ? "success" : "danger"}
    >
      {status.ok
        ? <><CheckOutlined /> Enregistré à {status.at}</>
        : <><CloseOutlined /> Échec à {status.at}</>}
    </Text>
  );
}

function BackupFeedback({ status }: { status: BackupStatus }) {
  if (!status) return null;
  return (
    <Text
      style={{ display: "block", marginTop: 10, fontSize: 12 }}
      type={status.ok ? "success" : "danger"}
    >
      {status.ok
        ? <><CheckCircleFilled /> Dernière sauvegarde : {formatDate(status.date)}</>
        : <><CloseCircleFilled /> Échec le {formatDate(status.date)} — {status.error}</>}
    </Text>
  );
}

export const SettingsPage = () => {
  const [restaurantForm] = Form.useForm();
  const [integrationsForm] = Form.useForm();
  const [appSettings, setAppSettings] = useState<AppSettings>({});
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>(() => {
    try { return JSON.parse(localStorage.getItem(BACKUP_LS_KEY) ?? "null"); }
    catch { return null; }
  });
  const [restaurantSaveStatus, setRestaurantSaveStatus] = useState<SaveStatus>(null);

  // ── Restaurant name ────────────────────────────────────────────────
  const { query: restaurantQuery } = useCustom({ url: `${API_URL}/settings`, method: "get" });
  const { mutate: mutateRestaurant, mutation: restaurantMutation } = useCustomMutation();

  useEffect(() => {
    const name = (restaurantQuery.data?.data as any)?.name;
    if (name !== undefined) restaurantForm.setFieldsValue({ name });
  }, [restaurantQuery.data, restaurantForm]);

  const onSaveRestaurant = (values: { name: string }) => {
    mutateRestaurant(
      { url: `${API_URL}/settings`, method: "patch", values },
      {
        onSuccess: () => setRestaurantSaveStatus({ ok: true,  at: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }),
        onError:   () => setRestaurantSaveStatus({ ok: false, at: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }),
      }
    );
  };

  // ── App settings (intégrations) ────────────────────────────────────
  const { query: appSettingsQuery } = useCustom({ url: `${API_URL}/app-settings`, method: "get" });
  const { mutate: mutateAppSettings, mutation: appSettingsMutation } = useCustomMutation();

  useEffect(() => {
    const data = appSettingsQuery.data?.data as AppSettings | undefined;
    if (!data) return;
    setAppSettings(data);
    const initial: Record<string, string> = {};
    for (const [key, setting] of Object.entries(data)) {
      if (!setting.sensitive && setting.configured) initial[key] = setting.value;
    }
    integrationsForm.setFieldsValue(initial);
  }, [appSettingsQuery.data, integrationsForm]);

  const onSaveIntegrations = () => {
    const raw = integrationsForm.getFieldsValue() as Record<string, string>;
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v && v.trim() && !v.includes("••")) payload[k] = v.trim();
    }
    if (Object.keys(payload).length === 0) return;
    mutateAppSettings(
      { url: `${API_URL}/app-settings`, method: "patch", values: payload },
      {
        onSuccess: () => {
          const sensitiveUpdated = Object.keys(payload).filter((k) => appSettings[k]?.sensitive);
          integrationsForm.resetFields(sensitiveUpdated);
          appSettingsQuery.refetch();
        },
        onError: () => {},
      }
    );
  };

  const onRestore = async () => {
    setRestoreLoading(true);
    try {
      const token = localStorage.getItem("auth_token") ?? "";
      const res = await fetch(`${API_URL}/backup/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      message.success(`Restauration prête (${data.key}). Redémarrez l'application pour appliquer.`, 8);
    } catch (err: any) {
      message.error(err.message ?? "Échec de la restauration");
    } finally {
      setRestoreLoading(false);
    }
  };

  // ── Backup ─────────────────────────────────────────────────────────
  const onBackup = async () => {
    setBackupLoading(true);
    try {
      const token = localStorage.getItem("auth_token") ?? "";
      const res = await fetch(`${API_URL}/backup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      const status: BackupStatus = { ok: true, date: new Date().toISOString(), key: data.key };
      setBackupStatus(status);
      localStorage.setItem(BACKUP_LS_KEY, JSON.stringify(status));
    } catch (err: any) {
      const status: BackupStatus = { ok: false, date: new Date().toISOString(), error: err.message ?? "Échec" };
      setBackupStatus(status);
      localStorage.setItem(BACKUP_LS_KEY, JSON.stringify(status));
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <Flex vertical gap={24} style={{ maxWidth: 560 }}>

      {/* Paramètres du restaurant */}
      <Card title="Paramètres du restaurant" loading={restaurantQuery.isLoading}>
        <Form form={restaurantForm} layout="vertical" onFinish={onSaveRestaurant}
          onValuesChange={() => setRestaurantSaveStatus(null)}>
          <Form.Item
            label="Nom du restaurant"
            name="name"
            rules={[{ required: true, message: "Le nom est obligatoire" }]}
          >
            <Input placeholder="Ex : L'Atelier Bizarre" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space align="center">
              <Button type="primary" htmlType="submit" loading={restaurantMutation.isPending}>
                Enregistrer
              </Button>
              <SaveFeedback status={restaurantSaveStatus} />
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Sauvegarde */}
      <Card title="Sauvegarde de la base de données">
        <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
          Envoie une copie de la base de données sur votre bucket S3. Nécessite que le stockage S3 soit configuré.
        </Text>
        <Space>
          <Button icon={<CloudUploadOutlined />} loading={backupLoading} onClick={onBackup}>
            Sauvegarder maintenant
          </Button>
          <Button icon={<CloudDownloadOutlined />} loading={restoreLoading} onClick={onRestore} danger>
            Restaurer depuis S3
          </Button>
        </Space>
        <BackupFeedback status={backupStatus} />
      </Card>

      {/* Intégrations */}
      <Card title="Intégrations" loading={appSettingsQuery.isLoading}>
        <Form form={integrationsForm} layout="vertical">
          {INTEGRATIONS.map(({ section, description, fields }, si) => (
            <div key={section}>
              {si > 0 && <Divider />}
              <Text strong style={{ display: "block", marginBottom: 4 }}>{section}</Text>
              <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
                {description}
              </Text>
              {fields.map(({ key, label, sensitive, placeholder }) => (
                <Form.Item
                  key={key}
                  name={key}
                  label={
                    <Space size={8}>
                      <span>{label}</span>
                      {appSettings[key] && <ConfiguredBadge configured={appSettings[key].configured} />}
                    </Space>
                  }
                >
                  {sensitive ? (
                    <Input.Password
                      placeholder={appSettings[key]?.configured
                        ? "Laisser vide pour conserver la valeur actuelle"
                        : placeholder}
                      autoComplete="new-password"
                    />
                  ) : (
                    <Input placeholder={placeholder} />
                  )}
                </Form.Item>
              ))}
            </div>
          ))}
          <Divider style={{ marginTop: 8 }} />
          <Button type="primary" onClick={onSaveIntegrations} loading={appSettingsMutation.isPending}>
            Enregistrer les intégrations
          </Button>
        </Form>
      </Card>

    </Flex>
  );
};
