import { useQuery } from "@tanstack/react-query";
import { DataService } from "../../services/DataService";

export function useBlocksQuery() {
    return useQuery({
        queryKey: ["blocks"],
        queryFn: async () => await DataService.getBlocks(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
