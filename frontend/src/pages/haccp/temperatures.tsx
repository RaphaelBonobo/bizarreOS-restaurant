import { useState, useEffect, useCallback } from "react";
import { AutoComplete, Button, Card, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Typography, Alert } from "antd";
import { PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, DownloadOutlined } from "@ant-design/icons";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import dayjs from "dayjs";
import { axiosInstance } from "../../lib/axios";
import { API_URL } from "../../config";

const { Title } = Typography;
const { RangePicker } = DatePicker;

function exportCSV(data: any[]) {
  const cols = [
    { key: "date", label: "Date" },
    { key: "equipement", label: "Équipement" },
    { key: "temperature", label: "Température (°C)" },
    { key: "temperatureMin", label: "Min acceptable (°C)" },
    { key: "temperatureMax", label: "Max acceptable (°C)" },
    { key: "conformite", label: "Conforme" },
    { key: "notes", label: "Notes" },
  ];
  const header = cols.map((c) => c.label).join(";");
  const rows = data.map((r) =>
    cols.map((c) => {
      const v = r[c.key];
      if (c.key === "date") return dayjs(v).format("DD/MM/YYYY HH:mm");
      if (c.key === "conformite") return v ? "Oui" : "Non";
      return v ?? "";
    }).join(";")
  );
  const csv = "﻿" + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `temperatures_${dayjs().format("YYYY-MM-DD")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const TemperaturePage = () => {
  const [data, setData] = useState<any[]>([]);
  const [equipements, setEquipements] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEquipement, setSelectedEquipement] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    const params: any = {};
    if (dateRange) {
      params.from = dateRange[0].startOf("day").toISOString();
      params.to = dateRange[1].endOf("day").toISOString();
    }
    if (selectedEquipement) params.equipement = selectedEquipement;

    const [tempRes, eqRes] = await Promise.all([
      axiosInstance.get(`${API_URL}/temperatures`, { params }),
      axiosInstance.get(`${API_URL}/temperatures/equipements`),
    ]);
    setData(tempRes.data);
    setEquipements(eqRes.data);
    setLoading(false);
  }, [dateRange, selectedEquipement]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (values: any) => {
    await axiosInstance.post(`${API_URL}/temperatures`, {
      ...values,
      date: values.date?.toISOString(),
    });
    setModalOpen(false);
    form.resetFields();
    load();
  };

  const handleDelete = async (id: string) => {
    await axiosInstance.delete(`${API_URL}/temperatures/${id}`);
    load();
  };

  const nonConformes = data.filter((d) => !d.conformite).length;

  const equipementGraph = selectedEquipement ?? equipements[0];
  const chartData = data
    .filter((d) => d.equipement === equipementGraph)
    .map((d) => ({
      date: dayjs(d.date).format("DD/MM HH:mm"),
      temperature: Number(d.temperature),
      min: d.temperatureMin != null ? Number(d.temperatureMin) : undefined,
      max: d.temperatureMax != null ? Number(d.temperatureMax) : undefined,
    }))
    .reverse();

  const columns = [
    { title: "Date", dataIndex: "date", render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm") },
    { title: "Équipement", dataIndex: "equipement" },
    {
      title: "Température",
      dataIndex: "temperature",
      align: "right" as const,
      render: (v: number, r: any) => (
        <span style={{ color: r.conformite ? "#8b9862" : "#c46a5c", fontWeight: 600 }}>
          {Number(v).toFixed(1)} °C
        </span>
      ),
    },
    {
      title: "Plage acceptable",
      key: "plage",
      render: (_: any, r: any) =>
        r.temperatureMin != null && r.temperatureMax != null
          ? `${Number(r.temperatureMin).toFixed(1)} → ${Number(r.temperatureMax).toFixed(1)} °C`
          : "—",
    },
    {
      title: "Conformité",
      dataIndex: "conformite",
      align: "center" as const,
      render: (v: boolean) => v
        ? <CheckCircleOutlined style={{ color: "#8b9862", fontSize: 18 }} />
        : <CloseCircleOutlined style={{ color: "#c46a5c", fontSize: 18 }} />,
    },
    { title: "Notes", dataIndex: "notes", render: (v: string) => v || "—" },
    {
      title: "",
      key: "actions",
      align: "center" as const,
      render: (_: any, r: any) => (
        <Popconfirm title="Supprimer ce relevé ?" okText="Oui" cancelText="Non" onConfirm={() => handleDelete(r.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Suivi températures</Title>
        <Space>
          <Select
            placeholder="Équipement"
            options={[{ value: "", label: "Tous" }, ...equipements.map((e) => ({ value: e, label: e }))]}
            value={selectedEquipement}
            onChange={(v) => setSelectedEquipement(v || null)}
            style={{ width: 180 }}
            allowClear
          />
          <RangePicker value={dateRange as any} onChange={(v) => setDateRange(v ? [v[0]!, v[1]!] : null)} format="DD/MM/YYYY" />
          <Button icon={<DownloadOutlined />} onClick={() => exportCSV(data)}>CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Relevé</Button>
        </Space>
      </div>

      {nonConformes > 0 && (
        <Alert
          type="error"
          message={`${nonConformes} relevé${nonConformes > 1 ? "s" : ""} hors plage — vérifier les équipements concernés`}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {chartData.length > 1 && (
        <Card title={`Évolution — ${equipementGraph ?? ""}`} style={{ marginBottom: 16 }}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}°`} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)} °C`} />
              {chartData[0]?.max != null && <ReferenceLine y={chartData[0].max} stroke="#c46a5c" strokeDasharray="4 4" label={{ value: "max", position: "right", fontSize: 11 }} />}
              {chartData[0]?.min != null && <ReferenceLine y={chartData[0].min} stroke="#c46a5c" strokeDasharray="4 4" label={{ value: "min", position: "right", fontSize: 11 }} />}
              <Line type="monotone" dataKey="temperature" stroke="#c9a961" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} />
      </Card>

      <Modal
        title="Nouveau relevé de température"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Enregistrer"
        cancelText="Annuler"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Date et heure" name="date" rules={[{ required: true }]} initialValue={dayjs()}>
            <DatePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" />
          </Form.Item>
          <Form.Item label="Équipement" name="equipement" rules={[{ required: true, message: "Saisir un équipement" }]}>
            <AutoComplete
              options={equipements.map((e) => ({ value: e }))}
              placeholder="Saisir ou choisir un équipement"
              filterOption={(input, option) =>
                option!.value.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item label="Température relevée (°C)" name="temperature" rules={[{ required: true }]}>
            <InputNumber step={0.1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Température min acceptable (°C)" name="temperatureMin">
            <InputNumber step={0.5} style={{ width: "100%" }} placeholder="Ex : 0 pour un frigo" />
          </Form.Item>
          <Form.Item label="Température max acceptable (°C)" name="temperatureMax">
            <InputNumber step={0.5} style={{ width: "100%" }} placeholder="Ex : 4 pour un frigo" />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
