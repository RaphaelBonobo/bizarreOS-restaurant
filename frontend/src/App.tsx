import { Refine } from "@refinedev/core";
import { useNotificationProvider, ThemedLayout, ThemedSider } from "@refinedev/antd";
import { ConfigProvider, App as AntdApp, theme } from "antd";
import frFR from "antd/locale/fr_FR";
import routerBindings, { NavigateToResource, UnsavedChangesNotifier } from "@refinedev/react-router";
import { BrowserRouter, Route, Routes, Outlet } from "react-router";
import { dataProvider } from "./providers/dataProvider";
import { authProvider } from "./providers/authProvider";
import { i18nProvider } from "./providers/i18nProvider";
import "@refinedev/antd/dist/reset.css";
import "./styles/custom.css";

import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { Header } from "./components/Header";
import { Logo } from "./components/Logo/Logo";
import { Dashboard } from "./pages/dashboard";
import { MenuList, MenuShow, MenuCreate, MenuEdit } from "./pages/menus";
import { IngredientList, IngredientShow, IngredientCreate, IngredientEdit } from "./pages/ingredients";
import { FournisseurList, FournisseurShow, FournisseurCreate, FournisseurEdit } from "./pages/fournisseurs";
import { ReceptionList, ReceptionShow, ReceptionCreate } from "./pages/receptions";
import { NettoyagePage, TemperaturePage } from "./pages/haccp";
import { SettingsPage } from "./pages/settings";
import { RoadmapPage } from "./pages/roadmap";

function SiderTitle() {
  const { mode } = useTheme();
  return (
    <div style={{ padding: "8px 10px 12px" }}>
      <Logo
        product="menu"
        size={36}
        dark={mode === "dark"}
        tagline="Restaurant Edition"
      />
    </div>
  );
}

function AppContent() {
  const { mode } = useTheme();

  return (
    <ConfigProvider
      locale={frFR}
      theme={{
        algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#c9a961",
          colorBgBase: mode === "dark" ? "#1f1f1f" : "#f8f5eb",
          colorBgContainer: mode === "dark" ? "#2a2a2a" : "#ffffff",
          colorBgElevated: mode === "dark" ? "#333333" : "#ffffff",
          colorBgLayout: mode === "dark" ? "#141414" : "#faf7ef",
          colorText: mode === "dark" ? "#e8e8e8" : "#4a3c1f",
          colorTextSecondary: mode === "dark" ? "#a8a8a8" : "#6b5c3d",
          colorBorder: mode === "dark" ? "#434343" : "#e0ddd0",
          colorSuccess: "#8b9862",
          colorWarning: "#d9a44a",
          colorError: "#c46a5c",
          colorLink: "#b8954f",
          borderRadius: 8,
          borderRadiusLG: 12,
          borderRadiusSM: 6,
          fontFamily: "'Kumbh Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: 14,
        },
        components: {
          Layout: {
            headerBg: mode === "dark" ? "#1f1f1f" : "#faf7ef",
            headerHeight: 64,
            siderBg: mode === "dark" ? "#1f1f1f" : "#faf7ef",
            bodyBg: mode === "dark" ? "#141414" : "#f8f5eb",
          },
          Menu: {
            itemBg: "transparent",
            itemSelectedBg: mode === "dark" ? "rgba(201,169,97,0.2)" : "rgba(201,169,97,0.15)",
            itemHoverBg: mode === "dark" ? "rgba(201,169,97,0.1)" : "rgba(201,169,97,0.08)",
            itemSelectedColor: mode === "dark" ? "#d4b578" : "#9d7d3e",
            itemColor: mode === "dark" ? "#a8a8a8" : "#6b5c3d",
          },
          Table: {
            headerBg: mode === "dark" ? "#2a2a2a" : "#f5f2e8",
            headerColor: mode === "dark" ? "#e8e8e8" : "#4a3c1f",
            rowHoverBg: mode === "dark" ? "rgba(201,169,97,0.1)" : "rgba(201,169,97,0.08)",
          },
        },
      }}
    >
      <AntdApp>
        <Refine
          dataProvider={dataProvider}
          authProvider={authProvider}
          i18nProvider={i18nProvider}
          notificationProvider={useNotificationProvider}
          routerProvider={routerBindings}
          resources={[
            {
              name: "dashboard",
              list: "/",
              meta: { label: "Tableau de bord", icon: "📊" },
            },
            {
              name: "menus",
              list: "/menus",
              show: "/menus/:id",
              create: "/menus/create",
              edit: "/menus/:id/edit",
              meta: { label: "Menus", icon: "🍽️" },
            },
            {
              name: "ingredients",
              list: "/ingredients",
              show: "/ingredients/:id",
              create: "/ingredients/create",
              edit: "/ingredients/:id/edit",
              meta: { label: "Ingrédients", icon: "🥕" },
            },
            {
              name: "fournisseurs",
              list: "/fournisseurs",
              show: "/fournisseurs/:id",
              create: "/fournisseurs/create",
              edit: "/fournisseurs/:id/edit",
              meta: { label: "Fournisseurs", icon: "🏪" },
            },
            {
              name: "receptions",
              list: "/receptions",
              show: "/receptions/:id",
              create: "/receptions/create",
              meta: { label: "Réceptions", icon: "📥" },
            },
            {
              name: "nettoyages",
              list: "/haccp/nettoyages",
              meta: { label: "Nettoyages", icon: "🧹", parent: "haccp" },
            },
            {
              name: "temperatures",
              list: "/haccp/temperatures",
              meta: { label: "Températures", icon: "🌡️", parent: "haccp" },
            },
            {
              name: "haccp",
              meta: { label: "HACCP", icon: "✅" },
            },
            {
              name: "settings",
              list: "/settings",
              meta: { label: "Paramètres", icon: "⚙️" },
            },
            {
              name: "roadmap",
              list: "/roadmap",
              meta: { label: "Roadmap", icon: "🗺️" },
            },
          ]}
          options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}
        >
          <Routes>
            <Route
              element={
                <ThemedLayout
                  Header={() => <Header />}
                  Sider={(props) => (
                    <ThemedSider
                      {...props}
                      Title={() => <SiderTitle />}
                    />
                  )}
                >
                  <Outlet />
                </ThemedLayout>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="/menus">
                <Route index element={<MenuList />} />
                <Route path="create" element={<MenuCreate />} />
                <Route path=":id" element={<MenuShow />} />
                <Route path=":id/edit" element={<MenuEdit />} />
              </Route>
              <Route path="/ingredients">
                <Route index element={<IngredientList />} />
                <Route path="create" element={<IngredientCreate />} />
                <Route path=":id" element={<IngredientShow />} />
                <Route path=":id/edit" element={<IngredientEdit />} />
              </Route>
              <Route path="/fournisseurs">
                <Route index element={<FournisseurList />} />
                <Route path="create" element={<FournisseurCreate />} />
                <Route path=":id" element={<FournisseurShow />} />
                <Route path=":id/edit" element={<FournisseurEdit />} />
              </Route>
              <Route path="/receptions">
                <Route index element={<ReceptionList />} />
                <Route path="create" element={<ReceptionCreate />} />
                <Route path=":id" element={<ReceptionShow />} />
              </Route>
              <Route path="/haccp/nettoyages" element={<NettoyagePage />} />
              <Route path="/haccp/temperatures" element={<TemperaturePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/roadmap" element={<RoadmapPage />} />
            </Route>
            <Route path="*" element={<NavigateToResource resource="dashboard" />} />
          </Routes>
          <UnsavedChangesNotifier />
        </Refine>
      </AntdApp>
    </ConfigProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
