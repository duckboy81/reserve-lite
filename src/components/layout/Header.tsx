import { Plane, RefreshCw, LogOut, Edit3, Save, Undo, Redo, Settings } from "lucide-react";
import { Config, ReserveBlock, ScheduleData, User, RowData, Option } from "../../types";

interface HeaderProps {
    isEditMode: boolean;
    airport: string;
    setAirport: (code: string) => void;
    activeBlock: ReserveBlock | undefined;
    config: Config;
    setModals: (modals: any) => void;
    enterEditMode: () => void;
    handleGlobalRefresh: () => void;
    loading: boolean;
    handleUndo: () => void;
    handleRedo: () => void;
    history: ScheduleData[];
    future: ScheduleData[];
    setConfirmModal: (modal: { isOpen: boolean; type: "commit" | "discard" | "logout" | "paste" | null }) => void;
    user: User | null;
    executeGuestLogin: () => void;
    onSave: () => void;
}

export default function Header({
    isEditMode,
    airport,
    setAirport,
    activeBlock,
    config,
    setModals,
    enterEditMode,
    handleGlobalRefresh,
    loading,
    handleUndo,
    handleRedo,
    history,
    future,
    setConfirmModal,
    user,
    executeGuestLogin,
    onSave,
}: HeaderProps) {
    return (
        <div
            className={`sticky top-0 z-100 border-b shadow-sm transition-colors ${isEditMode ? "bg-yellow-50 border-yellow-200" : "bg-white border-gray-200"
                }`}
        >
            {isEditMode && (
                <div className="bg-yellow-400 text-yellow-900 text-xs font-bold text-center py-0.5">
                    EDITING MODE — Unsaved Changes
                </div>
            )}
            <div className="max-w-6xl mx-auto px-4 py-2">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-600 text-white p-1 rounded">
                            <Plane size={16} />
                        </div>
                        <span className="font-bold text-sm tracking-tight hidden sm:inline">
                            Reserve<span className="text-indigo-600">Lite</span>
                        </span>
                        <div className="h-4 w-px bg-gray-300 mx-2"></div>
                        <div className="flex bg-gray-100 p-0.5 rounded-lg">
                            {["LAX", "ONT", "SNA", "BUR"].map((code) => (
                                <button
                                    key={code}
                                    onClick={() => setAirport(code)}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${airport === code ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    {code}
                                </button>
                            ))}
                        </div>
                    </div>

                    {activeBlock && (
                        <button
                            onClick={() => setModals((prev: any) => ({ ...prev, blocks: true }))}
                            className="flex flex-col items-center hover:bg-gray-50 px-2 rounded transition-colors group"
                        >
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide group-hover:text-indigo-500">
                                Active Block
                            </span>
                            <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                                {new Date(activeBlock.start).toLocaleDateString(undefined, { month: "short", day: "numeric" })} -{" "}
                                {new Date(activeBlock.end).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                <span className="bg-indigo-50 px-1 rounded ml-1 border border-indigo-100">
                                    {activeBlock.homeBase || config.homeBase}
                                </span>
                            </span>
                        </button>
                    )}

                    <div className="flex items-center gap-2">
                        {!isEditMode ? (
                            <>
                                <button
                                    onClick={enterEditMode}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full font-bold text-xs hover:bg-blue-100 transition-colors"
                                >
                                    <Edit3 size={14} /> Edit Plan
                                </button>
                                <div className="h-4 w-px bg-gray-300 mx-1"></div>
                                <button
                                    onClick={handleGlobalRefresh}
                                    className={`p-2 rounded-full hover:bg-gray-100 text-gray-500 ${loading ? "animate-spin" : ""}`}
                                    title="Refresh All Flights"
                                >
                                    <RefreshCw size={16} />
                                </button>
                                <button
                                    onClick={() => setModals((prev: any) => ({ ...prev, config: true }))}
                                    className="p-2 text-gray-400 hover:text-gray-600"
                                >
                                    <Settings size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleUndo}
                                    disabled={history.length === 0}
                                    className="p-2 text-gray-500 disabled:opacity-30 hover:bg-gray-200 rounded-full"
                                >
                                    <Undo size={16} />
                                </button>
                                <button
                                    onClick={handleRedo}
                                    disabled={future.length === 0}
                                    className="p-2 text-gray-500 disabled:opacity-30 hover:bg-gray-200 rounded-full"
                                >
                                    <Redo size={16} />
                                </button>
                                <div className="h-4 w-px bg-gray-300 mx-1"></div>
                                <button
                                    onClick={() => setConfirmModal({ isOpen: true, type: "discard" })}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-600 rounded-full font-bold text-xs hover:bg-gray-300"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={onSave}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-full font-bold text-xs hover:bg-green-700 shadow-sm"
                                >
                                    <Save size={14} /> Save
                                </button>
                            </>
                        )}
                        {user?.id === "GUEST" ? (
                            <button
                                onClick={executeGuestLogin}
                                className="bg-indigo-600 text-white px-3 py-1.5 rounded-full font-bold text-xs hover:bg-indigo-700 ml-2 shadow-sm"
                            >
                                Log In
                            </button>
                        ) : (
                            <button
                                onClick={() => setConfirmModal({ isOpen: true, type: "logout" })}
                                className="p-2 rounded-full hover:bg-red-50 text-red-500 ml-2"
                                title="Logout"
                            >
                                <LogOut size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
