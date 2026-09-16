import { useState, useEffect } from "react";
import { X, BookOpen, Loader2 } from "lucide-react";

interface Publication {
  id: string;
  title: string;
  venue: string;
  type: "conference" | "journal" | "workshop" | "preprint";
  status: "draft" | "submitted" | "under-review" | "accepted" | "published" | "rejected";
  submissionDate?: string;
  acceptanceDate?: string;
  publicationDate?: string;
  doi?: string;
  paperUrl?: string;
  createdAt?: unknown;
}

interface PublicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Publication, "id" | "createdAt">) => Promise<void>;
  publication?: Publication | null;
}

export function PublicationModal({ isOpen, onClose, onSave, publication }: PublicationModalProps) {
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [type, setType] = useState<Publication["type"]>("conference");
  const [status, setStatus] = useState<Publication["status"]>("draft");
  const [submissionDate, setSubmissionDate] = useState("");
  const [acceptanceDate, setAcceptanceDate] = useState("");
  const [publicationDate, setPublicationDate] = useState("");
  const [doi, setDoi] = useState("");
  const [paperUrl, setPaperUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (publication && isOpen) {
      setTitle(publication.title);
      setVenue(publication.venue);
      setType(publication.type);
      setStatus(publication.status);
      setSubmissionDate(publication.submissionDate || "");
      setAcceptanceDate(publication.acceptanceDate || "");
      setPublicationDate(publication.publicationDate || "");
      setDoi(publication.doi || "");
      setPaperUrl(publication.paperUrl || "");
    } else if (isOpen) {
      setTitle("");
      setVenue("");
      setType("conference");
      setStatus("draft");
      setSubmissionDate("");
      setAcceptanceDate("");
      setPublicationDate("");
      setDoi("");
      setPaperUrl("");
      setError("");
    }
  }, [publication, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !venue.trim()) {
      setError("Title and venue are required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      
      const payload: Omit<Publication, "id" | "createdAt"> = {
        title: title.trim(),
        venue: venue.trim(),
        type,
        status,
      };

      if (submissionDate) payload.submissionDate = submissionDate;
      if (acceptanceDate) payload.acceptanceDate = acceptanceDate;
      if (publicationDate) payload.publicationDate = publicationDate;
      if (doi.trim()) payload.doi = doi.trim();
      if (paperUrl.trim()) payload.paperUrl = paperUrl.trim();

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error("Error saving publication:", err);
      setError("Failed to save publication");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-[#0A0A0A]/80">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:border dark:border-[#2A2A2A] dark:bg-[#181818] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-[#2A2A2A] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
              <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {publication ? "Edit Publication" : "Add Publication"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Paper title"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Venue <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="E.g., IEEE CVPR 2026, Nature, arXiv"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Paper Link (URL)
                </label>
                <input
                  type="url"
                  value={paperUrl}
                  onChange={(e) => setPaperUrl(e.target.value)}
                  placeholder="e.g., https://arxiv.org/abs/..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as Publication["type"])}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white"
                  >
                    <option value="conference">Conference</option>
                    <option value="journal">Journal</option>
                    <option value="workshop">Workshop</option>
                    <option value="preprint">Preprint</option>
                  </select>
                </div>
                
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Publication["status"])}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="under-review">Under Review</option>
                    <option value="accepted">Accepted</option>
                    <option value="published">Published</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Submission Date
                  </label>
                  <input
                    type="date"
                    value={submissionDate}
                    onChange={(e) => setSubmissionDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white"
                  />
                </div>

                {(status === "accepted" || status === "published") && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Acceptance Date
                    </label>
                    <input
                      type="date"
                      value={acceptanceDate}
                      onChange={(e) => setAcceptanceDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white"
                    />
                  </div>
                )}
              </div>

              {status === "published" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Publication Date
                    </label>
                    <input
                      type="date"
                      value={publicationDate}
                      onChange={(e) => setPublicationDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      DOI
                    </label>
                    <input
                      type="text"
                      value={doi}
                      onChange={(e) => setDoi(e.target.value)}
                      placeholder="e.g., 10.1109/CVPR..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-6 dark:border-[#2A2A2A]">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#2A2A2A]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Publication"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
