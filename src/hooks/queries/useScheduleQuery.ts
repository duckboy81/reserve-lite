import { useQuery } from "@tanstack/react-query";
import { DataService } from "../../services/DataService";

export function useScheduleQuery() {
    return useQuery({
        queryKey: ["schedule"],
        queryFn: async () => await DataService.getSchedule(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
