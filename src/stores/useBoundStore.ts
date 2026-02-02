import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

import { createConfigSlice, ConfigSlice } from "./slices/createConfigSlice";
import { createAuthSlice, AuthSlice } from "./slices/createAuthSlice";
import { createUISlice, UISlice } from "./slices/createUISlice";
import { createScheduleSlice, ScheduleSlice } from "./slices/createScheduleSlice";

export const useBoundStore = create<
    ConfigSlice & AuthSlice & UISlice & ScheduleSlice
>()(
    devtools(
        persist(
            (...a) => ({
                ...createConfigSlice(...a),
                ...createAuthSlice(...a),
                ...createUISlice(...a),
                ...createScheduleSlice(...a),
            }),
            {
                name: "reserve-lite-storage",
                partialize: (state) => ({
                    config: state.config,
                    hasConfigured: state.hasConfigured,
                    user: state.user,
                    activeBlockId: state.activeBlockId
                }),
            }
        )
    )
);
