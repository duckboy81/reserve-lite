import React from "react";

interface OfflineIndicatorProps {
  isOnline: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOnline }) => {
  if (isOnline) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white text-center py-2 px-4 shadow-lg z-250">
      <p className="text-sm font-medium">You are currently offline. Some features may be unavailable.</p>
    </div>
  );
};
