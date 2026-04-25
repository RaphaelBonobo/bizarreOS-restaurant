import { Button, Space, Typography } from "antd";
import { useTheme } from "../contexts/ThemeContext";
import { useCustom } from "@refinedev/core";
import { API_URL } from "../config";

const { Text } = Typography;

export const Header = () => {
  const { mode, toggleTheme } = useTheme();
  const { query } = useCustom({ url: `${API_URL}/settings`, method: "get" });
  const name = (query.data?.data as any)?.name;
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: 64,
      padding: "0 24px",
      borderBottom: `1px solid ${mode === "dark" ? "#2a2a2a" : "#e8e3d5"}`,
    }}>
      <Text style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: mode === "dark" ? "#e8e8e8" : "#4a3c1f",
      }}>
        {name || ""}
      </Text>
      <Space>
        <Button
          size="small"
          onClick={toggleTheme}
          style={{
            borderColor: mode === "dark" ? "#434343" : "#d4c9a0",
            color: mode === "dark" ? "#a8a8a8" : "#7a6540",
            background: "transparent",
          }}
        >
          {mode === "dark" ? "☀ Clair" : "☽ Sombre"}
        </Button>
      </Space>
    </div>
  );
};
