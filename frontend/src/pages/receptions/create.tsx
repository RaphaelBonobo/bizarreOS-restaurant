import { Create, useForm } from "@refinedev/antd";
import { Col, DatePicker, Form, Input, Row, Select, Button, Divider, Typography } from "antd";
import { FileSearchOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { axiosInstance } from "../../lib/axios";
import { API_URL } from "../../config";
import { InvoiceParser } from "../../components/InvoiceParser";

const { Text } = Typography;

export const ReceptionCreate = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "receptions", redirect: "show" });
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [parserOpen, setParserOpen] = useState(false);

  useEffect(() => {
    axiosInstance.get(`${API_URL}/fournisseurs`).then((r) =>
      setFournisseurs(r.data.map((f: any) => ({ value: f.id, label: f.nom })))
    );
  }, []);

  const handleFinish = (values: any) => {
    formProps.onFinish?.({ ...values, dateAchat: values.dateAchat?.toISOString() });
  };

  return (
    <>
      <Create
        saveButtonProps={saveButtonProps}
        headerButtons={
          <Button
            icon={<FileSearchOutlined />}
            onClick={() => setParserOpen(true)}
            style={{ borderColor: "#d4832a", color: "#d4832a" }}
          >
            Importer depuis une facture PDF
          </Button>
        }
      >
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          Remplissez manuellement ou utilisez le bouton ci-dessus pour extraire automatiquement les données d'une facture.
        </Text>
        <Form {...formProps} layout="vertical" onFinish={handleFinish}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="N° de pièce / facture" name="numeroPiece">
                <Input placeholder="Ex: FAC-2024-001" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Date d'achat" name="dateAchat">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Fournisseurs" name="fournisseurIds">
                <Select mode="multiple" options={fournisseurs} placeholder="Choisir..." />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Create>

      <InvoiceParser
        open={parserOpen}
        onClose={() => setParserOpen(false)}
        fournisseurs={fournisseurs}
      />
    </>
  );
};
