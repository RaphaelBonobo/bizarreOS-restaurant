import { Edit, useForm } from "@refinedev/antd";
import { Col, DatePicker, Form, Input, InputNumber, Row, Select, Button, Table, Space, Typography } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { axiosInstance } from "../../lib/axios";
import { API_URL } from "../../config";

const { Text } = Typography;

const TYPE_OPTIONS = [
  { value: "DEJEUNER", label: "Déjeuner" }, { value: "DINER", label: "Dîner" },
  { value: "BRUNCH", label: "Brunch" }, { value: "BUFFET", label: "Buffet" }, { value: "AUTRE", label: "Autre" },
];
const UNITE_OPTIONS = ["KG", "G", "L", "CL", "ML", "PIECE", "BOTTES", "SACHET", "BOUQUET"].map((v) => ({ value: v, label: v.toLowerCase() }));
const COURS_OPTIONS = [
  { value: "ENTREE", label: "Entrée" },
  { value: "PLAT", label: "Plat" },
  { value: "DESSERT", label: "Dessert" },
  { value: "AUTRE", label: "Autre" },
];

export const MenuEdit = () => {
  const { formProps, saveButtonProps, query } = useForm({ resource: "menus", redirect: "show" });
  const record = query?.data?.data as any;
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [allIngredients, setAllIngredients] = useState<any[]>([]);
  const [selectedIngId, setSelectedIngId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    axiosInstance.get(`${API_URL}/ingredients`).then((r) => setAllIngredients(r.data));
  }, []);

  useEffect(() => {
    if (record && !initialized) {
      setIngredients(
        (record.ingredients ?? []).map((mi: any) => ({
          ingredientId: mi.ingredientId ?? mi.ingredient?.id,
          quantite: Number(mi.quantite),
          unite: mi.unite ?? mi.ingredient?.unite ?? null,
          prixUnitaire: mi.prixUnitaire != null ? Number(mi.prixUnitaire) : null,
          coursType: mi.coursType ?? null,
          _ing: mi.ingredient,
        }))
      );
      setInitialized(true);
    }
  }, [record, initialized]);

  const computedCout = ingredients.reduce((total, row) => {
    const ing = allIngredients.find((i) => i.id === row.ingredientId);
    const prix = row.prixUnitaire != null ? Number(row.prixUnitaire) : ing?.prixUnitaire ?? 0;
    return total + prix * (Number(row.quantite) || 0);
  }, 0);

  const addIngredient = () => {
    if (!selectedIngId || ingredients.find((i) => i.ingredientId === selectedIngId)) return;
    const ing = allIngredients.find((i) => i.id === selectedIngId);
    setIngredients((prev) => [
      ...prev,
      { ingredientId: selectedIngId, quantite: 0, unite: ing?.unite ?? null, prixUnitaire: ing?.prixUnitaire ?? null, coursType: null, _ing: ing },
    ]);
    setSelectedIngId(null);
  };

  const updateRow = (idx: number, field: string, value: any) =>
    setIngredients((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const removeRow = (idx: number) => setIngredients((prev) => prev.filter((_, i) => i !== idx));

  const handleFinish = (values: any) => {
    formProps.onFinish?.({
      ...values,
      date: values.date?.toISOString?.() ?? values.date,
      ingredients: ingredients.map(({ _ing, ...rest }) => rest),
    });
  };

  const ingOptions = allIngredients
    .filter((i) => !ingredients.find((r) => r.ingredientId === i.id))
    .map((i) => ({ value: i.id, label: i.nom }));

  const ingColumns = [
    {
      title: "Cours", key: "cours", width: 110,
      render: (_: any, r: any, idx: number) => (
        <Select size="small" options={COURS_OPTIONS} value={r.coursType}
          onChange={(v) => updateRow(idx, "coursType", v)} style={{ width: "100%" }}
          allowClear placeholder="—" />
      ),
    },
    {
      title: "Ingrédient", key: "nom",
      render: (_: any, r: any) => <Text>{r._ing?.nom ?? r.ingredientId}</Text>,
    },
    {
      title: "Qté", key: "quantite", width: 110,
      render: (_: any, r: any, idx: number) => (
        <InputNumber size="small" min={0} step={0.1} value={r.quantite}
          onChange={(v) => updateRow(idx, "quantite", v)} style={{ width: "100%" }} />
      ),
    },
    {
      title: "Unité", key: "unite", width: 90,
      render: (_: any, r: any, idx: number) => (
        <Select size="small" options={UNITE_OPTIONS} value={r.unite}
          onChange={(v) => updateRow(idx, "unite", v)} style={{ width: "100%" }} allowClear />
      ),
    },
    {
      title: "Prix unit.", key: "prixUnitaire", width: 110,
      render: (_: any, r: any, idx: number) => (
        <InputNumber size="small" min={0} step={0.0001} value={r.prixUnitaire}
          onChange={(v) => updateRow(idx, "prixUnitaire", v)} style={{ width: "100%" }} />
      ),
    },
    {
      title: "Coût", key: "cout", align: "right" as const,
      render: (_: any, r: any) => {
        const ing = allIngredients.find((i) => i.id === r.ingredientId);
        const prix = r.prixUnitaire != null ? Number(r.prixUnitaire) : ing?.prixUnitaire ?? 0;
        return `${(prix * (Number(r.quantite) || 0)).toFixed(2)} €`;
      },
    },
    {
      title: "", key: "del", width: 40,
      render: (_: any, _r: any, idx: number) => (
        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeRow(idx)} />
      ),
    },
  ];

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={record ? { ...record, date: dayjs(record.date) } : undefined}
      >
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Date" name="date" rules={[{ required: true }]}>
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Type de repas" name="typeRepas">
              <Select options={TYPE_OPTIONS} allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Nom du menu" name="nom">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={12} md={8}>
            <Form.Item label="Couverts prévus" name="nbCouvertsPrevus" rules={[{ required: true, message: "Requis" }]}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item label="Couverts réels" name="nbCouvertsReels">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item label="Couverts bénévoles" name="nbCouvertsBenevoles">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={12} md={6}>
            <Form.Item label="Bénévoles" name="nbBenevoles">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item label="Heures bénévoles" name="heuresBenevoles">
              <InputNumber min={0} step={0.5} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={12}>
            <Form.Item label="Chiffre d'affaires (€)" name="chiffreAffaires">
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Description" name="description">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="Notes" name="notes">
          <Input.TextArea rows={2} />
        </Form.Item>

        <div style={{ marginBottom: 8 }}>
          <Text strong>Ingrédients</Text>
          {ingredients.length > 0 && (
            <Text type="secondary" style={{ marginLeft: 16 }}>
              Coût total estimé : <Text strong>{computedCout.toFixed(2)} €</Text>
            </Text>
          )}
        </div>

        <Space style={{ marginBottom: 12 }}>
          <Select showSearch style={{ width: 280 }} placeholder="Ajouter un ingrédient..."
            options={ingOptions} value={selectedIngId} onChange={setSelectedIngId}
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
          />
          <Button icon={<PlusOutlined />} onClick={addIngredient} disabled={!selectedIngId}>
            Ajouter
          </Button>
        </Space>

        {ingredients.length > 0 && (
          <Table dataSource={ingredients} columns={ingColumns} rowKey="ingredientId"
            size="small" pagination={false} />
        )}
      </Form>
    </Edit>
  );
};
