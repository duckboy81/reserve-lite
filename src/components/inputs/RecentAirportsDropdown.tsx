import React from 'react';
import { X } from 'lucide-react';

interface RecentAirportsDropdownProps {
    recentAirports: string[];
    onSelect: (code: string) => void;
    onRemove: (code: string) => void;
}

const RecentAirportsDropdown: React.FC<RecentAirportsDropdownProps> = ({ recentAirports, onSelect, onRemove }) => {
    if (recentAirports.length === 0) return null;

    return (
        <div className="absolute top-full left-0 w-full bg-white border shadow-lg z-50 max-h-32 overflow-y-auto rounded-b">
            <div className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-1">RECENT</div>
            {recentAirports.map(code => (
                <div key={code} className="flex justify-between items-center px-2 py-1 hover:bg-indigo-50 cursor-pointer">
                    <span onClick={() => onSelect(code)} className="flex-1 text-xs font-bold">{code}</span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(code);
                        }}
                        className="text-gray-300 hover:text-red-500"
                    >
                        <X size={10} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default RecentAirportsDropdown;
