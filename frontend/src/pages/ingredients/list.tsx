import { List, useTable } from "@refinedev/antd";
import { useNavigation, useDelete } from "@refinedev/core";
import { Table, Button, Tag, Space, Progress, Typography, Tooltip, Popconfirm } from "antd";
import { EyeOutlined, EditOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";

const { Text } = Typography;

const ALLERGENE_LABELS: Record<string, string> = {
  GLUTEN: "Gluten", CRUSTACES: "Crustacés", OEUFS: "Œufs", POISSONS: "Poissons",
  ARACHIDES: "Arachides", SOJA: "Soja", LAIT: "Lait", FRUIT_A_COQUE: "Fruits à coque",
  CELERI: "Céleri", MOUTARDE: "Moutarde", SESAME: "Sésame", SULFITES: "Sulfites",
  LUPIN: "Lupin", MOLLUSQUES: "Mollusques",
};

export const IngredientList = () => {
  const { show, create, edit } = useNavigation();
  const { mutate: deleteOne } = useDelete();
  const { tableProps } = useTable({
    resource: "ingredients",
    pagination: { mode: "off" },
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
  });

  return (
    <List
      headerButtons={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => create("ingredients")}>
          Nouvel ingrédient
        </Button>
      }
    >
      <Table {...tableProps} rowKey="id" size="small">
        <Table.Column title="Nom" dataIndex="nom" render={(v) => v || <Text type="secondary">—</Text>} />
        <Table.Column
          title="Réception"
          dataIndex={["lot", "numeroPiece"]}
          render={(v, r: any) => v || r.lot?.id?.slice(0, 8) || "—"}
        />
        <Table.Column
          title="Stock reçu"
          key="stock"
          align="right"
          render={(_, r: any) => r.stockReception != null ? `${Number(r.stockReception).toFixed(3)} ${r.unite ?? ""}` : "—"}
        />
        <Table.Column
          title="Consommé"
          key="conso"
          align="right"
          render={(_, r: any) => r.stockConsomme != null ? `${r.stockConsomme.toFixed(3)} ${r.unite ?? ""}` : "—"}
        />
        <Table.Column
          title="Restant"
          key="restant"
          width={160}
          render={(_, r: any) => {
            if (r.stockReception == null) return "—";
            const pct = r.stockReception > 0 ? Math.max(0, (r.stockRestant ?? 0) / Number(r.stockReception)) * 100 : 0;
            return (
              <Tooltip title={`${(r.stockRestant ?? 0).toFixed(3)} ${r.unite ?? ""}`}>
                <Progress percent={Math.round(pct)} size="small" status={r.epuise ? "exception" : pct < 20 ? "active" : "normal"} />
              </Tooltip>
            );
          }}
        />
        <Table.Column
          title="Prix unit."
          dataIndex="prixUnitaire"
          align="right"
          render={(v) => v != null ? `${Number(v).toFixed(4)} €` : "—"}
        />
        <Table.Column
          title="Bio"
          dataIndex="bio"
          width={60}
          align="center"
          render={(v) => v ? <Tag color="success">Bio</Tag> : null}
        />
        <Table.Column
          title="Allergènes"
          dataIndex="allergenes"
          render={(v: string[]) => (v ?? []).map((a) => (
            <Tag key={a} color="orange" style={{ fontSize: 11 }}>{ALLERGENE_LABELS[a] ?? a}</Tag>
          ))}
        />
        <Table.Column
          title="État"
          dataIndex="epuise"
          width={80}
          render={(v) => v ? <Tag color="error">Épuisé</Tag> : <Tag color="success">Disponible</Tag>}
        />
        <Table.Column
          title=""
          key="actions"
          width={80}
          render={(_, record: any) => (
            <Space>
              <Button size="small" icon={<EyeOutlined />} onClick={() => show("ingredients", record.id)} />
              <Button size="small" icon={<EditOutlined />} onClick={() => edit("ingredients", record.id)} />
              <Popconfirm
                title="Supprimer cet ingrédient ?"
                onConfirm={() => deleteOne({ resource: "ingredients", id: record.id })}
                okText="Supprimer"
                cancelText="Annuler"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
