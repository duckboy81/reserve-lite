import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryChannel, SyncMessage } from '../utils/querySync';

export const useCrossTabSync = () => {
    const queryClient = useQueryClient();

    useEffect(() => {
        const handleMessage = (event: MessageEvent<SyncMessage>) => {
            const { type, queryKey } = event.data;

            if (type === 'INVALIDATE') {
                // Invalidate the query to trigger a refetch from IndexedDB
                queryClient.invalidateQueries({ queryKey });
            }
        };

        queryChannel.addEventListener('message', handleMessage);

        return () => {
            queryChannel.removeEventListener('message', handleMessage);
        };
    }, [queryClient]);
};
