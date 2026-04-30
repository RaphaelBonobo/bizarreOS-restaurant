import { useState } from "react";
import { useMenu } from "@refinedev/core";
import { Layout, Menu } from "antd";
import type { MenuProps } from "antd";
import { useNavigate } from "react-router";
import { Pastille } from "./Logo/Logo";
import { useTheme } from "../contexts/ThemeContext";

const SIDER_WIDTH    = 220;
const COLLAPSED_WIDTH = 56;

function buildItems(
  items: ReturnType<typeof useMenu>["menuItems"],
  navigate: (path: string) => void,
): MenuProps["items"] {
  return items.map((item) => ({
    key: item.key,
    icon: (
      <span style={{ fontSize: 17, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {item.meta?.icon as string}
      </span>
    ),
    label: item.label,
    children: item.children?.length ? buildItems(item.children, navigate) : undefined,
    onClick: item.route ? () => navigate(item.route!) : undefined,
  }));
}

export function CustomSider() {
  const [collapsed, setCollapsed] = useState(false);
  const { menuItems, selectedKey, defaultOpenKeys } = useMenu();
  const navigate = useNavigate();
  const { mode }  = useTheme();

  const bg = mode === "dark" ? "#1f1f1f" : "#faf7ef";
  const textMain = mode === "dark" ? "#e8e8e8" : "#4a3c1f";
  const textMuted = mode === "dark" ? "#a8a8a8" : "#6b5c3d";

  return (
    <Layout.Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      width={SIDER_WIDTH}
      collapsedWidth={COLLAPSED_WIDTH}
      style={{
        background: bg,
        borderRight: "1px solid rgba(201, 169, 97, 0.15)",
        overflow: "auto",
        height: "100vh",
        position: "sticky",
        top: 0,
        left: 0,
      }}
    >
      {/* Logo */}
      <div style={{
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        padding: collapsed ? 0 : "0 14px",
        gap: 10,
        overflow: "hidden",
        transition: "padding 0.2s",
      }}>
        <Pastille size={32} dark={mode === "dark"} />
        {!collapsed && (
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.3, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: textMain }}>Bizarre OS</span>
            <span style={{ fontSize: 10, color: textMuted }}>Restaurant Edition</span>
          </span>
        )}
      </div>

      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={defaultOpenKeys}
        inlineCollapsed={collapsed}
        items={buildItems(menuItems, navigate)}
        style={{ background: "transparent", border: "none" }}
      />
    </Layout.Sider>
  );
}
