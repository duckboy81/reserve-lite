import React from 'react';

interface StatusDotProps {
  status?: string;
  details?: {
    scheduledDate: string;
    estimatedDate?: string;
    actualDate?: string;
  };
}

const StatusDot: React.FC<StatusDotProps> = ({ status, details }) => {
  let color = 'bg-gray-300';
  let title = status || 'Unknown';
  if (status === 'Cancelled') color = 'bg-red-500';
  else if (details && (details.estimatedDate || details.actualDate)) {
    const sched = new Date(details.scheduledDate).getTime();
    const est = new Date(details.estimatedDate || details.actualDate || '').getTime();
    const diffMins = Math.floor((est - sched) / 60000);
    if (diffMins > 30) color = 'bg-orange-500';
    else if (diffMins > 0) color = 'bg-yellow-400';
    else color = 'bg-green-500';
    title = `${status} (${diffMins > 0 ? '+' + diffMins + 'm' : 'On Time'})`;
  } else if (status === 'Scheduled' || status === 'On Time') color = 'bg-green-500';
  return <div className={`w-2 h-2 rounded-full ${color} shrink-0`} title={title} />;
};

export default StatusDot;
