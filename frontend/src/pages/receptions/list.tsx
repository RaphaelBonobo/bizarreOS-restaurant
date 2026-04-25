import { List, useTable } from "@refinedev/antd";
import { useNavigation, useDelete } from "@refinedev/core";
import { Table, Button, Space, Tag, Popconfirm } from "antd";
import { EyeOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

export const ReceptionList = () => {
  const { show, create } = useNavigation();
  const { mutate: deleteOne } = useDelete();
  const { tableProps } = useTable({ resource: "receptions", pagination: { mode: "off" } });

  return (
    <List headerButtons={<Button type="primary" icon={<PlusOutlined />} onClick={() => create("receptions")}>Nouvelle réception</Button>}>
      <Table {...tableProps} rowKey="id" size="small">
        <Table.Column title="N° pièce" dataIndex="numeroPiece" render={(v) => v || "—"} />
        <Table.Column title="Date" dataIndex="dateAchat" render={(v) => v ? dayjs(v).format("DD/MM/YYYY") : "—"} />
        <Table.Column title="Fournisseurs" dataIndex="fournisseurs" render={(v: any[]) => (v ?? []).map((f) => <Tag key={f.id}>{f.nom}</Tag>)} />
        <Table.Column title="Ingrédients" dataIndex={["_count", "ingredients"]} align="right" />
        <Table.Column title="Notes" dataIndex="notes" render={(v) => v || "—"} />
        <Table.Column title="" key="actions" width={80} render={(_, r: any) => (
          <Space>
            <Button size="small" icon={<EyeOutlined />} onClick={() => show("receptions", r.id)} />
            <Popconfirm
              title="Supprimer cette réception ?"
              onConfirm={() => deleteOne({ resource: "receptions", id: r.id })}
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
