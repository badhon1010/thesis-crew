import { useState } from "react";
import { X, MessageSquareX, Loader2 } from "lucide-react";

interface RejectRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (feedback: string) => Promise<void>;
  studentName: string;
}

export function RejectRequestModal({ isOpen, onClose, onConfirm, studentName }: RejectRequestModalProps) {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm(feedback.trim());
      setFeedback("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={() => !isSubmitting && onClose()} 
      />
      
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl transition-all dark:bg-[#121212] dark:ring-1 dark:ring-white/10 sm:my-8 sm:max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10">
              <MessageSquareX className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Reject Request</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500 disabled:opacity-50 dark:hover:bg-white/5 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            You are about to reject the application from <span className="font-semibold text-slate-900 dark:text-white">{studentName}</span>. 
            You can optionally provide a reason for the rejection, which will be visible to the student.
          </p>

          <div className="mt-5">
            <label htmlFor="feedback" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Rejection Reason <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="feedback"
              rows={4}
              className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:focus:border-rose-400 dark:focus:ring-rose-400/10"
              placeholder="e.g., Unfortunately, we are looking for someone with more experience in React..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 bg-slate-50 px-6 py-4 dark:bg-[#181818] sm:flex-row sm:justify-end">
          <button
            type="button"
            className="inline-flex w-full justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/10 sm:w-auto"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50 dark:hover:bg-rose-500 sm:w-auto"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
}
