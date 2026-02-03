import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DataService } from "../../services/DataService";


export const useBlockMutations = () => {
    const queryClient = useQueryClient();

    const addBlock = useMutation({
        mutationFn: DataService.addBlock,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["blocks"] });
        },
    });

    const updateBlock = useMutation({
        mutationFn: DataService.updateBlock,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["blocks"] });
        },
    });

    const deleteBlock = useMutation({
        mutationFn: async ({ id, permanent }: { id: string; permanent?: boolean }) => {
            await DataService.deleteBlock(id, permanent);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["blocks"] });
        },
    });

    const restoreBlock = useMutation({
        mutationFn: DataService.restoreBlock,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["blocks"] });
        },
    });

    return { addBlock, updateBlock, deleteBlock, restoreBlock };
};
