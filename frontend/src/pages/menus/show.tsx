import { Show } from "@refinedev/antd";
import { useShow, useNavigation, useInvalidate } from "@refinedev/core";
import {
  Card, Col, Descriptions, Row, Table, Tag, Typography,
  Button, Space, Divider, InputNumber, message, Tooltip,
} from "antd";
import { EditOutlined, FilePdfOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import { axiosInstance } from "../../lib/axios";
import { API_URL } from "../../config";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const { Text } = Typography;

const TYPE_LABELS: Record<string, string> = {
  DEJEUNER: "Déjeuner", DINER: "Dîner", BRUNCH: "Brunch", BUFFET: "Buffet", AUTRE: "Autre",
};

const COURS_LABELS: Record<string, string> = {
  ENTREE: "Entrée", PLAT: "Plat", DESSERT: "Dessert", AUTRE: "Autre",
};

const COURS_COLORS: Record<string, string> = {
  ENTREE: "#8b9862", PLAT: "#c9a961", DESSERT: "#c46a5c", AUTRE: "#8c8c8c",
};

const ALLERGENE_LABELS: Record<string, string> = {
  GLUTEN: "Gluten", CRUSTACES: "Crustacés", OEUFS: "Œufs", POISSONS: "Poissons",
  ARACHIDES: "Arachides", SOJA: "Soja", LAIT: "Lait", FRUIT_A_COQUE: "Fruits à coque",
  CELERI: "Céleri", MOUTARDE: "Moutarde", SESAME: "Sésame", SULFITES: "Sulfites",
  LUPIN: "Lupin", MOLLUSQUES: "Mollusques",
};

export const MenuShow = () => {
  const { query } = useShow({ resource: "menus" });
  const { edit, show } = useNavigation();

  const ingColumns = [
    { title: "Ingrédient", dataIndex: ["ingredient", "nom"], key: "nom" },
    {
      title: "Quantité", key: "quantite",
      render: (_: any, r: any) => `${Number(r.quantite).toFixed(3)} ${r.unite ?? r.ingredient?.unite ?? ""}`,
    },
    {
      title: "Prix unitaire", key: "prixU", align: "right" as const,
      render: (_: any, r: any) => {
        const p = r.prixUnitaire
          ? Number(r.prixUnitaire)
          : r.ingredient?.prixTotal && r.ingredient?.stockReception
            ? Number(r.ingredient.prixTotal) / Number(r.ingredient.stockReception)
            : null;
        return p != null ? `${p.toFixed(4)} €` : "—";
      },
    },
    {
      title: "Coût ligne", key: "cout", align: "right" as const,
      render: (_: any, r: any) => {
        const p = r.prixUnitaire
          ? Number(r.prixUnitaire)
          : r.ingredient?.prixTotal && r.ingredient?.stockReception
            ? Number(r.ingredient.prixTotal) / Number(r.ingredient.stockReception)
            : 0;
        return `${(p * Number(r.quantite)).toFixed(2)} €`;
      },
    },
    {
      title: "Réception", key: "lot",
      render: (_: any, r: any) => {
        const lot = r.ingredient?.lot;
        if (!lot) return <span style={{ color: "#aaa" }}>—</span>;
        return (
          <a onClick={() => show("receptions", lot.id)} style={{ cursor: "pointer" }}>
            {lot.numeroPiece ? `N° ${lot.numeroPiece}` : dayjs(lot.dateAchat).format("DD/MM/YY")}
          </a>
        );
      },
    },
    {
      title: "Allergènes", key: "allergenes",
      render: (_: any, r: any) =>
        (r.ingredient?.allergenes ?? []).map((a: string) => (
          <Tag key={a} color="orange" style={{ fontSize: 10 }}>{ALLERGENE_LABELS[a] ?? a}</Tag>
        )),
    },
  ];
  const invalidate = useInvalidate();
  const record = query?.data?.data as any;

  const [editingCA, setEditingCA] = useState(false);
  const [caValue, setCaValue] = useState<number | string | null>(null);
  const [savingCA, setSavingCA] = useState(false);

  const startEditCA = () => {
    setCaValue(record?.chiffreAffaires != null ? Number(record.chiffreAffaires) : null);
    setEditingCA(true);
  };

  const cancelEditCA = () => {
    setEditingCA(false);
    setCaValue(null);
  };

  const saveCA = async () => {
    setSavingCA(true);
    try {
      await axiosInstance.patch(`${API_URL}/menus/${record.id}`, { chiffreAffaires: caValue });
      message.success("Chiffre d'affaires enregistré");
      setEditingCA(false);
      invalidate({ resource: "menus", invalidates: ["detail"] });
    } catch {
      message.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingCA(false);
    }
  };

  const exportPDF = async () => {
    if (!record) return;
    try {
      const res = await axiosInstance.get(`${API_URL}/exports/menu/${record.id}/json`);
      const { menu, ingredients } = res.data;
      const doc = new jsPDF();
      const date = dayjs(menu.date).format("dddd DD MMMM YYYY");

      doc.setFontSize(18);
      doc.text(`Fiche menu — ${date}`, 14, 20);
      doc.setFontSize(12);
      if (menu.nom) doc.text(menu.nom, 14, 30);

      doc.setFontSize(11);
      let y = 42;
      const line = (text: string) => { doc.text(text, 14, y); y += 8; };

      line(`Type : ${menu.typeRepas ? TYPE_LABELS[menu.typeRepas] ?? menu.typeRepas : "—"}`);
      line(`Couverts prévus : ${menu.nbCouvertsPrevus}${menu.nbCouvertsReels != null ? `  |  Réels : ${menu.nbCouvertsReels}` : ""}${menu.nbCouvertsBenevoles != null ? `  |  Bénévoles : ${menu.nbCouvertsBenevoles}` : ""}`);
      line(`Bénévoles : ${menu.nbBenevoles} × ${Number(menu.heuresBenevoles).toFixed(1)} h`);
      line(`Coût total matières : ${menu.coutTotal?.toFixed(2)} €  |  Coût / couvert : ${menu.coutParAssiette?.toFixed(2)} €`);
      if (menu.coutRepasBenevoles != null) line(`Coût repas bénévoles : ${menu.coutRepasBenevoles.toFixed(2)} €`);
      line(`Chiffre d'affaires : ${menu.chiffreAffaires != null ? `${Number(menu.chiffreAffaires).toFixed(2)} €` : "—"}${menu.panisMoyen != null ? `  |  Panier moyen : ${menu.panisMoyen.toFixed(2)} €` : ""}`);
      if (menu.bilan != null) line(`Bilan : ${menu.bilan >= 0 ? "+" : ""}${menu.bilan.toFixed(2)} €`);
      if (menu.allergenes?.length) line(`Allergènes : ${menu.allergenes.join(", ")}`);

      autoTable(doc, {
        startY: y + 4,
        head: [["Cours", "Ingrédient", "Quantité", "Unité", "Prix unit.", "Coût ligne"]],
        body: ingredients.map((i: any) => [
          i.coursType ? COURS_LABELS[i.coursType] ?? i.coursType : "—",
          i.nom,
          Number(i.quantite).toFixed(3),
          i.unite,
          `${i.prixUnitaire?.toFixed(4)} €`,
          `${i.coutLigne?.toFixed(2)} €`,
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [201, 169, 97] },
      });

      if (menu.notes) {
        const y = (doc as any).lastAutoTable.finalY + 10;
        doc.text(`Notes : ${menu.notes}`, 14, y);
      }

      doc.save(`menu-${dayjs(menu.date).format("YYYY-MM-DD")}.pdf`);
    } catch {
      message.error("Erreur lors de la génération du PDF");
    }
  };

  if (!record) return null;

  // Determine if ingredients have course assignments
  const hasCours = (record.parCours ?? []).length > 1 ||
    (record.parCours ?? []).some((c: any) => c.coursType !== null);

  return (
    <Show
      headerButtons={
        <Space>
          <Button icon={<FilePdfOutlined />} onClick={exportPDF}>Export PDF</Button>
          <Button type="primary" icon={<EditOutlined />} onClick={() => edit("menus", record.id)}>
            Modifier
          </Button>
        </Space>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Informations" size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Date">
                {dayjs(record.date).format("dddd DD MMMM YYYY")}
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                {record.typeRepas ? TYPE_LABELS[record.typeRepas] ?? record.typeRepas : "—"}
              </Descriptions.Item>
              {record.nom && <Descriptions.Item label="Nom" span={2}>{record.nom}</Descriptions.Item>}
              {record.description && (
                <Descriptions.Item label="Description" span={2}>{record.description}</Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {hasCours ? (
            // Grouped by course
            (record.parCours ?? []).map((groupe: any) => (
              <Card
                key={groupe.coursType ?? "sans-cours"}
                size="small"
                style={{ marginBottom: 16 }}
                title={
                  <Space>
                    <span style={{
                      display: "inline-block",
                      width: 10, height: 10,
                      borderRadius: "50%",
                      background: COURS_COLORS[groupe.coursType] ?? "#8c8c8c",
                    }} />
                    <Text strong>
                      {groupe.coursType ? COURS_LABELS[groupe.coursType] : "Sans cours attribué"}
                    </Text>
                    <Text type="secondary" style={{ fontWeight: 400 }}>
                      — {groupe.cout.toFixed(2)} €
                    </Text>
                    {groupe.allergenes?.length > 0 && (
                      <Space size={2} wrap>
                        {groupe.allergenes.map((a: string) => (
                          <Tag key={a} color="orange" style={{ fontSize: 10, margin: 0 }}>
                            {ALLERGENE_LABELS[a] ?? a}
                          </Tag>
                        ))}
                      </Space>
                    )}
                  </Space>
                }
              >
                <Table
                  dataSource={groupe.ingredients}
                  columns={ingColumns}
                  rowKey="id"
                  size="small"
                  pagination={false}
                />
              </Card>
            ))
          ) : (
            // Flat list (no course assignment)
            <Card title="Ingrédients & coûts" size="small">
              <Table
                dataSource={record.ingredients ?? []}
                columns={ingColumns}
                rowKey="id"
                size="small"
                pagination={false}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <Text strong>Total</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <Text strong>{record.coutTotal?.toFixed(2)} €</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} />
                  </Table.Summary.Row>
                )}
              />
            </Card>
          )}
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Bilan du service" size="small" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Couverts */}
              <StatRow label="Couverts prévus" value={record.nbCouvertsPrevus} />
              <StatRow
                label="Couverts réels"
                value={record.nbCouvertsReels ?? <Text type="secondary" style={{ fontSize: 12 }}>Non renseigné</Text>}
              />
              {record.nbCouvertsBenevoles != null && (
                <StatRow label="Couverts bénévoles" value={record.nbCouvertsBenevoles} />
              )}

              <Divider style={{ margin: "4px 0" }} />

              {/* Bénévoles travailleurs */}
              <StatRow label="Bénévoles" value={record.nbBenevoles} />
              <StatRow label="Heures bénévoles" value={`${Number(record.heuresBenevoles).toFixed(1)} h`} />

              <Divider style={{ margin: "4px 0" }} />

              {/* Coûts */}
              <StatRow label="Coût total matières" value={`${record.coutTotal?.toFixed(2)} €`} />
              <StatRow
                label={record.nbCouvertsReels ? "Coût / couvert réel" : "Coût / couvert prévu"}
                value={`${record.coutParAssiette?.toFixed(2)} €`}
              />
              {record.coutRepasBenevoles != null && (
                <StatRow
                  label="Coût repas bénévoles"
                  value={`${record.coutRepasBenevoles.toFixed(2)} €`}
                  color="#8c8c8c"
                />
              )}

              {hasCours && (
                <>
                  <Divider style={{ margin: "4px 0" }} />
                  {(record.parCours ?? []).filter((c: any) => c.coursType).map((c: any) => (
                    <StatRow
                      key={c.coursType}
                      label={COURS_LABELS[c.coursType]}
                      value={`${c.cout.toFixed(2)} €`}
                      color={COURS_COLORS[c.coursType]}
                    />
                  ))}
                </>
              )}

              <Divider style={{ margin: "4px 0" }} />

              {/* CA inline edit */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text type="secondary" style={{ fontSize: 13 }}>Chiffre d'affaires</Text>
                {editingCA ? (
                  <Space size={4}>
                    <InputNumber
                      size="small" min={0} step={0.01} value={caValue}
                      onChange={setCaValue} suffix="€" style={{ width: 110 }}
                      autoFocus onPressEnter={saveCA}
                    />
                    <Tooltip title="Enregistrer">
                      <Button size="small" type="primary" icon={<CheckOutlined />}
                        loading={savingCA} onClick={saveCA}
                        style={{ background: "#8b9862", borderColor: "#8b9862" }} />
                    </Tooltip>
                    <Tooltip title="Annuler">
                      <Button size="small" icon={<CloseOutlined />} onClick={cancelEditCA} />
                    </Tooltip>
                  </Space>
                ) : (
                  <Space size={8}>
                    <Text strong>
                      {record.chiffreAffaires != null ? `${Number(record.chiffreAffaires).toFixed(2)} €` : "—"}
                    </Text>
                    <Tooltip title="Saisir le CA">
                      <Button size="small" type="text" icon={<EditOutlined />}
                        onClick={startEditCA} style={{ opacity: 0.5 }} />
                    </Tooltip>
                  </Space>
                )}
              </div>

              {record.panisMoyen != null && (
                <StatRow
                  label="Panier moyen"
                  value={`${record.panisMoyen.toFixed(2)} €`}
                  color="#c9a961"
                />
              )}

              {record.bilan != null && (
                <StatRow
                  label="Bilan"
                  value={`${record.bilan >= 0 ? "+" : ""}${record.bilan.toFixed(2)} €`}
                  color={record.bilan >= 0 ? "#8b9862" : "#c46a5c"}
                />
              )}
            </div>
          </Card>

          {(record.allergenes ?? []).length > 0 && (
            <Card title="Allergènes du menu" size="small" style={{ marginBottom: 16 }}>
              <Space wrap>
                {(record.allergenes ?? []).map((a: string) => (
                  <Tag key={a} color="warning">{ALLERGENE_LABELS[a] ?? a}</Tag>
                ))}
              </Space>
            </Card>
          )}

          {record.notes && (
            <Card title="Notes" size="small">
              <Text>{record.notes}</Text>
            </Card>
          )}
        </Col>
      </Row>
    </Show>
  );
};

const StatRow = ({ label, value, color }: { label: string; value: any; color?: string }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>
    <Text strong style={{ color }}>{value}</Text>
  </div>
);
