import { useState } from "react";
import {
  Modal, Upload, Button, Table, Input, InputNumber, Select, Switch,
  Form, Alert, Space, Typography, Divider, Tag, Spin, message
} from "antd";
import {
  UploadOutlined, FilePdfOutlined, CheckCircleOutlined,
  EditOutlined, PlusOutlined, DeleteOutlined, CloseCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router";
import { axiosInstance } from "../lib/axios";
import { API_URL } from "../config";

const { Text } = Typography;
const { Dragger } = Upload;

interface ParsedIngredient {
  nom: string;
  stockReception: number | null;
  unite: string | null;
  prixTotal: number | null;
  bio: boolean;
  origine: string | null;
  allergenes: string[];
}

interface ParsedInvoice {
  numeroPiece: string | null;
  dateAchat: string | null;
  fournisseurNom: string | null;
  notes: string | null;
  ingredients: ParsedIngredient[];
}

const UNITES = ["KG", "G", "L", "CL", "ML", "PIECE", "BOTTES", "SACHET", "BOUQUET"];
const ALLERGENES = [
  "GLUTEN", "CRUSTACES", "OEUFS", "POISSONS", "ARACHIDES", "SOJA",
  "LAIT", "FRUIT_A_COQUE", "CELERI", "MOUTARDE", "SESAME", "SULFITES", "LUPIN", "MOLLUSQUES",
];

interface Props {
  open: boolean;
  onClose: () => void;
  fournisseurs: { value: string; label: string }[];
}

export const InvoiceParser = ({ open, onClose, fournisseurs }: Props) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"upload" | "preview" | "confirming">("upload");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ParsedInvoice | null>(null);
  const [ingredients, setIngredients] = useState<ParsedIngredient[]>([]);
  const [selectedFournisseurIds, setSelectedFournisseurIds] = useState<string[]>([]);
  const [numeroPiece, setNumeroPiece] = useState<string>("");
  const [dateAchat, setDateAchat] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [attachmentId, setAttachmentId] = useState<string | undefined>(undefined);
  const [s3Saved, setS3Saved] = useState<boolean | null>(null);

  const reset = () => {
    setStep("upload");
    setLoading(false);
    setPreview(null);
    setIngredients([]);
    setSelectedFournisseurIds([]);
    setNumeroPiece("");
    setDateAchat("");
    setError(null);
    setAttachmentId(undefined);
    setS3Saved(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("pdf", file);
    try {
      const resp = await axiosInstance.post<ParsedInvoice>(
        `${API_URL}/invoice-parser/parse`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const data = resp.data as ParsedInvoice & { attachmentId?: string };
      setPreview(data);
      setAttachmentId(data.attachmentId);
      setS3Saved(!!data.attachmentId);
      setIngredients(data.ingredients ?? []);
      setNumeroPiece(data.numeroPiece ?? "");
      setDateAchat(data.dateAchat ?? "");
      // Auto-match fournisseur
      if (data.fournisseurNom) {
        const match = fournisseurs.find((f) =>
          f.label.toLowerCase().includes(data.fournisseurNom!.toLowerCase()) ||
          data.fournisseurNom!.toLowerCase().includes(f.label.toLowerCase())
        );
        if (match) setSelectedFournisseurIds([match.value]);
      }
      setStep("preview");
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message ?? "Erreur lors de l'analyse");
    } finally {
      setLoading(false);
    }
    return false; // prevent auto-upload
  };

  const updateIngredient = (index: number, field: keyof ParsedIngredient, value: any) => {
    setIngredients((prev) => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing));
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { nom: "", stockReception: null, unite: null, prixTotal: null, bio: false, origine: null, allergenes: [] },
    ]);
  };

  const handleConfirm = async () => {
    setStep("confirming");
    setError(null);
    try {
      const resp = await axiosInstance.post(`${API_URL}/invoice-parser/confirm`, {
        numeroPiece: numeroPiece || null,
        dateAchat: dateAchat || null,
        fournisseurNom: preview?.fournisseurNom,
        notes: preview?.notes,
        fournisseurIds: selectedFournisseurIds,
        attachmentId,
        ingredients,
      });
      message.success("Réception créée avec succès !");
      handleClose();
      navigate(`/receptions/${resp.data.id}`);
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message ?? "Erreur lors de la création");
      setStep("preview");
    }
  };

  const columns = [
    {
      title: "Nom",
      dataIndex: "nom",
      key: "nom",
      width: 160,
      render: (v: string, _: any, i: number) => (
        <Input size="small" value={v} onChange={(e) => updateIngredient(i, "nom", e.target.value)} />
      ),
    },
    {
      title: "Qté",
      key: "qte",
      width: 90,
      render: (_: any, r: ParsedIngredient, i: number) => (
        <InputNumber size="small" value={r.stockReception ?? undefined} min={0} step={0.001}
          onChange={(v) => updateIngredient(i, "stockReception", v)} style={{ width: "100%" }} />
      ),
    },
    {
      title: "Unité",
      key: "unite",
      width: 90,
      render: (_: any, r: ParsedIngredient, i: number) => (
        <Select size="small" value={r.unite} allowClear style={{ width: "100%" }}
          options={UNITES.map((u) => ({ value: u, label: u }))}
          onChange={(v) => updateIngredient(i, "unite", v)} />
      ),
    },
    {
      title: "Prix (€)",
      key: "prix",
      width: 90,
      render: (_: any, r: ParsedIngredient, i: number) => (
        <InputNumber size="small" value={r.prixTotal ?? undefined} min={0} step={0.01} prefix="€"
          onChange={(v) => updateIngredient(i, "prixTotal", v)} style={{ width: "100%" }} />
      ),
    },
    {
      title: "Bio",
      key: "bio",
      width: 55,
      render: (_: any, r: ParsedIngredient, i: number) => (
        <Switch size="small" checked={r.bio} onChange={(v) => updateIngredient(i, "bio", v)} />
      ),
    },
    {
      title: "Origine",
      key: "origine",
      width: 100,
      render: (_: any, r: ParsedIngredient, i: number) => (
        <Input size="small" value={r.origine ?? ""} onChange={(e) => updateIngredient(i, "origine", e.target.value || null)} />
      ),
    },
    {
      title: "Allergènes",
      key: "allergenes",
      render: (_: any, r: ParsedIngredient, i: number) => (
        <Select size="small" mode="multiple" value={r.allergenes} style={{ minWidth: 120 }}
          options={ALLERGENES.map((a) => ({ value: a, label: a }))}
          onChange={(v) => updateIngredient(i, "allergenes", v)} />
      ),
    },
    {
      title: "",
      key: "del",
      width: 36,
      render: (_: any, __: any, i: number) => (
        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeIngredient(i)} />
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <Space>
          <FilePdfOutlined style={{ color: "#d4832a" }} />
          <span>Importer une facture PDF</span>
        </Space>
      }
      width={step === "preview" || step === "confirming" ? 1100 : 520}
      footer={
        step === "preview" ? (
          <Space>
            <Button onClick={() => { setStep("upload"); setPreview(null); }}>← Réanalyser</Button>
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleConfirm}
              style={{ background: "#d4832a", borderColor: "#d4832a" }}>
              Créer la réception ({ingredients.length} ingrédient{ingredients.length > 1 ? "s" : ""})
            </Button>
          </Space>
        ) : step === "confirming" ? (
          <Button disabled loading>Création en cours…</Button>
        ) : null
      }
      destroyOnClose
    >
      {error && <Alert type="error" message={error} closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />}

      {step === "upload" && (
        <Spin spinning={loading} tip="Analyse en cours avec Claude AI…">
          <Dragger
            accept=".pdf"
            multiple={false}
            showUploadList={false}
            beforeUpload={handleUpload}
            disabled={loading}
            style={{ padding: "24px 16px" }}
          >
            <p className="ant-upload-drag-icon">
              <FilePdfOutlined style={{ fontSize: 48, color: "#d4832a" }} />
            </p>
            <p className="ant-upload-text">Glissez votre facture PDF ici</p>
            <p className="ant-upload-hint">
              Claude AI va extraire automatiquement les ingrédients, quantités et prix
            </p>
            <Button icon={<UploadOutlined />} style={{ marginTop: 12 }}>
              Choisir un fichier
            </Button>
          </Dragger>
        </Spin>
      )}

      {(step === "preview" || step === "confirming") && preview && (
        <Spin spinning={step === "confirming"} tip="Création de la réception…">
          <Space direction="vertical" style={{ width: "100%" }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <Form.Item label="N° pièce" style={{ marginBottom: 0 }}>
                <Input value={numeroPiece} onChange={(e) => setNumeroPiece(e.target.value)}
                  placeholder="FAC-2024-001" style={{ width: 160 }} />
              </Form.Item>
              <Form.Item label="Date" style={{ marginBottom: 0 }}>
                <Input value={dateAchat} onChange={(e) => setDateAchat(e.target.value)}
                  placeholder="YYYY-MM-DD" style={{ width: 140 }} />
              </Form.Item>
              <Form.Item label="Fournisseur(s)" style={{ marginBottom: 0 }}>
                <Select mode="multiple" value={selectedFournisseurIds}
                  onChange={setSelectedFournisseurIds} options={fournisseurs}
                  placeholder={preview.fournisseurNom ?? "Choisir…"} style={{ minWidth: 200 }} />
              </Form.Item>
              {preview.fournisseurNom && !selectedFournisseurIds.length && (
                <Tag color="orange" icon={<EditOutlined />}>
                  Détecté : {preview.fournisseurNom}
                </Tag>
              )}
            </div>

            <div>
              {s3Saved === true && (
                <Tag icon={<CheckCircleOutlined />} color="success">Facture sauvegardée sur S3</Tag>
              )}
              {s3Saved === false && (
                <Tag icon={<CloseCircleOutlined />} color="default">Facture non sauvegardée (S3 non configuré)</Tag>
              )}
            </div>

            <Divider style={{ margin: "12px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text strong>{ingredients.length} ingrédient{ingredients.length > 1 ? "s" : ""} détecté{ingredients.length > 1 ? "s" : ""}</Text>
              <Button size="small" icon={<PlusOutlined />} onClick={addIngredient}>Ajouter</Button>
            </div>

            <Table
              dataSource={ingredients}
              columns={columns}
              rowKey={(_, i) => String(i)}
              size="small"
              pagination={false}
              scroll={{ x: 900 }}
            />
          </Space>
        </Spin>
      )}
    </Modal>
  );
};
