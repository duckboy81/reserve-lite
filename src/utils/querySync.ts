export const queryChannel = new BroadcastChannel('reserve_lite_sync');

export type SyncMessage = {
    type: 'INVALIDATE';
    queryKey: string[];
};

export const sendInvalidationSignal = (queryKey: string[]) => {
    queryChannel.postMessage({ type: 'INVALIDATE', queryKey } as SyncMessage);
};
