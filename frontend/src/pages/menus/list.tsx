import { List, useTable } from "@refinedev/antd";
import { useNavigation, useDelete } from "@refinedev/core";
import { Table, Button, Tag, Space, DatePicker, Typography, Tooltip, Popconfirm } from "antd";
import { EyeOutlined, EditOutlined, PlusOutlined, FilePdfOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useState } from "react";
import { axiosInstance } from "../../lib/axios";
import { API_URL } from "../../config";

const { RangePicker } = DatePicker;
const { Text } = Typography;

const TYPE_LABELS: Record<string, string> = {
  DEJEUNER: "Déjeuner", DINER: "Dîner", BRUNCH: "Brunch", BUFFET: "Buffet", AUTRE: "Autre",
};

const ALLERGENE_LABELS: Record<string, string> = {
  GLUTEN: "Gluten", CRUSTACES: "Crustacés", OEUFS: "Œufs", POISSONS: "Poissons",
  ARACHIDES: "Arachides", SOJA: "Soja", LAIT: "Lait", FRUIT_A_COQUE: "Fruits à coque",
  CELERI: "Céleri", MOUTARDE: "Moutarde", SESAME: "Sésame", SULFITES: "Sulfites",
  LUPIN: "Lupin", MOLLUSQUES: "Mollusques",
};

export const MenuList = () => {
  const { show, create, edit } = useNavigation();
  const { mutate: deleteOne } = useDelete();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  const filters: any[] = [];
  if (dateRange[0]) filters.push({ field: "from", operator: "eq", value: dateRange[0].startOf("day").toISOString() });
  if (dateRange[1]) filters.push({ field: "to", operator: "eq", value: dateRange[1].endOf("day").toISOString() });

  const { tableProps } = useTable({
    resource: "menus",
    pagination: { mode: "off" },
    filters: { permanent: filters },
    sorters: { initial: [{ field: "date", order: "desc" }] },
  });

  const exportCSV = async () => {
    const params = dateRange[0] && dateRange[1]
      ? `?mois=${dateRange[0].format("YYYY-MM")}`
      : `?mois=${dayjs().format("YYYY-MM")}`;
    const url = `${API_URL}/exports/csv${params}`;
    const win = window.open(url, "_blank");
    if (!win) window.location.href = url;
  };

  return (
    <List
      headerButtons={
        <Space>
          <RangePicker
            value={dateRange as any}
            onChange={(v) => setDateRange(v ? [v[0], v[1]] : [null, null])}
            format="DD/MM/YYYY"
            placeholder={["Début", "Fin"]}
          />
          <Button icon={<FilePdfOutlined />} onClick={exportCSV}>Export CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => create("menus")}>Nouveau menu</Button>
        </Space>
      }
    >
      <Table {...tableProps} rowKey="id" size="small">
        <Table.Column
          title="Date"
          dataIndex="date"
          sorter
          render={(v) => dayjs(v).format("ddd DD/MM/YYYY")}
          width={140}
        />
        <Table.Column title="Nom" dataIndex="nom" render={(v) => v || <Text type="secondary">Sans nom</Text>} />
        <Table.Column
          title="Type"
          dataIndex="typeRepas"
          render={(v) => v ? <Tag>{TYPE_LABELS[v] ?? v}</Tag> : null}
          width={100}
        />
        <Table.Column title="Couverts" dataIndex="nbCouvertsPrevus" width={90} align="right" />
        <Table.Column title="Bénévoles" dataIndex="nbBenevoles" width={90} align="right" />
        <Table.Column
          title="Coût/assiette"
          dataIndex="coutParAssiette"
          width={110}
          align="right"
          render={(v) => v != null ? <Text>{v.toFixed(2)} €</Text> : "—"}
        />
        <Table.Column
          title="CA"
          dataIndex="chiffreAffaires"
          width={100}
          align="right"
          render={(v) => v != null ? `${Number(v).toFixed(2)} €` : "—"}
        />
        <Table.Column
          title="Bilan"
          dataIndex="bilan"
          width={110}
          align="right"
          render={(v) => {
            if (v == null) return "—";
            return <Tag color={v >= 0 ? "success" : "error"}>{v >= 0 ? "+" : ""}{v.toFixed(2)} €</Tag>;
          }}
        />
        <Table.Column
          title="Allergènes"
          dataIndex="allergenes"
          render={(v: string[]) => (v ?? []).map((a) => (
            <Tooltip key={a} title={ALLERGENE_LABELS[a] ?? a}>
              <Tag color="orange" style={{ cursor: "help", fontSize: 11 }}>{ALLERGENE_LABELS[a] ?? a}</Tag>
            </Tooltip>
          ))}
        />
        <Table.Column
          title=""
          key="actions"
          width={100}
          render={(_, record: any) => (
            <Space>
              <Button size="small" icon={<EyeOutlined />} onClick={() => show("menus", record.id)} />
              <Button size="small" icon={<EditOutlined />} onClick={() => edit("menus", record.id)} />
              <Popconfirm
                title="Supprimer ce menu ?"
                onConfirm={() => deleteOne({ resource: "menus", id: record.id })}
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
