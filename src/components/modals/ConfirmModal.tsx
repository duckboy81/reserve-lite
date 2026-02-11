import { X, AlertTriangle } from "lucide-react";

// export type ConfirmType = "commit" | "discard" | "logout" | "paste" | null;
export type ConfirmType = "commit" | "discard" | "logout" | null;

interface ConfirmModalProps {
  isOpen: boolean;
  type: ConfirmType;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  type,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !type) return null;

  let title = "";
  let message = "";
  let confirmText = "Confirm";
  let confirmColor = "bg-red-600";

  switch (type) {
    case "commit":
      title = "Save Changes?";
      message = "This will overwrite your existing schedule. Are you sure?";
      confirmText = "Save";
      confirmColor = "bg-green-600";
      break;
    case "discard":
      title = "Discard Changes?";
      message = "All unsaved changes in this session will be lost. Are you sure?";
      confirmText = "Discard";
      confirmColor = "bg-red-600";
      break;
    case "logout":
      title = "Confirm Logout";
      message = "Are you sure you want to log out?";
      confirmText = "Logout";
      confirmColor = "bg-red-600";
      break;
    // case "paste":
    //   title = "Overwrite Plan?";
    //   message = "This hour already has a plan. Overwrite it?";
    //   confirmText = "Overwrite";
    //   confirmColor = "bg-indigo-600";
    //   break;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg flex items-center gap-2 text-gray-800">
            <AlertTriangle
              size={20}
              className={
                confirmColor === "bg-green-600" || confirmColor === "bg-indigo-600"
                  ? "text-indigo-600"
                  : "text-red-600"
              }
            />
            {title}
          </h3>
          <button onClick={onCancel}>
            <X size={20} className="text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        <div className="p-6 text-gray-700">{message}</div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 font-bold text-gray-600 hover:bg-gray-200 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 font-bold ${confirmColor} text-white rounded hover:opacity-90 shadow-md transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
