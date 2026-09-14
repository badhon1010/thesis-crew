import { useRef, useState, useEffect, useMemo } from "react";
import {
  X,
  Upload,
  Link as LinkIcon,
  FileText,
  Loader2,
  BookOpen,
  Database,
  Code2,
  Presentation,
  Paperclip,
  Image as ImageIcon,
  FileArchive,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";

type DocumentType = "paper" | "dataset" | "code" | "presentation" | "other";

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    type: string;
    url: string;
    file: File | null;
    isLink: boolean;
  }) => Promise<void>;
}

const DOCUMENT_TYPES: {
  value: DocumentType;
  label: string;
  icon: React.ElementType;
  activeClass: string;
}[] = [
  {
    value: "paper",
    label: "Paper",
    icon: BookOpen,
    activeClass: "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  },
  {
    value: "dataset",
    label: "Dataset",
    icon: Database,
    activeClass: "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  },
  {
    value: "code",
    label: "Code",
    icon: Code2,
    activeClass: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  {
    value: "presentation",
    label: "Slides",
    icon: Presentation,
    activeClass: "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
  {
    value: "other",
    label: "Other",
    icon: Paperclip,
    activeClass: "border-slate-500 bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
  },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconForFile(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return ImageIcon;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return FileArchive;
  if (["csv", "xlsx", "xls"].includes(ext)) return FileSpreadsheet;
  if (["js", "ts", "tsx", "jsx", "py", "java", "cpp", "c", "go", "rb"].includes(ext)) return Code2;
  return FileText;
}

export function DocumentModal({ isOpen, onClose, onSave }: DocumentModalProps) {
  const [isLink, setIsLink] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("paper");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setIsLink(false);
    setTitle("");
    setType("paper");
    setUrl("");
    setFile(null);
    setIsDragging(false);
    setIsSaving(false);
    setError(null);
  };

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  const FileIcon = useMemo(() => (file ? iconForFile(file.name) : Upload), [file]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (!title) setTitle(droppedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) return setError("Give this resource a title.");
    if (isLink && !url.trim()) return setError("Paste a URL to share.");
    if (!isLink && !file) return setError("Select or drop a file to upload.");

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        type,
        url: isLink ? url.trim() : "",
        file: isLink ? null : file,
        isLink,
      });
      resetForm();
      onClose();
    } catch (err) {
      console.error("DocumentModal: save failed", err);
      setError(err instanceof Error ? err.message : "Couldn't save this resource. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#2A2A2A] dark:bg-[#181818]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              <Paperclip className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Add a resource</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Share a file or a link with your group</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {/* Segmented control */}
          <div className="relative mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
            <div
              className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-sm transition-transform duration-200 ease-out dark:bg-[#181818] ${
                isLink ? "translate-x-[calc(100%+8px)]" : "translate-x-0"
              }`}
            />
            <button
              type="button"
              onClick={() => setIsLink(false)}
              className={`relative z-10 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${
                !isLink ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Upload className="h-4 w-4" /> Upload file
            </button>
            <button
              type="button"
              onClick={() => setIsLink(true)}
              className={`relative z-10 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${
                isLink ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <LinkIcon className="h-4 w-4" /> Share link
            </button>
          </div>

          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Literature Review Draft"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-[#2A2A2A] dark:bg-[#111111] dark:text-white"
              />
            </div>

            {/* Type chips */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Resource type
              </label>
              <div className="flex flex-wrap gap-2">
                {DOCUMENT_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? t.activeClass
                          : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-[#2A2A2A] dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Link or File input */}
            {isLink ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  URL
                </label>
                <div className="relative">
                  <LinkIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-[#2A2A2A] dark:bg-[#111111] dark:text-white"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  File
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-all ${
                    isDragging
                      ? "scale-[1.01] border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                      : file
                      ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-500/5"
                      : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 dark:border-[#2A2A2A] dark:hover:bg-slate-800/30"
                  }`}
                >
                  <input ref={fileInputRef} type="file" onChange={handleFileInputChange} className="hidden" />
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                      file
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-500 dark:bg-slate-800 dark:group-hover:bg-indigo-500/15"
                    }`}
                  >
                    {file ? <CheckCircle2 className="h-6 w-6" /> : <FileIcon className="h-6 w-6" />}
                  </div>
                  {file ? (
                    <>
                      <p className="mt-3 max-w-[85%] truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {file.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {formatBytes(file.size)} &middot; click or drop to replace
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                        Drag a file here, or click to browse
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">PDF, code, datasets, slides — up to 10 MB</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-[#2A2A2A]">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-[#2A2A2A] dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save document"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
