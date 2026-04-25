import { useEffect, useState } from "react";
import { Card, Col, Row, Table, Tag, Typography, Spin, Alert } from "antd";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { axiosInstance } from "../../lib/axios";
import { API_URL } from "../../config";
import dayjs from "dayjs";

const { Title, Text } = Typography;

export const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axiosInstance.get(`${API_URL}/menus/stats?periode=mois`)
      .then((r) => setStats(r.data))
      .catch(() => setError("Impossible de charger les statistiques"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "80px auto" }} />;
  if (error) return <Alert type="error" message={error} style={{ margin: 24 }} />;

  const { menus = [], totaux = {} } = stats ?? {};

  const chartData = menus.map((m: any) => ({
    date: dayjs(m.date).format("DD/MM"),
    nom: m.nom || dayjs(m.date).format("DD/MM"),
    coutTotal: m.coutTotal,
    chiffreAffaires: m.chiffreAffaires ?? 0,
  }));

  const kpis = [
    { label: "Menus ce mois", value: totaux.nbMenus ?? 0, unit: "" },
    { label: "Couverts", value: totaux.nbCouverts ?? 0, unit: "" },
    { label: "Coût total matières", value: `${(totaux.coutTotal ?? 0).toFixed(2)} €`, unit: "" },
    { label: "Chiffre d'affaires", value: `${(totaux.chiffreAffaires ?? 0).toFixed(2)} €`, unit: "" },
    { label: "Bilan du mois", value: `${(totaux.bilan ?? 0).toFixed(2)} €`, unit: "", highlight: true, positif: (totaux.bilan ?? 0) >= 0 },
  ];

  const columns = [
    { title: "Date", dataIndex: "date", key: "date", render: (v: string) => dayjs(v).format("ddd DD/MM") },
    { title: "Nom", dataIndex: "nom", key: "nom", render: (v: string) => v || "—" },
    { title: "Couverts", dataIndex: "nbCouverts", key: "nbCouverts" },
    {
      title: "Coût/assiette",
      dataIndex: "coutParAssiette",
      key: "coutParAssiette",
      render: (v: number) => `${v?.toFixed(2)} €`,
    },
    {
      title: "CA",
      dataIndex: "chiffreAffaires",
      key: "chiffreAffaires",
      render: (v: number) => v != null ? `${v.toFixed(2)} €` : "—",
    },
    {
      title: "Bilan",
      dataIndex: "bilan",
      key: "bilan",
      render: (v: number) => {
        if (v == null) return "—";
        return <Tag color={v >= 0 ? "success" : "error"}>{v >= 0 ? "+" : ""}{v.toFixed(2)} €</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>Tableau de bord — {dayjs().format("MMMM YYYY")}</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {kpis.map((kpi) => (
          <Col xs={24} sm={12} lg={kpi.highlight ? 6 : 5} key={kpi.label}>
            <Card size="small">
              <div className="stat-card">
                <div
                  className={`stat-value ${kpi.highlight ? (kpi.positif ? "bilan-positif" : "bilan-negatif") : ""}`}
                >
                  {kpi.value}
                </div>
                <div className="stat-label">{kpi.label}</div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {chartData.length > 0 && (
        <Card title="CA vs Coût matières (menus du mois)" style={{ marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <XAxis dataKey="nom" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v} €`} />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)} €`} />
              <Legend />
              <Bar dataKey="chiffreAffaires" name="CA" fill="#8b9862" radius={[4, 4, 0, 0]} />
              <Bar dataKey="coutTotal" name="Coût matières" fill="#c46a5c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card title="Menus du mois">
        <Table
          dataSource={menus}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: "Aucun menu ce mois-ci" }}
        />
      </Card>
    </div>
  );
};
