import { List, useTable } from "@refinedev/antd";
import { useNavigation, useDelete } from "@refinedev/core";
import { Table, Button, Tag, Space, Popconfirm } from "antd";
import { EyeOutlined, EditOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";

const TYPE_LABELS: Record<string, string> = {
  GROSSISTE_GENERALISTE: "Grossiste", LEGUMES_FRUITS: "Légumes/Fruits",
  BOUCHERIE_CHARCUTERIE: "Boucherie", POISSONNERIE: "Poissonnerie",
  CREMERIE: "Crémerie", EPICERIE_SECHE: "Épicerie sèche",
  BOULANGERIE: "Boulangerie", AUTRE: "Autre",
};

export const FournisseurList = () => {
  const { show, create, edit } = useNavigation();
  const { mutate: deleteOne } = useDelete();
  const { tableProps } = useTable({ resource: "fournisseurs", pagination: { mode: "off" } });

  return (
    <List headerButtons={<Button type="primary" icon={<PlusOutlined />} onClick={() => create("fournisseurs")}>Nouveau fournisseur</Button>}>
      <Table {...tableProps} rowKey="id" size="small">
        <Table.Column title="Nom" dataIndex="nom" />
        <Table.Column title="Contact" dataIndex="nomContact" render={(v) => v || "—"} />
        <Table.Column title="Type" dataIndex="type" render={(v) => v ? <Tag>{TYPE_LABELS[v] ?? v}</Tag> : null} />
        <Table.Column title="Téléphone" dataIndex="telephone" render={(v) => v || "—"} />
        <Table.Column title="Email" dataIndex="email" render={(v) => v || "—"} />
        <Table.Column title="Bio" dataIndex="bio" render={(v) => v ? <Tag color="success">Bio</Tag> : null} />
        <Table.Column title="Réceptions" dataIndex={["_count", "receptions"]} align="right" />
        <Table.Column title="" key="actions" width={110} render={(_, r: any) => (
          <Space>
            <Button size="small" icon={<EyeOutlined />} onClick={() => show("fournisseurs", r.id)} />
            <Button size="small" icon={<EditOutlined />} onClick={() => edit("fournisseurs", r.id)} />
            <Popconfirm
              title="Supprimer ce fournisseur ?"
              onConfirm={() => deleteOne({ resource: "fournisseurs", id: r.id })}
              okText="Supprimer"
              cancelText="Annuler"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        )} />
      </Table>
    </List>
  );
};
