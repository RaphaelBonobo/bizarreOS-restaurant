import { Show } from "@refinedev/antd";
import { useShow, useNavigation } from "@refinedev/core";
import { Card, Descriptions, Table, Tag, Typography, Progress } from "antd";
import dayjs from "dayjs";

const { Text } = Typography;

const ALLERGENE_LABELS: Record<string, string> = {
  GLUTEN: "Gluten", CRUSTACES: "Crustacés", OEUFS: "Œufs", POISSONS: "Poissons",
  ARACHIDES: "Arachides", SOJA: "Soja", LAIT: "Lait", FRUIT_A_COQUE: "Fruits à coque",
  CELERI: "Céleri", MOUTARDE: "Moutarde", SESAME: "Sésame", SULFITES: "Sulfites",
  LUPIN: "Lupin", MOLLUSQUES: "Mollusques",
};

export const IngredientShow = () => {
  const { query } = useShow({ resource: "ingredients" });
  const { show } = useNavigation();
  const record = query?.data?.data as any;
  if (!record) return null;

  const pct = record.stockReception > 0
    ? Math.max(0, (record.stockRestant ?? 0) / Number(record.stockReception)) * 100
    : 0;

  const usageColumns = [
    { title: "Menu", dataIndex: ["menu", "nom"], key: "nom", render: (v: string, r: any) => v || dayjs(r.menu?.date).format("DD/MM/YYYY") },
    { title: "Date", dataIndex: ["menu", "date"], key: "date", render: (v: string) => dayjs(v).format("DD/MM/YYYY") },
    { title: "Quantité", dataIndex: "quantite", key: "q", render: (v: number, r: any) => `${Number(v).toFixed(3)} ${r.unite ?? record.unite ?? ""}` },
  ];

  return (
    <Show>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Nom">{record.nom}</Descriptions.Item>
          <Descriptions.Item label="Origine">{record.origine || "—"}</Descriptions.Item>
          <Descriptions.Item label="Bio">{record.bio ? <Tag color="success">Oui</Tag> : "Non"}</Descriptions.Item>
          <Descriptions.Item label="Unité">{record.unite || "—"}</Descriptions.Item>
          <Descriptions.Item label="Stock reçu">
            {record.stockReception != null ? `${Number(record.stockReception).toFixed(3)} ${record.unite ?? ""}` : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Prix total achat">
            {record.prixTotal != null ? `${Number(record.prixTotal).toFixed(2)} €` : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Prix unitaire">
            {record.prixUnitaire != null ? `${Number(record.prixUnitaire).toFixed(4)} € / ${record.unite ?? "unité"}` : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="État">
            {record.epuise ? <Tag color="error">Épuisé</Tag> : <Tag color="success">Disponible</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="Consommé en menus">
            {`${(record.stockConsomme ?? 0).toFixed(3)} ${record.unite ?? ""}`}
          </Descriptions.Item>
          <Descriptions.Item label="Stock restant">
            <Progress percent={Math.round(pct)} size="small" style={{ width: 160 }} />
            {` ${(record.stockRestant ?? 0).toFixed(3)} ${record.unite ?? ""}`}
          </Descriptions.Item>
          {record.lot && (
            <Descriptions.Item label="Réception d'origine">
              <a onClick={() => show("receptions", record.lot.id)} style={{ cursor: "pointer" }}>
                {record.lot.numeroPiece
                  ? `N° ${record.lot.numeroPiece}`
                  : record.lot.dateAchat
                    ? dayjs(record.lot.dateAchat).format("DD/MM/YYYY")
                    : "Voir la réception"}
              </a>
            </Descriptions.Item>
          )}
          {record.notes && <Descriptions.Item label="Notes" span={2}>{record.notes}</Descriptions.Item>}
        </Descriptions>

        {(record.allergenes ?? []).length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ marginRight: 8 }}>Allergènes :</Text>
            {(record.allergenes ?? []).map((a: string) => (
              <Tag key={a} color="warning">{ALLERGENE_LABELS[a] ?? a}</Tag>
            ))}
          </div>
        )}
      </Card>

      {(record.menuIngredients ?? []).length > 0 && (
        <Card title="Utilisé dans les menus" size="small">
          <Table
            dataSource={record.menuIngredients}
            columns={usageColumns}
            rowKey="id"
            size="small"
            pagination={false}
          />
        </Card>
      )}
    </Show>
  );
};
