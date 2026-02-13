import { API_CONFIG } from "../config/constants";

export const AuthService = {
  login: async (alpaId?: string, password?: string) => {
    try {
      alpaId ??= localStorage.getItem("saved_id") ?? undefined;
      password ??= localStorage.getItem("saved_pass") ?? undefined;
    } catch (error) {
      console.error("Failed to read saved credentials", error);
    } finally {
      if (alpaId === undefined || password === undefined) {
        // noinspection ThrowInsideFinallyBlockJS
        throw new Error("No saved credentials found. Please login again.");
      }
    }

    try {
      const response = await fetch(API_CONFIG.AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ AlpaId: alpaId, Domain: "ALPA2k", Password: password }),
      });
      if (!response.ok) {
        // noinspection ExceptionCaughtLocallyJS
        throw new Error("Login failed");
      }
      const data = await response.json();
      const tokenData = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
        userInfo: data.user_info,
      };
      localStorage.setItem("alpa_auth", JSON.stringify(tokenData));
      return tokenData;
    } catch (error) {
      console.error("Auth Error:", error);
      throw error;
    }
  },
  getToken: async (): Promise<string | null> => {
    const stored = localStorage.getItem("alpa_auth");
    if (stored) {
      const data = JSON.parse(stored);
      if (Date.now() < data.expiresAt) {
        return data.token;
      }
    }

    // Attempt silent refresh
    try {
      console.log("Token expired or missing, attempting silent refresh...");
      const tokenData = await AuthService.login();
      if (tokenData) {
        return tokenData.token;
      }
    } catch (e) {
      console.error("Silent refresh failed", e);
    }

    localStorage.removeItem("alpa_auth");
    return null;
  },
  logout: () => {
    localStorage.removeItem("alpa_auth");
    localStorage.removeItem("guest_mode");
    // window.location.reload(); // Removed to preserve state
  },
  setGuestMode: () => {
    localStorage.setItem("guest_mode", "true");
  },
  clearGuestMode: () => {
    localStorage.removeItem("guest_mode");
    // Do not reload, let App handle state
  },
  isGuest: (): boolean => {
    return localStorage.getItem("guest_mode") === "true";
  },
  isAuthenticated: async (): Promise<boolean> => {
    const token = await AuthService.getToken();
    const guest = AuthService.isGuest();
    return !!token || guest;
  },
};
