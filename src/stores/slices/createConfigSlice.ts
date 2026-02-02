import { StateCreator } from "zustand";
import { Config } from "../../types";
import { DEFAULT_CONFIG } from "../../config/constants";

export interface ConfigSlice {
    config: Config;
    hasConfigured: boolean;
    setConfig: (config: Config) => void;
    setHasConfigured: (hasConfigured: boolean) => void;
}

export const createConfigSlice: StateCreator<ConfigSlice> = (set) => ({
    config: DEFAULT_CONFIG,
    hasConfigured: false,
    setConfig: (config) => set({ config }),
    setHasConfigured: (hasConfigured) => set({ hasConfigured }),
});
