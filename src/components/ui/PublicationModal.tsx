import { useEffect, useState } from "react";
import {
  X,
  BookOpen,
  Presentation,
  FileText,
  BookMarked,
  Image as ImageIcon,
  MonitorPlay,
  GraduationCap,
  Newspaper,
  Mic,
  Package,
  Loader2,
  Link as LinkIcon,
  Users,
  Tag,
  Building2,
  CalendarDays,
  FlaskConical,
} from "lucide-react";

export type PublicationType =
  | "journal"
  | "conference"
  | "workshop"
  | "preprint"
  | "book-chapter"
  | "poster"
  | "demo"
  | "thesis"
  | "magazine"
  | "symposium"
  | "other";

export type PublicationStatus =
  | "draft"
  | "submitted"
  | "under-review"
  | "revision"
  | "accepted"
  | "published"
  | "rejected";

export interface PublicationFormData {
  title: string;
  type: PublicationType;
  venue: string;
  publisher: string;
  authors: string[];
  abstract: string;
  keywords: string[];
  status: PublicationStatus;
  submissionDate: string;
  publicationDate: string;
  doi: string;
  paperUrl: string;
  codeUrl: string;
  projectUrl: string;
  volume: string;
  pages: string;
}

interface PublicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PublicationFormData) => Promise<void>;
  editingPublication?: (Partial<PublicationFormData> & { id: string }) | null;
  defaultAuthors?: string[];
}

