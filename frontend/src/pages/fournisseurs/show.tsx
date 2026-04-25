import { Show } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Card, Descriptions, Table, Tag } from "antd";
import dayjs from "dayjs";

const TYPE_LABELS: Record<string, string> = {
  GROSSISTE_GENERALISTE: "Grossiste", LEGUMES_FRUITS: "Légumes/Fruits",
  BOUCHERIE_CHARCUTERIE: "Boucherie", POISSONNERIE: "Poissonnerie",
  CREMERIE: "Crémerie", EPICERIE_SECHE: "Épicerie sèche",
  BOULANGERIE: "Boulangerie", AUTRE: "Autre",
};

export const FournisseurShow = () => {
  const { query } = useShow({ resource: "fournisseurs" });
  const record = query?.data?.data as any;
  if (!record) return null;

  const receptionColumns = [
    { title: "N° pièce", dataIndex: "numeroPiece", key: "n", render: (v: string) => v || "—" },
    { title: "Date", dataIndex: "dateAchat", key: "d", render: (v: string) => v ? dayjs(v).format("DD/MM/YYYY") : "—" },
    { title: "Notes", dataIndex: "notes", key: "note", render: (v: string) => v || "—" },
  ];

  return (
    <Show>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Nom">{record.nom}</Descriptions.Item>
          <Descriptions.Item label="Type">{record.type ? TYPE_LABELS[record.type] ?? record.type : "—"}</Descriptions.Item>
          <Descriptions.Item label="Contact">{record.nomContact || "—"}</Descriptions.Item>
          <Descriptions.Item label="Téléphone">{record.telephone || "—"}</Descriptions.Item>
          <Descriptions.Item label="Email">{record.email || "—"}</Descriptions.Item>
          <Descriptions.Item label="Adresse">{record.adresse || "—"}</Descriptions.Item>
          <Descriptions.Item label="Bio">{record.bio ? <Tag color="success">Oui</Tag> : "Non"}</Descriptions.Item>
          {record.certificateur && <Descriptions.Item label="Certificateur">{record.certificateur}</Descriptions.Item>}
          {record.numeroCertificat && <Descriptions.Item label="N° certificat">{record.numeroCertificat}</Descriptions.Item>}
          {record.notes && <Descriptions.Item label="Notes" span={2}>{record.notes}</Descriptions.Item>}
        </Descriptions>
      </Card>

      {(record.receptions ?? []).length > 0 && (
        <Card title="Dernières réceptions" size="small">
          <Table dataSource={record.receptions} columns={receptionColumns} rowKey="id" size="small" pagination={false} />
        </Card>
      )}
    </Show>
  );
};
