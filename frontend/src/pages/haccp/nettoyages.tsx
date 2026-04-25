import { useState, useEffect, useCallback } from "react";
import { Button, Card, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from "antd";
import { PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, DownloadOutlined, SettingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { axiosInstance } from "../../lib/axios";
import { API_URL } from "../../config";

const { Title } = Typography;
const { RangePicker } = DatePicker;

const DEFAULT_TYPES = [
  { value: "NETTOYAGE_COMPLET", label: "Nettoyage complet" },
  { value: "NETTOYAGE_SURFACE", label: "Nettoyage de surface" },
  { value: "DESINFECTION", label: "Désinfection" },
  { value: "NETTOYAGE_FRIGO", label: "Nettoyage frigo" },
  { value: "NETTOYAGE_FOUR", label: "Nettoyage four" },
  { value: "NETTOYAGE_PLAN_DE_TRAVAIL", label: "Plan de travail" },
];

function loadTypes() {
  try {
    const s = localStorage.getItem("nettoyage_types");
    return s ? JSON.parse(s) : DEFAULT_TYPES;
  } catch { return DEFAULT_TYPES; }
}

function saveTypes(types: { value: string; label: string }[]) {
  localStorage.setItem("nettoyage_types", JSON.stringify(types));
}

function exportCSV(data: any[], types: { value: string; label: string }[]) {
  const cols = [
    { key: "date", label: "Date" },
    { key: "typeNettoyage", label: "Type" },
    { key: "zone", label: "Zone / Équipement" },
    { key: "conforme", label: "Conforme" },
    { key: "prevu", label: "Prévisionnel" },
    { key: "notes", label: "Notes" },
  ];
  const header = cols.map((c) => c.label).join(";");
  const rows = data.map((r) =>
    cols.map((c) => {
      const v = r[c.key];
      if (c.key === "date") return dayjs(v).format("DD/MM/YYYY");
      if (c.key === "typeNettoyage") return types.find((t) => t.value === v)?.label ?? v ?? "";
      if (c.key === "conforme" || c.key === "prevu") return v ? "Oui" : "Non";
      return v ?? "";
    }).join(";")
  );
  const csv = "﻿" + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nettoyages_${dayjs().format("YYYY-MM-DD")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const NettoyagePage = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [typesModalOpen, setTypesModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [types, setTypes] = useState<{ value: string; label: string }[]>(loadTypes);
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    const params: any = {};
    if (dateRange) {
      params.from = dateRange[0].startOf("day").toISOString();
      params.to = dateRange[1].endOf("day").toISOString();
    }
    const r = await axiosInstance.get(`${API_URL}/nettoyages`, { params });
    setData(r.data);
    setLoading(false);
  }, [dateRange]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (values: any) => {
    await axiosInstance.post(`${API_URL}/nettoyages`, {
      ...values,
      date: values.date?.toISOString(),
    });
    setModalOpen(false);
    form.resetFields();
    load();
  };

  const toggleConforme = async (record: any) => {
    await axiosInstance.patch(`${API_URL}/nettoyages/${record.id}`, { conforme: !record.conforme });
    load();
  };

  const handleDelete = async (id: string) => {
    await axiosInstance.delete(`${API_URL}/nettoyages/${id}`);
    load();
  };

  const addType = () => {
    const label = newTypeLabel.trim();
    if (!label) return;
    const value = label.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
    if (types.some((t) => t.value === value)) return;
    const updated = [...types, { value, label }];
    setTypes(updated);
    saveTypes(updated);
    setNewTypeLabel("");
  };

  const removeType = (value: string) => {
    const updated = types.filter((t) => t.value !== value);
    setTypes(updated);
    saveTypes(updated);
  };

  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      render: (v: string) => dayjs(v).format("ddd DD/MM/YYYY"),
      sorter: (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: "Type",
      dataIndex: "typeNettoyage",
      render: (v: string) => {
        const opt = types.find((o) => o.value === v);
        return opt ? <Tag>{opt.label}</Tag> : v || "—";
      },
    },
    { title: "Zone / Équipement", dataIndex: "zone", render: (v: string) => v || "—" },
    {
      title: "Statut",
      dataIndex: "conforme",
      align: "center" as const,
      render: (v: boolean, record: any) => (
        <Button
          type="text"
          icon={v
            ? <CheckCircleOutlined style={{ color: "#8b9862", fontSize: 18 }} />
            : <CloseCircleOutlined style={{ color: "#c46a5c", fontSize: 18 }} />
          }
          onClick={() => toggleConforme(record)}
          title="Cliquer pour basculer"
        />
      ),
    },
    {
      title: "Type de planif.",
      dataIndex: "prevu",
      render: (v: boolean) => v ? <Tag color="blue">Prévisionnel</Tag> : <Tag color="green">Réalisé</Tag>,
    },
    { title: "Notes", dataIndex: "notes", render: (v: string) => v || "—" },
    {
      title: "",
      key: "actions",
      align: "center" as const,
      render: (_: any, r: any) => (
        <Popconfirm title="Supprimer ce nettoyage ?" okText="Oui" cancelText="Non" onConfirm={() => handleDelete(r.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Suivi nettoyages</Title>
        <Space>
          <RangePicker
            value={dateRange as any}
            onChange={(v) => setDateRange(v ? [v[0]!, v[1]!] : null)}
            format="DD/MM/YYYY"
          />
          <Button icon={<SettingOutlined />} onClick={() => setTypesModalOpen(true)}>Types</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportCSV(data, types)}>CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Enregistrer
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* Modal saisie nettoyage */}
      <Modal
        title="Enregistrer un nettoyage"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Enregistrer"
        cancelText="Annuler"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Date" name="date" rules={[{ required: true }]} initialValue={dayjs()}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" showTime={false} />
          </Form.Item>
          <Form.Item label="Type de nettoyage" name="typeNettoyage">
            <Select options={types} allowClear />
          </Form.Item>
          <Form.Item label="Zone / équipement" name="zone">
            <Input placeholder="Ex : Chambre froide, Plan de travail…" />
          </Form.Item>
          <Form.Item label="Conforme" name="conforme" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Oui" unCheckedChildren="Non" />
          </Form.Item>
          <Form.Item label="Prévisionnel (non encore réalisé)" name="prevu" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal gestion des types */}
      <Modal
        title="Gérer les types de nettoyage"
        open={typesModalOpen}
        onCancel={() => setTypesModalOpen(false)}
        footer={<Button onClick={() => setTypesModalOpen(false)}>Fermer</Button>}
      >
        <div style={{ marginBottom: 16 }}>
          {types.map((t) => (
            <div key={t.value} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
              <span>{t.label}</span>
              <Popconfirm title="Supprimer ce type ?" okText="Oui" cancelText="Non" onConfirm={() => removeType(t.value)}>
                <Button type="text" danger icon={<DeleteOutlined />} size="small" />
              </Popconfirm>
            </div>
          ))}
        </div>
        <Space.Compact style={{ width: "100%" }}>
          <Input
            placeholder="Nouveau type (ex : Nettoyage hottes)"
            value={newTypeLabel}
            onChange={(e) => setNewTypeLabel(e.target.value)}
            onPressEnter={addType}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={addType}>Ajouter</Button>
        </Space.Compact>
      </Modal>
    </div>
  );
};