export const PUBLICATION_TYPES: {
  value: PublicationType;
  label: string;
  hint: string;
  icon: React.ElementType;
  activeClass: string;
}[] = [
  { value: "journal", label: "Journal", hint: "Peer-reviewed journal article", icon: BookOpen, activeClass: "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
  { value: "conference", label: "Conference", hint: "Full conference paper", icon: Presentation, activeClass: "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
  { value: "workshop", label: "Workshop", hint: "Workshop / short paper", icon: FlaskConical, activeClass: "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300" },
  { value: "preprint", label: "Preprint", hint: "arXiv / TechRxiv / SSRN", icon: FileText, activeClass: "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  { value: "book-chapter", label: "Book Chapter", hint: "Edited volume chapter", icon: BookMarked, activeClass: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  { value: "poster", label: "Poster", hint: "Poster / extended abstract", icon: ImageIcon, activeClass: "border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300" },
  { value: "demo", label: "Demo", hint: "System demonstration", icon: MonitorPlay, activeClass: "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300" },
  { value: "thesis", label: "Thesis", hint: "BS / MS / PhD thesis", icon: GraduationCap, activeClass: "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" },
  { value: "magazine", label: "Magazine", hint: "Magazine / practitioner", icon: Newspaper, activeClass: "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300" },
  { value: "symposium", label: "Symposium", hint: "Symposium / doctoral cons.", icon: Mic, activeClass: "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300" },
  { value: "other", label: "Other", hint: "Report, dataset paper, etc.", icon: Package, activeClass: "border-slate-500 bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300" },
];

export const PUBLICATION_STATUSES: { value: PublicationStatus; label: string; dot: string }[] = [
  { value: "draft", label: "Draft", dot: "bg-slate-400" },
  { value: "submitted", label: "Submitted", dot: "bg-sky-500" },
  { value: "under-review", label: "Under Review", dot: "bg-amber-500" },
  { value: "revision", label: "Revision Required", dot: "bg-orange-500" },
  { value: "accepted", label: "Accepted", dot: "bg-blue-600" },
  { value: "published", label: "Published", dot: "bg-emerald-500" },
  { value: "rejected", label: "Rejected", dot: "bg-rose-500" },
];

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-indigo-400 dark:focus:ring-indigo-400";

export function PublicationModal({ isOpen, onClose, onSave, editingPublication, defaultAuthors }: PublicationModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<PublicationType>("conference");
  const [venue, setVenue] = useState("");
  const [publisher, setPublisher] = useState("");
  const [authors, setAuthors] = useState<string[]>([]);
  const [authorInput, setAuthorInput] = useState("");
  const [abstract, setAbstract] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [status, setStatus] = useState<PublicationStatus>("draft");
  const [submissionDate, setSubmissionDate] = useState("");
  const [publicationDate, setPublicationDate] = useState("");
  const [doi, setDoi] = useState("");
  const [paperUrl, setPaperUrl] = useState("");
  const [codeUrl, setCodeUrl] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [volume, setVolume] = useState("");
  const [pages, setPages] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (editingPublication) {
        setTitle(editingPublication.title || "");
        setType(editingPublication.type || "conference");
        setVenue(editingPublication.venue || "");
        setPublisher(editingPublication.publisher || "");
        setAuthors(editingPublication.authors || []);
        setAbstract(editingPublication.abstract || "");
        setKeywords(editingPublication.keywords || []);
        setStatus(editingPublication.status || "draft");
        setSubmissionDate(editingPublication.submissionDate || "");
        setPublicationDate(editingPublication.publicationDate || "");
        setDoi(editingPublication.doi || "");
        setPaperUrl(editingPublication.paperUrl || "");
        setCodeUrl(editingPublication.codeUrl || "");
        setProjectUrl(editingPublication.projectUrl || "");
        setVolume(editingPublication.volume || "");
        setPages(editingPublication.pages || "");
      } else {
        setTitle("");
        setType("conference");
        setVenue("");
        setPublisher("");
        setAuthors(defaultAuthors || []);
        setAbstract("");
        setKeywords([]);
        setStatus("draft");
        setSubmissionDate("");
        setPublicationDate("");
        setDoi("");
        setPaperUrl("");
        setCodeUrl("");
        setProjectUrl("");
        setVolume("");
        setPages("");
      }
      setAuthorInput("");
      setKeywordInput("");
      setError("");
    }
  }, [isOpen, editingPublication, defaultAuthors]);

  if (!isOpen) return null;

  const addAuthor = () => {
    const v = authorInput.trim().replace(/,+$/, "");
    if (!v) return;
    if (!authors.includes(v)) setAuthors((p) => [...p, v]);
    setAuthorInput("");
  };

  const addKeyword = () => {
    const v = keywordInput.trim().replace(/,+$/, "").toLowerCase();
    if (!v) return;
    if (!keywords.includes(v)) setKeywords((p) => [...p, v]);
    setKeywordInput("");
  };

  const isValidUrl = (u: string) => !u || /^https?:\/\/.+/.test(u.trim());
  const isValidDoi = (d: string) => {
    if (!d.trim()) return true;
    const cleaned = d.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    return /^10\.\d{4,}(\.\d+)*\/\S+$/i.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Give the publication a title.");
    if (!venue.trim()) return setError("Add the venue — e.g. IEEE TKDE, NeurIPS 2026, arXiv.");
    if (authors.length === 0) return setError("Add at least one author.");
    if (!isValidDoi(doi)) return setError("DOI looks invalid. Expected format like 10.1109/xxxxx.");
    if (!isValidUrl(paperUrl)) return setError("Paper / PDF link must start with http:// or https://");
    if (!isValidUrl(codeUrl)) return setError("Code link must start with http:// or https://");
    if (!isValidUrl(projectUrl)) return setError("Project link must start with http:// or https://");
    if (status === "published" && !publicationDate)
      return setError("Published papers need a publication date — this flips the group to Published.");

    try {
      setIsSaving(true);
      setError("");
      await onSave({
        title: title.trim(),
        type,
        venue: venue.trim(),
        publisher: publisher.trim(),
        authors,
        abstract: abstract.trim(),
        keywords,
        status,
        submissionDate,
        publicationDate,
        doi: doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, ""),
        paperUrl: paperUrl.trim(),
        codeUrl: codeUrl.trim(),
        projectUrl: projectUrl.trim(),
        volume: volume.trim(),
        pages: pages.trim(),
      });
      onClose();
    } catch (err) {
      console.error("Failed to save publication:", err);
      setError("Couldn't save this publication. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-[#0A0A0A]/80">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl dark:border dark:border-[#2A2A2A] dark:bg-[#181818]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingPublication ? "Edit publication" : "Add publication"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Journal, conference, preprint — anything. Share links so the team can cite it.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[72vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-5 rounded-xl bg-rose-50 p-3.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </div>
          )}

          <form id="publication-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Paper title <span className="text-rose-500">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Attention Is All You Need — Efficient Transformers for Low-Resource Languages"
                className={inputCls}
              />
            </div>

            {/* Type grid */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Publication type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PUBLICATION_TYPES.map((t) => {
                  const Icon = t.icon;
                  const selected = type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      title={t.hint}
                      className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                        selected
                          ? `${t.activeClass} border-current ring-1 ring-current`
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-[#333] dark:text-slate-400 dark:hover:bg-[#0F0F0F]"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>
                        <span className="block text-xs font-bold leading-tight">{t.label}</span>
                        <span className="block truncate text-[11px] opacity-70">{t.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Venue + publisher */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" /> Venue / Journal <span className="text-rose-500">*</span>
                </label>
                <input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. NeurIPS 2026, IEEE TKDE, arXiv"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Publisher</label>
                <input
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="e.g. IEEE, ACM, Springer, arXiv"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Authors */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Users className="h-3.5 w-3.5 text-slate-400" /> Authors <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  value={authorInput}
                  onChange={(e) => setAuthorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addAuthor();
                    }
                  }}
                  placeholder="Type a name, press Enter"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={addAuthor}
                  className="shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Add
                </button>
              </div>
              {authors.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {authors.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                    >
                      {a}
                      <button
                        type="button"
                        onClick={() => setAuthors((p) => p.filter((x) => x !== a))}
                        className="rounded-full p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-500/30"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Status pipeline */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> Review status
              </label>
              <div className="flex flex-wrap gap-2">
                {PUBLICATION_STATUSES.map((s) => {
                  const selected = status === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStatus(s.value)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                        selected
                          ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-[#333] dark:text-slate-400 dark:hover:bg-[#0F0F0F]"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${s.dot} ${selected ? "bg-white" : ""}`} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
              {status === "published" && (
                <p className="mt-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  Marking as Published will flip this research group&apos;s badge to Published for everyone.
                </p>
              )}
            </div>

            {/* Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Submission date</label>
                <input type="date" value={submissionDate} onChange={(e) => setSubmissionDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Publication date {status === "published" && <span className="text-rose-500">*</span>}
                </label>
                <input type="date" value={publicationDate} onChange={(e) => setPublicationDate(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Links — link sharing */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-[#2A2A2A] dark:bg-[#0F0F0F]">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <LinkIcon className="h-4 w-4 text-indigo-500" /> Shareable links
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">DOI</label>
                  <input value={doi} onChange={(e) => setDoi(e.target.value)} placeholder="10.1109/xxxxx" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Paper / PDF URL</label>
                  <input value={paperUrl} onChange={(e) => setPaperUrl(e.target.value)} placeholder="https://..." className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Code repo</label>
                  <input value={codeUrl} onChange={(e) => setCodeUrl(e.target.value)} placeholder="https://github.com/..." className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Project page</label>
                  <input value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} placeholder="https://..." className={inputCls} />
                </div>
              </div>
            </div>

            {/* Volume / pages */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Volume / Issue</label>
                <input value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="e.g. Vol. 35, No. 4" className={inputCls} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Pages</label>
                <input value={pages} onChange={(e) => setPages(e.target.value)} placeholder="e.g. 1234–1245" className={inputCls} />
              </div>
            </div>

            {/* Keywords */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Tag className="h-3.5 w-3.5 text-slate-400" /> Keywords
              </label>
              <div className="flex gap-2">
                <input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                  placeholder="e.g. transformers, low-resource NLP"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  className="shrink-0 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#333] dark:text-slate-300 dark:hover:bg-[#0F0F0F]"
                >
                  Add
                </button>
              </div>
              {keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {keywords.map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      #{k}
                      <button
                        type="button"
                        onClick={() => setKeywords((p) => p.filter((x) => x !== k))}
                        className="rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Abstract */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Abstract</label>
              <textarea
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                rows={4}
                placeholder="One-paragraph summary — what problem, what method, what result?"
                className={`${inputCls} resize-y leading-relaxed`}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 p-5 dark:border-[#2A2A2A] dark:bg-[#141414]">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="publication-form"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : editingPublication ? (
                "Update publication"
              ) : (
                "Add publication"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
