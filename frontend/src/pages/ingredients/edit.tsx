import { Edit, useForm } from "@refinedev/antd";
import { Col, Form, Input, InputNumber, Row, Select, Switch } from "antd";
import { useEffect, useState } from "react";
import { axiosInstance } from "../../lib/axios";
import { API_URL } from "../../config";

const UNITE_OPTIONS = ["KG", "G", "L", "CL", "ML", "PIECE", "BOTTES", "SACHET", "BOUQUET"].map((v) => ({ value: v, label: v }));
const ALLERGENE_OPTIONS = [
  { value: "GLUTEN", label: "Gluten" }, { value: "CRUSTACES", label: "Crustacés" },
  { value: "OEUFS", label: "Œufs" }, { value: "POISSONS", label: "Poissons" },
  { value: "ARACHIDES", label: "Arachides" }, { value: "SOJA", label: "Soja" },
  { value: "LAIT", label: "Lait" }, { value: "FRUIT_A_COQUE", label: "Fruits à coque" },
  { value: "CELERI", label: "Céleri" }, { value: "MOUTARDE", label: "Moutarde" },
  { value: "SESAME", label: "Sésame" }, { value: "SULFITES", label: "Sulfites" },
  { value: "LUPIN", label: "Lupin" }, { value: "MOLLUSQUES", label: "Mollusques" },
];

export const IngredientEdit = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "ingredients", redirect: "show" });
  const [receptions, setReceptions] = useState<any[]>([]);

  useEffect(() => {
    axiosInstance.get(`${API_URL}/receptions`).then((r) =>
      setReceptions(r.data.map((rf: any) => ({
        value: rf.id,
        label: `${rf.numeroPiece ?? rf.id.slice(0, 8)} — ${rf.fournisseurs?.map((f: any) => f.nom).join(", ") || ""}`,
      })))
    );
  }, []);

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Nom" name="nom" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Origine" name="origine">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Lot / Réception" name="lotId">
              <Select options={receptions} showSearch allowClear />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label="Quantité reçue" name="stockReception">
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label="Unité" name="unite">
              <Select options={UNITE_OPTIONS} allowClear />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item label="Prix total achat (€)" name="prixTotal">
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={6} md={2}>
            <Form.Item label="Bio" name="bio" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={6} md={2}>
            <Form.Item label="Épuisé" name="epuise" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Allergènes" name="allergenes">
          <Select mode="multiple" options={ALLERGENE_OPTIONS} />
        </Form.Item>
        <Form.Item label="Notes" name="notes">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Edit>
  );
};
