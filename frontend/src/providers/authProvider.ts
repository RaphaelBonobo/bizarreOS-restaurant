import { AuthProvider } from "@refinedev/core";

// Application desktop — authentification transparente
export const authProvider: AuthProvider = {
  login: async () => ({ success: true, redirectTo: "/" }),
  logout: async () => ({ success: true, redirectTo: "/" }),
  check: async () => ({ authenticated: true }),
  getPermissions: async () => "ADMIN",
  getIdentity: async () => ({ id: "desktop", name: "Utilisateur local", email: "local@restaurant" }),
  onError: async (error) => ({ error }),
};
