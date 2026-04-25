import { useState } from "react";
import { Badge, Button, Card, Input, Popconfirm, Space, Tag, Typography } from "antd";
import { CheckOutlined, ClockCircleOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface Task {
  id: string;
  label: string;
  done: boolean;
  category: "now" | "later";
  createdAt: string;
}

const INITIAL_TASKS: Task[] = [
  { id: "t1", label: "Création de nouveaux équipements pour le relevé de température", done: true, category: "now", createdAt: "2026-04-25" },
  { id: "t2", label: "Pouvoir ajouter de nouveaux types de nettoyage", done: true, category: "now", createdAt: "2026-04-25" },
  { id: "t3", label: "Suppression des relevés (nettoyage et température)", done: true, category: "now", createdAt: "2026-04-25" },
  { id: "t4", label: "Export CSV des données", done: true, category: "now", createdAt: "2026-04-25" },
  { id: "t5", label: "Intégration du brand kit Bizarre OS", done: true, category: "now", createdAt: "2026-04-25" },
  { id: "t6", label: "Migration SQLite — installation sans PostgreSQL", done: true, category: "now", createdAt: "2026-04-25" },
  { id: "t7", label: "Traçabilité réception → ingrédient → menu", done: true, category: "now", createdAt: "2026-04-25" },
  { id: "t8", label: "Changement du nom du restaurant depuis les paramètres", done: true, category: "now", createdAt: "2026-04-25" },
  { id: "t9", label: "Commit git avec README extensif", done: false, category: "now", createdAt: "2026-04-25" },
  { id: "t10", label: "Synchronisation en ligne (solution souveraine, gratuite, 1 utilisateur simultané max)", done: false, category: "later", createdAt: "2026-04-25" },
  { id: "t11", label: "Application Android avec base de données partagée avec l'app ordinateur", done: false, category: "later", createdAt: "2026-04-25" },
  { id: "t12", label: "Gestion des comptes et droits utilisateurs (pour la version mobile)", done: false, category: "later", createdAt: "2026-04-25" },
];

const STORAGE_KEY = "roadmap_tasks";

function loadTasks(): Task[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : INITIAL_TASKS;
  } catch { return INITIAL_TASKS; }
}

function persist(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export const RoadmapPage = () => {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState<"now" | "later">("now");

  const update = (next: Task[]) => { setTasks(next); persist(next); };

  const toggle = (id: string) =>
    update(tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t));

  const remove = (id: string) =>
    update(tasks.filter((t) => t.id !== id));

  const add = () => {
    const label = newLabel.trim();
    if (!label) return;
    const task: Task = {
      id: `t${Date.now()}`,
      label,
      done: false,
      category: newCategory,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    update([...tasks, task]);
    setNewLabel("");
  };

  const nowTasks = tasks.filter((t) => t.category === "now");
  const laterTasks = tasks.filter((t) => t.category === "later");
  const doneCount = nowTasks.filter((t) => t.done).length;

  const renderTask = (task: Task) => (
    <div
      key={task.id}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid #f0f0f0",
        opacity: task.done ? 0.55 : 1,
      }}
    >
      <Button
        type={task.done ? "primary" : "default"}
        shape="circle"
        size="small"
        icon={task.done ? <CheckOutlined /> : <ClockCircleOutlined />}
        onClick={() => toggle(task.id)}
        style={task.done ? { background: "#8b9862", borderColor: "#8b9862" } : {}}
      />
      <Text style={{ flex: 1, textDecoration: task.done ? "line-through" : "none" }}>
        {task.label}
      </Text>
      <Popconfirm title="Supprimer cette tâche ?" okText="Oui" cancelText="Non" onConfirm={() => remove(task.id)}>
        <Button type="text" danger icon={<DeleteOutlined />} size="small" />
      </Popconfirm>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Roadmap</Title>
        <Badge
          count={`${doneCount} / ${nowTasks.length}`}
          style={{ background: "#8b9862" }}
        />
      </div>

      <Card
        title={<><Tag color="blue">En cours</Tag> Priorités actuelles</>}
        style={{ marginBottom: 16 }}
      >
        {nowTasks.map(renderTask)}
        {nowTasks.length === 0 && <Text type="secondary">Aucune tâche en cours.</Text>}
      </Card>

      <Card title={<><Tag color="default">Plus tard</Tag> Backlog</>} style={{ marginBottom: 24 }}>
        {laterTasks.map(renderTask)}
        {laterTasks.length === 0 && <Text type="secondary">Aucune tâche en attente.</Text>}
      </Card>

      <Card title="Ajouter une tâche" size="small">
        <Space.Compact style={{ width: "100%" }}>
          <Button
            onClick={() => setNewCategory(newCategory === "now" ? "later" : "now")}
            style={{ minWidth: 110 }}
          >
            {newCategory === "now" ? "En cours" : "Plus tard"}
          </Button>
          <Input
            placeholder="Nouvelle tâche…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onPressEnter={add}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={add}>Ajouter</Button>
        </Space.Compact>
      </Card>
    </div>
  );
};
