import { Show } from "@refinedev/antd";
import { useShow, useNavigation } from "@refinedev/core";
import { Card, Descriptions, Table, Tag, Button, Space, Tooltip, message } from "antd";
import { PlusOutlined, FilePdfOutlined, DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { axiosInstance } from "../../lib/axios";
import { API_URL } from "../../config";

export const ReceptionShow = () => {
  const { query } = useShow({ resource: "receptions" });
  const { create, show } = useNavigation();
  const record = query?.data?.data as any;
  if (!record) return null;

  const handleDownload = async (attachmentId: string, filename: string) => {
    try {
      const resp = await axiosInstance.get(`${API_URL}/invoice-parser/attachment/${attachmentId}/signed-url`);
      const a = document.createElement("a");
      a.href = resp.data.url;
      a.target = "_blank";
      a.download = filename;
      a.click();
    } catch {
      message.error("Impossible de télécharger le fichier");
    }
  };

  const ingColumns = [
    { title: "Ingrédient", dataIndex: "nom", key: "nom", render: (v: string) => v || "—" },
    { title: "Quantité", key: "q", render: (_: any, r: any) => r.stockReception != null ? `${Number(r.stockReception).toFixed(3)} ${r.unite ?? ""}` : "—" },
    { title: "Prix total", dataIndex: "prixTotal", key: "p", render: (v: number) => v != null ? `${Number(v).toFixed(2)} €` : "—" },
    { title: "Bio", dataIndex: "bio", key: "bio", render: (v: boolean) => v ? <Tag color="success">Bio</Tag> : null },
    {
      title: "Menus utilisés", key: "menus",
      render: (_: any, r: any) => {
        const menus = r.menuIngredients ?? [];
        if (menus.length === 0) return <span style={{ color: "#aaa" }}>—</span>;
        return (
          <Space size={4} wrap>
            {menus.map((mi: any) => (
              <Tooltip key={mi.id} title={mi.menu?.nom || ""}>
                <Tag
                  style={{ cursor: "pointer" }}
                  onClick={() => show("menus", mi.menu?.id)}
                >
                  {mi.menu?.nom || dayjs(mi.menu?.date).format("DD/MM/YY")}
                </Tag>
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
  ];

  return (
    <Show
      headerButtons={
        <Button icon={<PlusOutlined />} onClick={() => create("ingredients")}>
          Ajouter un ingrédient à cette réception
        </Button>
      }
    >
      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="N° pièce">{record.numeroPiece || "—"}</Descriptions.Item>
          <Descriptions.Item label="Date">{record.dateAchat ? dayjs(record.dateAchat).format("DD/MM/YYYY") : "—"}</Descriptions.Item>
          <Descriptions.Item label="Fournisseurs">
            {(record.fournisseurs ?? []).map((f: any) => <Tag key={f.id}>{f.nom}</Tag>)}
          </Descriptions.Item>
          {record.notes && <Descriptions.Item label="Notes" span={2}>{record.notes}</Descriptions.Item>}
        </Descriptions>
      </Card>

      {(record.attachments ?? []).length > 0 && (
        <Card title="Pièces jointes" size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            {(record.attachments as any[]).map((att: any) => (
              <Button
                key={att.id}
                icon={<FilePdfOutlined />}
                onClick={() => handleDownload(att.id, att.filename)}
              >
                <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block", verticalAlign: "middle" }}>
                  {att.filename}
                </span>
                <DownloadOutlined style={{ marginLeft: 4 }} />
              </Button>
            ))}
          </Space>
        </Card>
      )}

      <Card title="Ingrédients reçus" size="small">
        <Table dataSource={record.ingredients ?? []} columns={ingColumns} rowKey="id" size="small" pagination={false}
          locale={{ emptyText: "Aucun ingrédient — ajoutez-en depuis la page Ingrédients" }} />
      </Card>
    </Show>
  );
};
