import { StateCreator } from "zustand";
import { User } from "../../types";
import { AuthService } from "../../services/AuthService";

export interface AuthSlice {
    user: User | null;
    setUser: (user: User | null) => void;
    logout: () => void;
    initializeAuth: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
    user: null,
    setUser: (user) => set({ user }),
    logout: () => {
        AuthService.logout();
        set({ user: null });
    },
    initializeAuth: async () => {
        const token = await AuthService.getToken();
        if (!token) return;

        const authStr = localStorage.getItem("alpa_auth");
        if (!authStr) return;

        try {
            const parsed = JSON.parse(authStr);
            if (parsed && parsed.userInfo) {
                set({ user: parsed.userInfo });
            }
        } catch (e) {
            console.error("Failed to parse auth info", e);
        }
    },
});
