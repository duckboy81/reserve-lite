import { useQuery } from "@tanstack/react-query";
import { DataService } from "../../services/DataService";

export function useBlocksQuery() {
    return useQuery({
        queryKey: ["blocks"],
        queryFn: async () => {
            const blocks = await DataService.getBlocks();
            return blocks; // DataService already sorts them
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
