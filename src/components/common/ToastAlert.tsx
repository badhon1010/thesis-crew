import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export interface ToastAlertProps {
  show?: boolean; // Made optional so components using conditional rendering don't throw TS errors
  type: "success" | "error";
  message: string;
  onClose: () => void;
  duration?: number;
}

export const ToastAlert: React.FC<ToastAlertProps> = ({
  show = true,
  type,
  message,
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  // Don't render anything if show is explicitly false
  if (!show) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-[#2A2A2A] dark:bg-[#181818]">
      {type === "success" ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      ) : (
        <AlertCircle className="h-5 w-5 text-red-500" />
      )}
      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
        {message}
      </span>
      <button
        onClick={onClose}
        type="button"
        className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#222222]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};