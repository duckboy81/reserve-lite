import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DataService } from "../../services/DataService";
import { ScheduleData } from "../../types";
import { useBoundStore } from "../../stores/useBoundStore";

export function useScheduleMutations() {
    const queryClient = useQueryClient();
    const executeCommit = useBoundStore((state) => state.executeCommit);

    const saveMutation = useMutation({
        mutationFn: async (newData: ScheduleData) => {
            await DataService.saveScheduleData(newData);
        },
        onSuccess: () => {
            // 1. Invalidate Server State
            queryClient.invalidateQueries({ queryKey: ["schedule"] });
            // 2. Clear Client Staging
            executeCommit();
        },
    });

    return { saveMutation };
}
