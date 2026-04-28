import { useEffect, useState } from "react";
import { useCustom, useCustomMutation } from "@refinedev/core";
import {
  Card, Form, Input, Button, message,
  Tag, Divider, Typography, Space, Flex,
} from "antd";
import { CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import { API_URL } from "../../config";

const { Text } = Typography;

type AppSetting = { value: string; configured: boolean; sensitive: boolean };
type AppSettings = Record<string, AppSetting>;

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

function ConfiguredBadge({ configured }: { configured: boolean }) {
  return configured
    ? <Tag icon={<CheckCircleFilled />} color="success">Configurée</Tag>
    : <Tag icon={<CloseCircleFilled />} color="default">Non configurée</Tag>;
}

export const SettingsPage = () => {
  const [restaurantForm] = Form.useForm();
  const [integrationsForm] = Form.useForm();
  const [appSettings, setAppSettings] = useState<AppSettings>({});

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
        onSuccess: () => message.success("Nom du restaurant mis à jour"),
        onError:   () => message.error("Erreur lors de la mise à jour"),
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
    // Pré-remplir uniquement les champs non-sensibles
    const initial: Record<string, string> = {};
    for (const [key, setting] of Object.entries(data)) {
      if (!setting.sensitive && setting.configured) initial[key] = setting.value;
    }
    integrationsForm.setFieldsValue(initial);
  }, [appSettingsQuery.data, integrationsForm]);

  const onSaveIntegrations = () => {
    const raw = integrationsForm.getFieldsValue() as Record<string, string>;
    // Ignorer les champs vides et les valeurs masquées non modifiées
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v && v.trim() && !v.includes("••")) payload[k] = v.trim();
    }
    if (Object.keys(payload).length === 0) {
      message.info("Aucune modification à enregistrer");
      return;
    }
    mutateAppSettings(
      { url: `${API_URL}/app-settings`, method: "patch", values: payload },
      {
        onSuccess: () => {
          message.success("Intégrations mises à jour");
          // Vider les champs sensibles enregistrés (ils restent masqués)
          const sensitiveUpdated = Object.keys(payload).filter((k) => appSettings[k]?.sensitive);
          integrationsForm.resetFields(sensitiveUpdated);
          appSettingsQuery.refetch();
        },
        onError: () => message.error("Erreur lors de la mise à jour"),
      }
    );
  };

  return (
    <Flex vertical gap={24} style={{ maxWidth: 560 }}>

      {/* Paramètres du restaurant */}
      <Card title="Paramètres du restaurant" loading={restaurantQuery.isLoading}>
        <Form form={restaurantForm} layout="vertical" onFinish={onSaveRestaurant}>
          <Form.Item
            label="Nom du restaurant"
            name="name"
            rules={[{ required: true, message: "Le nom est obligatoire" }]}
          >
            <Input placeholder="Ex : L'Atelier Bizarre" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={restaurantMutation.isPending}>
              Enregistrer
            </Button>
          </Form.Item>
        </Form>
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
