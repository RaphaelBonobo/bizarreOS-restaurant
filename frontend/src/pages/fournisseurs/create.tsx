import { Create, useForm } from "@refinedev/antd";
import { Col, Form, Input, InputNumber, Row, Select, Switch } from "antd";

const TYPE_OPTIONS = [
  { value: "GROSSISTE_GENERALISTE", label: "Grossiste généraliste" },
  { value: "LEGUMES_FRUITS", label: "Légumes & fruits" },
  { value: "BOUCHERIE_CHARCUTERIE", label: "Boucherie / Charcuterie" },
  { value: "POISSONNERIE", label: "Poissonnerie" },
  { value: "CREMERIE", label: "Crémerie" },
  { value: "EPICERIE_SECHE", label: "Épicerie sèche" },
  { value: "BOULANGERIE", label: "Boulangerie" },
  { value: "AUTRE", label: "Autre" },
];

export const FournisseurCreate = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "fournisseurs", redirect: "show" });
  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Row gutter={16}>
          <Col xs={24} md={12}><Form.Item label="Nom" name="nom" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item label="Type" name="type"><Select options={TYPE_OPTIONS} allowClear /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={8}><Form.Item label="Contact" name="nomContact"><Input /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item label="Téléphone" name="telephone"><Input /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item label="Email" name="email"><Input type="email" /></Form.Item></Col>
        </Row>
        <Form.Item label="Adresse" name="adresse"><Input /></Form.Item>
        <Row gutter={16}>
          <Col xs={8} md={4}><Form.Item label="Bio" name="bio" valuePropName="checked" initialValue={false}><Switch /></Form.Item></Col>
          <Col xs={24} md={10}><Form.Item label="Certificateur" name="certificateur"><Input /></Form.Item></Col>
          <Col xs={24} md={10}><Form.Item label="N° certificat" name="numeroCertificat"><Input /></Form.Item></Col>
        </Row>
        <Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item>
      </Form>
    </Create>
  );
};
