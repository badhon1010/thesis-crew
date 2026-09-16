import { useState } from "react";
import { Upload, FileText, CheckCircle2, Link2, Sparkles, AlertCircle, Loader2 } from "lucide-react";

export function SubmissionForm() {
  const [submissionType, setSubmissionType] = useState<"link" | "file">("file");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage(true);
      setTitle("");
      setLink("");
      setFile(null);

      setTimeout(() => setSuccessMessage(false), 4000);
    }, 1000);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-[#2A2A2A] dark:bg-[#181818]">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500" />

      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center dark:border-[#2A2A2A]">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Student Thesis & Project Submission</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Submit your project proposal, thesis manuscript, or design documentation.</p>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-[#121212]">
          <button
            type="button"
            onClick={() => setSubmissionType("file")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              submissionType === "file" ? "bg-white text-slate-900 shadow-sm dark:bg-[#282828] dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            <Upload className="h-3.5 w-3.5" /> File Upload
          </button>
          <button
            type="button"
            onClick={() => setSubmissionType("link")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              submissionType === "link" ? "bg-white text-slate-900 shadow-sm dark:bg-[#282828] dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            <Link2 className="h-3.5 w-3.5" /> Web Link
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Your work has been successfully submitted and timestamped!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Project / Thesis Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., StaySphere: Smart Housing & Roommate Matching Platform"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-[#121212] dark:text-white dark:focus:border-blue-500"
          />
        </div>

        {submissionType === "file" ? (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Download / Upload Document</label>
            <div className="relative flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 px-4 py-5 text-center transition-all hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700">
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
              />
              {file ? (
                <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                  <FileText className="h-6 w-6" />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{file.name}</p>
                    <p className="text-[10px] text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB • Ready</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-[#222222] dark:text-slate-400">
                    <Upload className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    <span className="text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop file
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">PDF, DOCX, or ZIP up to 25MB</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Document / Drive URL</label>
            <input
              type="url"
              required
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-[#121212] dark:text-white dark:focus:border-blue-500"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Submissions are final upon upload.</span>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 dark:bg-[#3B82F6] dark:hover:bg-blue-500"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
              </>
            ) : (
              "Submit Work"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}