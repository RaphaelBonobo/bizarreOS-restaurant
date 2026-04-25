import { Edit, useForm } from "@refinedev/antd";
import { Col, Form, Input, Row, Select, Switch } from "antd";

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

export const FournisseurEdit = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "fournisseurs", redirect: "show" });
  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Row gutter={16}>
          <Col xs={24} md={12}><Form.Item label="Nom" name="nom"><Input /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item label="Type" name="type"><Select options={TYPE_OPTIONS} allowClear /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={8}><Form.Item label="Contact" name="nomContact"><Input /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item label="Téléphone" name="telephone"><Input /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item label="Email" name="email"><Input /></Form.Item></Col>
        </Row>
        <Form.Item label="Adresse" name="adresse"><Input /></Form.Item>
        <Row gutter={16}>
          <Col xs={8} md={4}><Form.Item label="Bio" name="bio" valuePropName="checked"><Switch /></Form.Item></Col>
          <Col xs={24} md={10}><Form.Item label="Certificateur" name="certificateur"><Input /></Form.Item></Col>
          <Col xs={24} md={10}><Form.Item label="N° certificat" name="numeroCertificat"><Input /></Form.Item></Col>
        </Row>
        <Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item>
      </Form>
    </Edit>
  );
};
