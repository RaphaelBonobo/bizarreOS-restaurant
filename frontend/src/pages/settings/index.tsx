import { useEffect } from "react";
import { useCustom, useCustomMutation } from "@refinedev/core";
import { Card, Form, Input, Button, message } from "antd";
import { API_URL } from "../../config";

export const SettingsPage = () => {
  const [form] = Form.useForm();

  const { query } = useCustom({ url: `${API_URL}/settings`, method: "get" });
  const isLoading = query.isLoading;
  const name = (query.data?.data as any)?.name;

  const { mutate, mutation } = useCustomMutation();

  useEffect(() => {
    if (name !== undefined) form.setFieldsValue({ name });
  }, [name, form]);

  const onFinish = (values: { name: string }) => {
    mutate(
      { url: `${API_URL}/settings`, method: "patch", values },
      {
        onSuccess: () => message.success("Nom du restaurant mis à jour"),
        onError: () => message.error("Erreur lors de la mise à jour"),
      }
    );
  };

  return (
    <Card title="Paramètres du restaurant" loading={isLoading} style={{ maxWidth: 480 }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          label="Nom du restaurant"
          name="name"
          rules={[{ required: true, message: "Le nom est obligatoire" }]}
        >
          <Input placeholder="Ex : L'Atelier Bizarre" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Enregistrer
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
