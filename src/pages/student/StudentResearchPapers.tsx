import { useRef, useState, useEffect, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import {
  ArrowDownWideNarrow,
  ArrowUpRight,
  BookOpenText,
  CalendarDays,
  ChevronDown,
  Copy,
  FileSearch,
  Info,
  LoaderCircle,
  ShieldAlert,
  Search,
  Bookmark,
  BookmarkCheck,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, serverTimestamp } from "firebase/firestore";

interface CrossrefAuthor {
  given?: string;
  family?: string;
  name?: string;
}

interface CrossrefDate {
  "date-parts"?: number[][];
}

interface CrossrefLink {
  URL?: string;
  "content-type"?: string;
}

interface CrossrefUpdate {
  DOI?: string;
  type?: string;
  label?: string;
  source?: string;
}

interface CrossrefWork {
  DOI?: string;
  title?: string[];
  author?: CrossrefAuthor[];
  abstract?: string;
  "container-title"?: string[];
  published?: CrossrefDate;
  "published-print"?: CrossrefDate;
  "published-online"?: CrossrefDate;
  created?: CrossrefDate;
  "is-referenced-by-count"?: number;
  score?: number;
  openAlexMetrics?: OpenAlexQualityMetrics;
  sourceLabels?: string[];
  semanticScholarId?: string;
  sourceRelevance?: number;
  "references-count"?: number;
  "update-to"?: CrossrefUpdate[];
  URL?: string;
  link?: CrossrefLink[];
  type?: string;
}

interface SemanticScholarPaper {
  paperId?: string;
  title?: string;
  year?: number;
  publicationDate?: string;
  authors?: Array<{ name?: string }>;
  abstract?: string | null;
  externalIds?: { DOI?: string | null };
  citationCount?: number;
  publicationVenue?: { name?: string } | null;
  openAccessPdf?: { url?: string | null } | null;
  url?: string;
  publicationTypes?: string[] | null;
}

interface SemanticScholarResponse {
  total?: number;
  offset?: number;
  data?: SemanticScholarPaper[];
}

interface CrossrefResponse {
  message?: {
    items?: CrossrefWork[];
    "next-cursor"?: string;
    "total-results"?: number;
  };
}

interface OpenAlexWork {
  id?: string;
  display_name?: string;
  publication_year?: number;
  publication_date?: string;
  authorships?: Array<{ author?: { display_name?: string } }>;
  abstract_inverted_index?: Record<string, number[]> | null;
  doi?: string;
  cited_by_count?: number;
  citation_normalized_percentile?: { value?: number; is_in_top_1_percent?: boolean; is_in_top_10_percent?: boolean } | null;
  fwci?: number | null;
  is_retracted?: boolean;
  type?: string;
  primary_location?: { landing_page_url?: string | null; pdf_url?: string | null; source?: { display_name?: string | null } | null } | null;
  best_oa_location?: { pdf_url?: string; landing_page_url?: string } | null;
  locations?: Array<{ pdf_url?: string; landing_page_url?: string }>;
}

interface OpenAlexResponse {
  meta?: { count?: number };
  results?: OpenAlexWork[];
  best_oa_location?: OpenAlexWork["best_oa_location"];
  locations?: OpenAlexWork["locations"];
}

interface OpenAlexQualityMetrics {
  citationPercentile?: number;
  topOnePercent?: boolean;
  topTenPercent?: boolean;
  isRetracted?: boolean;
}

type SortMode = "relevance" | "newest" | "cited";

const PAGE_SIZE = 20;
const CURRENT_YEAR = new Date().getFullYear();
const EARLIEST_YEAR = CURRENT_YEAR - 10;
const SUGGESTED_SEARCHES = ["Artificial intelligence", "Climate change", "Public health", "Cybersecurity"];

function getWorkYear(work: CrossrefWork): string {
  const date = work.published || work["published-print"] || work["published-online"] || work.created;
  const year = date?.["date-parts"]?.[0]?.[0];
  return typeof year === "number" ? String(year) : "Year unavailable";
}

function getWorkDateValue(work: CrossrefWork): number {
  const parts = (work.published || work["published-print"] || work["published-online"] || work.created)?.["date-parts"]?.[0] || [];
  return (parts[0] || 0) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
}

function hasSeriousUpdate(work: CrossrefWork): boolean {
  return (work["update-to"] || []).some((update) => ["retraction", "expression-of-concern"].includes((update.type || "").toLowerCase()));
}

function normalizeDoi(doi?: string): string {
  return (doi || "").replace(/^https?:\/\/doi\.org\//i, "").replace(/^doi:/i, "").trim().toLowerCase();
}

function normalizeTitle(title?: string): string {
  return (title || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function convertSemanticScholarPaper(paper: SemanticScholarPaper): CrossrefWork {
  const year = paper.year || (paper.publicationDate ? Number(paper.publicationDate.slice(0, 4)) : undefined);
  return {
    DOI: paper.externalIds?.DOI || undefined,
    title: paper.title ? [paper.title] : undefined,
    author: paper.authors?.map((author) => ({ name: author.name })).filter((author) => !!author.name),
    abstract: paper.abstract || undefined,
    "container-title": paper.publicationVenue?.name ? [paper.publicationVenue.name] : undefined,
    published: year ? { "date-parts": [[year]] } : undefined,
    "is-referenced-by-count": paper.citationCount,
    URL: paper.url || (paper.paperId ? `https://www.semanticscholar.org/paper/${paper.paperId}` : undefined),
    link: paper.openAccessPdf?.url ? [{ URL: paper.openAccessPdf.url, "content-type": "application/pdf" }] : undefined,
    type: paper.publicationTypes?.[0] || "Research work",
    semanticScholarId: paper.paperId,
    sourceLabels: ["Semantic Scholar"],
  };
}

function convertOpenAlexPaper(paper: OpenAlexWork, rank: number): CrossrefWork {
  const abstractWords: string[] = [];
  for (const [word, positions] of Object.entries(paper.abstract_inverted_index || {})) {
    for (const position of positions) abstractWords[position] = word;
  }
  const dateParts = paper.publication_date?.split("-").map(Number) || [];
  const year = paper.publication_year || dateParts[0];
  const pdfUrl = paper.primary_location?.pdf_url || paper.best_oa_location?.pdf_url;
  const doi = normalizeDoi(paper.doi);
  return {
    DOI: doi || undefined,
    title: paper.display_name ? [paper.display_name] : undefined,
    author: paper.authorships?.map((authorship) => ({ name: authorship.author?.display_name })).filter((author) => !!author.name),
    abstract: abstractWords.length ? abstractWords.join(" ") : undefined,
    "container-title": paper.primary_location?.source?.display_name ? [paper.primary_location.source.display_name] : undefined,
    published: year ? { "date-parts": [[year, dateParts[1] || 1, dateParts[2] || 1]] } : undefined,
    "is-referenced-by-count": paper.cited_by_count,
    "references-count": undefined,
    URL: paper.primary_location?.landing_page_url || paper.best_oa_location?.landing_page_url || paper.id,
    link: pdfUrl ? [{ URL: pdfUrl, "content-type": "application/pdf" }] : undefined,
    type: paper.type || "Research work",
    sourceLabels: ["OpenAlex"],
    sourceRelevance: Math.max(0, 1 - rank / PAGE_SIZE),
    openAlexMetrics: {
      citationPercentile: paper.citation_normalized_percentile?.value,
      topOnePercent: paper.citation_normalized_percentile?.is_in_top_1_percent,
      topTenPercent: paper.citation_normalized_percentile?.is_in_top_10_percent,
      isRetracted: paper.is_retracted,
    },
  };
}

function convertArxivPaper(entry: Element, rank: number): CrossrefWork {
  const title = entry.querySelector("title")?.textContent?.replace(/\s+/g, ' ').trim() || undefined;
  const abstract = entry.querySelector("summary")?.textContent?.replace(/\s+/g, ' ').trim() || undefined;
  const publishedDate = entry.querySelector("published")?.textContent || "";
  const year = publishedDate ? parseInt(publishedDate.slice(0, 4), 10) : undefined;
  let doi = undefined;
  const links = entry.querySelectorAll("link[title='doi']");
  links.forEach(l => { if (l.getAttribute("href")?.includes("doi.org")) doi = normalizeDoi(l.getAttribute("href") || undefined) });
  if (!doi) {
    const dois = entry.querySelectorAll("doi");
    if (dois.length) doi = normalizeDoi(dois[0].textContent || undefined);
  }
  const authors = Array.from(entry.querySelectorAll("author name")).map(n => ({ name: n.textContent?.trim() || "" })).filter(a => !!a.name);
  const pdfLink = entry.querySelector("link[title='pdf']")?.getAttribute("href") || undefined;
  const url = entry.querySelector("id")?.textContent || undefined;

  return {
    DOI: doi || undefined,
    title: title ? [title] : undefined,
    author: authors,
    abstract: abstract,
    published: year ? { "date-parts": [[year]] } : undefined,
    URL: url,
    link: pdfLink ? [{ URL: pdfLink, "content-type": "application/pdf" }] : undefined,
    type: "Preprint",
    sourceLabels: ["arXiv"],
    sourceRelevance: Math.max(0, 1 - rank / PAGE_SIZE),
  };
}

interface PlosPaper {
  id?: string;
  journal?: string;
  publication_date?: string;
  article_type?: string;
  author_display?: string[];
  abstract?: string[];
  title_display?: string;
}

function convertPlosPaper(paper: PlosPaper, rank: number): CrossrefWork {
  const year = paper.publication_date ? parseInt(paper.publication_date.slice(0, 4), 10) : undefined;
  return {
    DOI: normalizeDoi(paper.id) || undefined,
    title: paper.title_display ? [paper.title_display] : undefined,
    author: paper.author_display?.map(name => ({ name })) || [],
    abstract: paper.abstract?.[0] || undefined,
    "container-title": paper.journal ? [paper.journal] : undefined,
    published: year ? { "date-parts": [[year]] } : undefined,
    URL: paper.id ? `https://journals.plos.org/plosone/article?id=${paper.id}` : undefined,
    type: paper.article_type || "Research Article",
    sourceLabels: ["PLOS"],
    sourceRelevance: Math.max(0, 1 - rank / PAGE_SIZE),
  };
}

function mergePaperSources(crossrefWorks: CrossrefWork[], semanticWorks: CrossrefWork[]): CrossrefWork[] {
  const merged = new Map<string, CrossrefWork>();
  const keyFor = (work: CrossrefWork) => normalizeDoi(work.DOI) || (normalizeTitle(work.title?.[0])
    ? `${normalizeTitle(work.title?.[0])}|${getWorkYear(work)}`
    : `${work.semanticScholarId || work.URL || "untitled"}|${getWorkYear(work)}`);
  for (const work of crossrefWorks) merged.set(keyFor(work), { ...work, sourceLabels: work.sourceLabels || ["Crossref"] });
  for (const work of semanticWorks) {
    const key = keyFor(work);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, work);
      continue;
    }
    merged.set(key, {
      ...work,
      ...existing,
      author: existing.author?.length ? existing.author : work.author,
      abstract: existing.abstract || work.abstract,
      "container-title": existing["container-title"]?.length ? existing["container-title"] : work["container-title"],
      published: existing.published || work.published,
      "is-referenced-by-count": Math.max(existing["is-referenced-by-count"] || 0, work["is-referenced-by-count"] || 0),
      URL: existing.URL || work.URL,
      link: existing.link?.length ? existing.link : work.link,
      semanticScholarId: work.semanticScholarId,
      sourceLabels: [...new Set([...(existing.sourceLabels || ["Crossref"]), ...(work.sourceLabels || ["Semantic Scholar"])])],
    });
  }
  return [...merged.values()];
}

function getAuthors(work: CrossrefWork): string {
  const names = (work.author || [])
    .map((author) => author.name || [author.given, author.family].filter(Boolean).join(" "))
    .filter(Boolean);
  if (!names.length) return "Author information unavailable";
  return names.length > 4 ? `${names.slice(0, 4).join(", ")} et al.` : names.join(", ");
}

function getAbstractSnippet(abstract?: string): string {
  if (!abstract) return "No abstract was provided in the publication metadata.";
  const text = new DOMParser().parseFromString(abstract, "text/html").body.textContent?.replace(/\s+/g, " ").trim() || "";
  if (!text) return "No abstract was provided in the publication metadata.";
  return text.length > 420 ? `${text.slice(0, 420).trimEnd()}…` : text;
}

function formatWorkType(type?: string): string {
  if (!type) return "Research work";
  return type.replace(/-/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function getDoiUrl(doi: string): string {
  return `https://doi.org/${doi.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
}

function getPaperUrl(work: CrossrefWork): string | undefined {
  const pdfLink = work.link?.find((link) => link["content-type"]?.toLowerCase().includes("pdf"))?.URL;
  return pdfLink || (work.DOI ? getDoiUrl(work.DOI) : work.URL);
}

function makeCitation(work: CrossrefWork): string {
  const authors = (work.author || []).map((author) => author.name || [author.family, author.given].filter(Boolean).join(", ")).filter(Boolean);
  const title = work.title?.[0] || "Untitled work";
  const venue = work["container-title"]?.[0];
  const year = getWorkYear(work);
  const doi = work.DOI ? ` ${getDoiUrl(work.DOI)}` : "";
  return `${authors.length ? `${authors.slice(0, 6).join(", ")}${authors.length > 6 ? ", et al." : ""}. ` : ""}(${year}). ${title}.${venue ? ` ${venue}.` : ""}${doi}`;
}

export default function StudentResearchPapers() {
  const { pathname } = useLocation();
  const role = pathname.startsWith("/teacher/") ? "teacher" : "student";
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [yearInput, setYearInput] = useState("");
  const [activeYear, setActiveYear] = useState("");
  const [sortMode, setSortMode] = useState<SortMode[]>([]);
  const [works, setWorks] = useState<CrossrefWork[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [semanticOffset, setSemanticOffset] = useState(0);
  const [semanticHasMore, setSemanticHasMore] = useState(false);
  const [openAlexPage, setOpenAlexPage] = useState(1);
  const [openAlexHasMore, setOpenAlexHasMore] = useState(false);
  const [arxivOffset, setArxivOffset] = useState(0);
  const [arxivHasMore, setArxivHasMore] = useState(false);
  const [plosOffset, setPlosOffset] = useState(0);
  const [plosHasMore, setPlosHasMore] = useState(false);
  const [sourceWarnings, setSourceWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [copiedDoi, setCopiedDoi] = useState<string | null>(null);
  const [expandedContextKey, setExpandedContextKey] = useState<string | null>(null);
  const [freeTextLinks, setFreeTextLinks] = useState<Record<string, { url?: string; loading?: boolean; checked?: boolean }>>({});
  const requestRef = useRef<AbortController | null>(null);

  const [activeTab, setActiveTab] = useState<"search" | "saved">("search");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [savedPapers, setSavedPapers] = useState<CrossrefWork[]>([]);
  const [savedPaperIds, setSavedPaperIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user.uid);
      } else {
        setCurrentUser(null);
        setSavedPapers([]);
        setSavedPaperIds(new Set());
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const q = collection(db, `users/${currentUser}/savedPapers`);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const papers: CrossrefWork[] = [];
      const ids = new Set<string>();
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.paperString) {
          try {
            papers.push(JSON.parse(data.paperString) as CrossrefWork);
            ids.add(doc.id);
          } catch (e) {
            console.error("Failed to parse saved paper string", e);
          }
        } else if (data.paper) {
          papers.push(data.paper as CrossrefWork);
          ids.add(doc.id);
        }
      });
      setSavedPapers(papers.sort((a, b) => {
        return getWorkDateValue(b) - getWorkDateValue(a);
      }));
      setSavedPaperIds(ids);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const getPaperId = (work: CrossrefWork) => {
    return work.DOI || work.semanticScholarId || work.URL || work.title?.[0] || "unknown";
  };

  const toggleBookmark = async (work: CrossrefWork) => {
    if (!currentUser) {
      alert("User not logged in or auth not initialized.");
      return;
    }
    const paperId = getPaperId(work);
    const safeId = paperId.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeId) {
      alert("Invalid paper ID generated.");
      return;
    }
    
    const docRef = doc(db, `users/${currentUser}/savedPapers`, safeId);
    
    if (savedPaperIds.has(safeId)) {
      try {
        await deleteDoc(docRef);
      } catch (err) {
        console.error("Failed to remove bookmark", err);
        alert(`Error removing bookmark: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      try {
        await setDoc(docRef, {
          userId: currentUser,
          paperId: safeId,
          paperString: JSON.stringify(work),
          savedAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Failed to bookmark", err);
        alert(`Error saving bookmark: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  const fetchWorks = async (queryText: string, year: string, sort: SortMode, cursor: string, append: boolean) => {
    if (!queryText.trim()) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError("");

    const CURRENT_YEAR = new Date().getFullYear();
    const fromYear = year ? (CURRENT_YEAR - Number(year) + 1) : EARLIEST_YEAR;
    const untilYear = CURRENT_YEAR;
    try {
      const sourceErrors: string[] = [];
      let crossrefWorks: CrossrefWork[] = [];
      let crossrefTotal = 0;
      let followingCrossrefCursor: string | null = null;
      if (!(append && cursor === "done")) {
        const crossrefParams = new URLSearchParams({
          "query.bibliographic": queryText.trim(),
          rows: String(PAGE_SIZE),
          select: "DOI,title,author,abstract,container-title,published,published-print,published-online,created,is-referenced-by-count,references-count,update-to,URL,link,type,score",
          sort: sort === "newest" ? "published" : sort === "cited" ? "is-referenced-by-count" : "score",
          order: "desc",
        });
        if (sort === "newest") crossrefParams.set("offset", cursor === "*" ? "0" : cursor);
        else crossrefParams.set("cursor", cursor);
        crossrefParams.set("filter", `from-pub-date:${fromYear}-01-01,until-pub-date:${untilYear}-12-31`);
        try {
          const response = await fetch(`https://api.crossref.org/works?${crossrefParams.toString()}`, { signal: controller.signal });
          if (!response.ok) throw new Error(response.status === 429 ? "Crossref rate limit reached" : `Crossref returned ${response.status}`);
          const data = await response.json() as CrossrefResponse;
          crossrefWorks = (data.message?.items || []).map((work) => ({ ...work, sourceLabels: ["Crossref"] }));
          crossrefTotal = data.message?.["total-results"] || 0;
          followingCrossrefCursor = sort === "newest"
            ? crossrefWorks.length === PAGE_SIZE && (append ? Number(cursor) + crossrefWorks.length : crossrefWorks.length) < crossrefTotal && (append ? Number(cursor) + crossrefWorks.length : crossrefWorks.length) < 10000
              ? String(append ? Number(cursor) + crossrefWorks.length : crossrefWorks.length)
              : null
            : data.message?.["next-cursor"] || null;
        } catch (crossrefError) {
          if (crossrefError instanceof DOMException && crossrefError.name === "AbortError") return;
          sourceErrors.push(crossrefError instanceof TypeError ? "Crossref could not be reached from this browser" : crossrefError instanceof Error ? `Crossref: ${crossrefError.message}` : "Crossref unavailable");
        }
      }

      const currentSemanticOffset = append ? semanticOffset : 0;
      const currentOpenAlexPage = append ? openAlexPage : 1;
      let semanticWorks: CrossrefWork[] = [];
      let openAlexWorks: CrossrefWork[] = [];
      let semanticTotal = 0;
      try {
        const semanticParams = new URLSearchParams({
          query: queryText.trim(),
          year: `${fromYear}-${untilYear}`,
          limit: String(PAGE_SIZE),
          offset: String(currentSemanticOffset),
          fields: "title,year,publicationDate,authors,abstract,externalIds,citationCount,publicationVenue,openAccessPdf,url,publicationTypes",
        });
        const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${semanticParams.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 429 ? "Semantic Scholar rate limit reached" : `Semantic Scholar returned ${response.status}`);
        const data = await response.json() as SemanticScholarResponse;
        semanticWorks = (data.data || []).map(convertSemanticScholarPaper);
        semanticTotal = data.total || 0;
        const nextOffset = currentSemanticOffset + semanticWorks.length;
        setSemanticOffset(nextOffset);
        setSemanticHasMore(semanticWorks.length > 0 && nextOffset < semanticTotal);
      } catch (semanticError) {
        if (semanticError instanceof DOMException && semanticError.name === "AbortError") return;
        sourceErrors.push(semanticError instanceof TypeError ? "Semantic Scholar could not be reached from this browser" : semanticError instanceof Error ? `Semantic Scholar: ${semanticError.message}` : "Semantic Scholar unavailable");
        setSemanticHasMore(false);
        if (!append) setSemanticOffset(0);
      }

      try {
        const openAlexParams = new URLSearchParams({
          search: queryText.trim(),
          filter: `from_publication_date:${fromYear}-01-01,to_publication_date:${untilYear}-12-31`,
          per_page: String(PAGE_SIZE),
          page: String(currentOpenAlexPage),
          select: "id,doi,display_name,publication_year,publication_date,authorships,abstract_inverted_index,cited_by_count,citation_normalized_percentile,is_retracted,type,primary_location,best_oa_location",
        });
        const response = await fetch(`https://api.openalex.org/works?${openAlexParams.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 429 ? "OpenAlex rate limit reached" : `OpenAlex returned ${response.status}`);
        const data = await response.json() as OpenAlexResponse;
        const openAlexResults = data.results || [];
        openAlexWorks = openAlexResults.map(convertOpenAlexPaper);
        const nextPage = currentOpenAlexPage + 1;
        setOpenAlexPage(nextPage);
        setOpenAlexHasMore(openAlexResults.length > 0 && currentOpenAlexPage * PAGE_SIZE < (data.meta?.count || 0));
      } catch (openAlexError) {
        if (openAlexError instanceof DOMException && openAlexError.name === "AbortError") return;
        sourceErrors.push(openAlexError instanceof TypeError ? "OpenAlex could not be reached from this browser" : openAlexError instanceof Error ? `OpenAlex: ${openAlexError.message}` : "OpenAlex unavailable");
        setOpenAlexHasMore(false);
        if (!append) setOpenAlexPage(1);
      }

      const currentArxivOffset = append ? arxivOffset : 0;
      let arxivWorks: CrossrefWork[] = [];
      try {
        const arxivParams = new URLSearchParams({
          search_query: `all:${queryText.trim()}`,
          start: String(currentArxivOffset),
          max_results: String(PAGE_SIZE),
        });
        const response = await fetch(`https://export.arxiv.org/api/query?${arxivParams.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`arXiv returned ${response.status}`);
        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, "text/xml");
        const entries = Array.from(doc.querySelectorAll("entry"));
        arxivWorks = entries.map((entry, index) => convertArxivPaper(entry, index));
        const totalResultsStr = doc.querySelector("totalResults")?.textContent;
        const arxivTotal = totalResultsStr ? parseInt(totalResultsStr, 10) : 0;
        const nextOffset = currentArxivOffset + arxivWorks.length;
        setArxivOffset(nextOffset);
        setArxivHasMore(arxivWorks.length > 0 && nextOffset < arxivTotal);
      } catch (arxivError) {
        if (arxivError instanceof DOMException && arxivError.name === "AbortError") return;
        sourceErrors.push(arxivError instanceof TypeError ? "arXiv could not be reached" : arxivError instanceof Error ? `arXiv: ${arxivError.message}` : "arXiv unavailable");
        setArxivHasMore(false);
        if (!append) setArxivOffset(0);
      }

      const currentPlosOffset = append ? plosOffset : 0;
      let plosWorks: CrossrefWork[] = [];
      try {
        const plosParams = new URLSearchParams({
          q: `everything:${queryText.trim()}`,
          start: String(currentPlosOffset),
          rows: String(PAGE_SIZE),
        });
        const response = await fetch(`https://api.plos.org/search?${plosParams.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`PLOS returned ${response.status}`);
        const data = await response.json();
        const docs = data.response?.docs || [];
        plosWorks = docs.map((doc: PlosPaper, index: number) => convertPlosPaper(doc, index));
        const plosTotal = data.response?.numFound || 0;
        const nextOffset = currentPlosOffset + plosWorks.length;
        setPlosOffset(nextOffset);
        setPlosHasMore(plosWorks.length > 0 && nextOffset < plosTotal);
      } catch (plosError) {
        if (plosError instanceof DOMException && plosError.name === "AbortError") return;
        sourceErrors.push(plosError instanceof TypeError ? "PLOS could not be reached" : plosError instanceof Error ? `PLOS: ${plosError.message}` : "PLOS unavailable");
        setPlosHasMore(false);
        if (!append) setPlosOffset(0);
      }

      if (!crossrefWorks.length && !semanticWorks.length && !openAlexWorks.length && !arxivWorks.length && !plosWorks.length && sourceErrors.length === 5) {
        throw new Error("All paper indexes are temporarily unavailable. Please try again shortly.");
      }
      setSourceWarnings(sourceErrors);
      let foundWorks = mergePaperSources(crossrefWorks, [...semanticWorks, ...openAlexWorks, ...arxivWorks, ...plosWorks]);
      const dois = foundWorks.map((work) => work.DOI).filter((doi): doi is string => !!doi);
      if (dois.length) {
        try {
          const openAlexParams = new URLSearchParams({
            filter: `doi:${dois.map((doi) => `https://doi.org/${doi}`).join("|")}`,
            per_page: "100",
            select: "doi,citation_normalized_percentile,is_retracted,cited_by_count,fwci",
          });
          const openAlexResponse = await fetch(`https://api.openalex.org/works?${openAlexParams.toString()}`, { signal: controller.signal });
          if (openAlexResponse.ok) {
            const openAlexData = await openAlexResponse.json() as OpenAlexResponse;
            const metricsByDoi = new Map((openAlexData.results || []).filter((work) => work.doi).map((work) => {
              const normalizedDoi = work.doi!.replace(/^https?:\/\/doi\.org\//i, "").toLowerCase();
              return [normalizedDoi, {
                citationPercentile: work.citation_normalized_percentile?.value,
                topOnePercent: work.citation_normalized_percentile?.is_in_top_1_percent,
                topTenPercent: work.citation_normalized_percentile?.is_in_top_10_percent,
                isRetracted: work.is_retracted,
              } satisfies OpenAlexQualityMetrics] as const;
            }));
            foundWorks = foundWorks.map((work) => ({
              ...work,
              openAlexMetrics: (work.DOI ? metricsByDoi.get(work.DOI.toLowerCase()) : undefined) || work.openAlexMetrics,
            }));
          }
        } catch (metricsError) {
          if (metricsError instanceof DOMException && metricsError.name === "AbortError") return;
        }
      }
      setWorks((current) => append ? mergePaperSources(current, foundWorks) : foundWorks);
      setNextCursor(followingCrossrefCursor);
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
      setError(fetchError instanceof Error ? fetchError.message : "Something went wrong while searching.");
      if (!append) {
        setWorks([]);
        setSemanticOffset(0);
        setSemanticHasMore(false);
        setOpenAlexPage(1);
        setOpenAlexHasMore(false);
        setArxivOffset(0);
        setArxivHasMore(false);
        setPlosOffset(0);
        setPlosHasMore(false);
      }
    } finally {
      if (requestRef.current === controller) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const runSearch = (event?: FormEvent<HTMLFormElement>, suggestedQuery?: string) => {
    event?.preventDefault();
    const queryText = (suggestedQuery ?? searchInput).trim();
    if (!queryText) return;
    setSearchInput(queryText);
    setActiveQuery(queryText);
    setActiveYear(yearInput);
    setWorks([]);
    setNextCursor(null);
    setSemanticOffset(0);
    setSemanticHasMore(false);
    setOpenAlexPage(1);
    setOpenAlexHasMore(false);
    setArxivOffset(0);
    setArxivHasMore(false);
    setPlosOffset(0);
    setPlosHasMore(false);
    setSourceWarnings([]);
    void fetchWorks(queryText, yearInput, sortMode[0] || "relevance", "*", false);
  };

  const handleSortChange = (value: SortMode) => {
    const nextSort = sortMode.includes(value) ? sortMode.filter((item) => item !== value) : [...sortMode, value];
    setSortMode(nextSort);
    if (!activeQuery) return;
    setWorks([]);
    setNextCursor(null);
    setSemanticOffset(0);
    setSemanticHasMore(false);
    setOpenAlexPage(1);
    setOpenAlexHasMore(false);
    setArxivOffset(0);
    setArxivHasMore(false);
    setPlosOffset(0);
    setPlosHasMore(false);
    setSourceWarnings([]);
    void fetchWorks(activeQuery, activeYear, nextSort[0] || "relevance", "*", false);
  };

  const handleCopyCitation = async (work: CrossrefWork) => {
    const key = work.DOI || work.title?.[0] || "citation";
    try {
      await navigator.clipboard.writeText(makeCitation(work));
      setCopiedDoi(key);
      window.setTimeout(() => setCopiedDoi((current) => current === key ? null : current), 1800);
    } catch {
      setError("Clipboard access was blocked. You can still open the paper source.");
    }
  };

  const loadMore = () => {
    if (!activeQuery || (!nextCursor && !semanticHasMore && !openAlexHasMore && !arxivHasMore && !plosHasMore)) return;
    void fetchWorks(activeQuery, activeYear, sortMode[0] || "relevance", nextCursor || "done", true);
  };

  const sortedWorks = [...works].sort((a, b) => {
    if (!sortMode.length) {
      const maxRelevance = Math.max(1, ...works.map((work) => work.score || 0));
      const smartScore = (work: CrossrefWork) => {
        const relevance = work.score ? work.score / maxRelevance : work.sourceRelevance || 0;
        const yearsOld = Math.max(0, CURRENT_YEAR - (Number(getWorkYear(work)) || CURRENT_YEAR));
        const fieldCitation = work.openAlexMetrics?.citationPercentile;
        const citationImpact = typeof fieldCitation === "number"
          ? Math.max(0, Math.min(1, fieldCitation))
          : Math.min(1, Math.log1p((work["is-referenced-by-count"] || 0) / Math.max(1, yearsOld + 1)) / 4);
        const recency = 1 / (1 + yearsOld / 5);
        const metadata = ((work.abstract?.trim() ? 1 : 0) + ((work["references-count"] || 0) > 0 ? 1 : 0)) / 2;
        const signal = relevance * 0.4 + citationImpact * 0.4 + recency * 0.1 + metadata * 0.1;
        return signal * (work.openAlexMetrics?.isRetracted || hasSeriousUpdate(work) ? 0.02 : 1);
      };
      return smartScore(b) - smartScore(a);
    }
    for (const criterion of sortMode) {
      const difference = criterion === "newest"
        ? getWorkDateValue(b) - getWorkDateValue(a)
        : (b["is-referenced-by-count"] || 0) - (a["is-referenced-by-count"] || 0);
      if (difference) return difference;
    }
    return 0;
  });

  const clearSearch = () => {
    setSearchInput("");
    setActiveQuery("");
    setWorks([]);
    setSemanticOffset(0);
    setSemanticHasMore(false);
    setOpenAlexPage(1);
    setOpenAlexHasMore(false);
    setArxivOffset(0);
    setArxivHasMore(false);
    setPlosOffset(0);
    setPlosHasMore(false);
    setSourceWarnings([]);
    setNextCursor(null);
    requestRef.current?.abort();
  };

  const displayWorks = activeTab === "saved" ? savedPapers : sortedWorks;

  const findFreeFullText = async (work: CrossrefWork, key: string) => {
    const title = work.title?.[0] || "research paper";
    if (!work.DOI) {
      window.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(`"${title}"`)}`, "_blank", "noopener,noreferrer");
      return;
    }
    setFreeTextLinks((current) => ({ ...current, [key]: { ...current[key], loading: true } }));
    try {
      const response = await fetch(`https://api.openalex.org/works/https://doi.org/${encodeURIComponent(work.DOI)}`);
      if (!response.ok) throw new Error("OpenAlex lookup failed");
      const data = await response.json() as OpenAlexResponse;
      const locations = [data.best_oa_location, ...(data.locations || [])].filter(Boolean);
      const url = locations.find((location) => location?.pdf_url)?.pdf_url || locations.find((location) => location?.landing_page_url)?.landing_page_url;
      setFreeTextLinks((current) => ({ ...current, [key]: { url, checked: true } }));
      if (!url) window.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(`"${title}"`)}`, "_blank", "noopener,noreferrer");
    } catch {
      setFreeTextLinks((current) => ({ ...current, [key]: { checked: true } }));
      window.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(`"${title}"`)}`, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <DashboardLayout role={role}>
      <div className="mx-auto max-w-6xl px-2 sm:px-4">
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 dark:border-indigo-500/20 dark:from-indigo-500/10 dark:via-[#141414] dark:to-violet-500/10 sm:p-9">
          <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-500/10" />
          <div className="relative max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-[#171717] dark:text-indigo-300">
              <BookOpenText className="h-3.5 w-3.5" /> Academic literature discovery
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Research Papers</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">Search scholarly publications by topic, title, author, or DOI. Explore metadata and open the publisher or DOI page.</p>
          </div>
        </section>

        <div className="mb-6 flex space-x-2 border-b border-slate-200 dark:border-[#2A2A2A]">
          <button
            onClick={() => setActiveTab("search")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "search" ? "border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}
          >
            Search Papers
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "saved" ? "border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}
          >
            Saved Papers ({savedPapers.length})
          </button>
        </div>

        {activeTab === "search" && (
          <>
            <form onSubmit={(event) => runSearch(event)} className="mb-7 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818] sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Search research papers</span>
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search a topic, paper title, author, or DOI"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-[#333] dark:bg-[#101010] dark:text-white dark:focus:border-indigo-400 dark:focus:bg-[#151515]"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label="Clear search input"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </label>
                <button type="submit" disabled={!searchInput.trim() || loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search papers
                </button>
                {activeQuery && (
                  <button type="button" onClick={clearSearch} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-[#333] dark:bg-[#181818] dark:text-slate-200 dark:hover:bg-[#222]">
                    Clear
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-[#2A2A2A] sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <ArrowDownWideNarrow className="h-4 w-4" /> Refine results
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <CalendarDays className="h-4 w-4" /> Published
                  <select
                    value={yearInput}
                    onChange={(event) => setYearInput(event.target.value)}
                    aria-label="Publication date range"
                    className="h-9 w-32 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 dark:border-[#333] dark:bg-[#101010] dark:text-slate-200"
                  >
                    <option value="">Any time</option>
                    <option value="1">This year</option>
                    <option value="2">Last 2 years</option>
                    <option value="5">Last 5 years</option>
                    <option value="10">Last 10 years</option>
                  </select>
                </label>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:ml-auto">
                  <span>Sort by</span>
                  <button type="button" title="Ranks by topic relevance, field-and-year-normalized citation impact, recency, and metadata; retraction signals are demoted." onClick={() => { setSortMode([]); if (activeQuery) { setWorks([]); setNextCursor(null); setSemanticOffset(0); setSemanticHasMore(false); setOpenAlexPage(1); setOpenAlexHasMore(false); setSourceWarnings([]); void fetchWorks(activeQuery, activeYear, "relevance", "*", false); } }} aria-pressed={sortMode.length === 0} className={`h-9 rounded-lg border px-3 text-xs font-medium ${sortMode.length === 0 ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300" : "border-slate-200 bg-white text-slate-600 dark:border-[#333] dark:bg-[#101010] dark:text-slate-300"}`}>Smart</button>
                  {(["newest", "cited"] as const).map((criterion) => <label key={criterion} className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors ${sortMode.includes(criterion) ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[#333] dark:bg-[#101010] dark:text-slate-300 dark:hover:bg-[#181818]"}`}>
                    <div className="relative flex items-center justify-center">
                      <input type="checkbox" checked={sortMode.includes(criterion)} onChange={() => handleSortChange(criterion)} className="peer sr-only" />
                      <div className="h-4 w-4 rounded-[4px] border border-slate-300 bg-white transition-colors peer-checked:border-indigo-600 peer-checked:bg-indigo-600 dark:border-slate-600 dark:bg-[#181818] dark:peer-checked:border-indigo-500 dark:peer-checked:bg-indigo-500"></div>
                      <svg className="pointer-events-none absolute h-3 w-3 stroke-white opacity-0 transition-opacity peer-checked:opacity-100" viewBox="0 0 16 16" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3.5 8 6.5 11 12.5 4"></polyline>
                      </svg>
                    </div>
                    {criterion === "newest" ? "Newest" : "Most cited"}
                    <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${sortMode.includes(criterion) && sortMode.length > 1 ? "bg-indigo-200 text-indigo-800 dark:bg-indigo-400/20 dark:text-indigo-200" : "hidden"}`}>{sortMode.indexOf(criterion) + 1}</span>
                  </label>)}
                </div>
              </div>
            </form>

            {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{error}</div>}
            {sourceWarnings.length > 0 && <div role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">Some search sources are temporarily unavailable; results may be incomplete. {sourceWarnings.join(" · ")}</div>}
          </>
        )}

        {activeTab === "search" && !activeQuery && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"><FileSearch className="h-5 w-5" /></div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Start with a research question or keyword</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try a broad topic, a specific title, or an author’s name.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {SUGGESTED_SEARCHES.map((term) => <button key={term} onClick={() => runSearch(undefined, term)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-[#333] dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300">{term}</button>)}
                </div>
              </div>
            </div>
          </section>
        )}

        {(activeTab === "saved" || activeQuery) && (
          <section aria-live="polite">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                  {activeTab === "saved" ? "Saved Papers" : "Search results"}
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {activeTab === "saved" ? "Your Reading List" : `${activeQuery}${activeYear ? (activeYear === "1" ? " · This year" : ` · Last ${activeYear} years`) : ""}`}
                </h2>
              </div>
              {!loading && <p className="text-sm text-slate-500 dark:text-slate-400">{displayWorks.length} papers</p>}
            </div>

            {loading && displayWorks.length === 0 && activeTab === "search" ? (
              <div className="space-y-3">{[0, 1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-[#2A2A2A] dark:bg-[#181818]" />)}</div>
            ) : displayWorks.length === 0 && !error ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-[#333]">
                <FileSearch className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 font-semibold text-slate-800 dark:text-white">{activeTab === "saved" ? "No saved papers" : "No papers found"}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{activeTab === "saved" ? "Papers you bookmark will appear here." : "Try a shorter keyword or remove the year filter."}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayWorks.map((work, index) => {
                  const title = work.title?.[0] || "Untitled work";
                  const paperUrl = getPaperUrl(work);
                  const hasPdf = !!work.link?.some((link) => link["content-type"]?.toLowerCase().includes("pdf") && link.URL);
                  const citationCount = work["is-referenced-by-count"];
                  const copyKey = work.DOI || title;
                  const contextKey = `${work.DOI || title}-${index}`;
                  const updates = work["update-to"] || [];
                  const seriousUpdates = updates.filter((update) => ["retraction", "expression-of-concern"].includes((update.type || "").toLowerCase()));
                  const correctionUpdates = updates.filter((update) => (update.type || "").toLowerCase() === "correction");
                  const knownAuthors = !!work.author?.some((author) => author.name || author.given || author.family);
                  const knownAbstract = !!work.abstract?.trim();
                  
                  const paperId = getPaperId(work);
                  const safeId = paperId.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
                  const isSaved = currentUser ? savedPaperIds.has(safeId) : false;

                  return (
                    <article key={`${work.DOI || title}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-[#2A2A2A] dark:bg-[#181818] dark:hover:border-indigo-500/30 sm:p-6">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{formatWorkType(work.type)}</span>
                        {work.sourceLabels?.map((source) => <span key={source} className="rounded-full border border-slate-200 px-2 py-1 text-slate-500 dark:border-[#333] dark:text-slate-400">{source}</span>)}
                        <span>{getWorkYear(work)}</span>
                        {typeof citationCount === "number" && <span>· {citationCount.toLocaleString()} citations</span>}
                        {work.openAlexMetrics?.topOnePercent && <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Top 1% by field/year citations</span>}
                        {!work.openAlexMetrics?.topOnePercent && work.openAlexMetrics?.topTenPercent && <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Top 10% by field/year citations</span>}
                        {work.openAlexMetrics?.isRetracted && <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">Retraction flag in OpenAlex</span>}
                      </div>
                      <h3 className="mt-3 text-base font-bold leading-snug text-slate-900 dark:text-white sm:text-lg">{title}</h3>
                      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{getAuthors(work)}</p>
                      {work["container-title"]?.[0] && <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-500">{work["container-title"][0]}</p>}
                      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{getAbstractSnippet(work.abstract)}</p>
                      <div className="mt-4 border-y border-slate-100 dark:border-[#2A2A2A]">
                        <button
                          type="button"
                          aria-expanded={expandedContextKey === contextKey}
                          onClick={() => setExpandedContextKey((current) => current === contextKey ? null : contextKey)}
                          className="flex min-h-10 w-full items-center justify-between gap-3 py-2.5 text-left"
                        >
                          <span className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"><Info className="h-3.5 w-3.5 text-indigo-500" /> Research context</span>
                          <span className="flex items-center gap-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">{expandedContextKey === contextKey ? "Hide details" : "Show details"}<ChevronDown className={`h-4 w-4 transition-transform ${expandedContextKey === contextKey ? "rotate-180" : ""}`} /></span>
                        </button>
                        {expandedContextKey === contextKey && <div className="pb-3 pt-1">
                        <div className="flex flex-wrap gap-2">
                          {seriousUpdates.map((update, updateIndex) => (
                            <span key={`serious-${update.DOI || updateIndex}`} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-100 px-2.5 py-1.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-500/15 dark:text-rose-300">
                              <ShieldAlert className="h-3.5 w-3.5" /> {update.label || ((update.type || "").toLowerCase() === "retraction" ? "Retraction notice linked" : "Expression of concern linked")}
                              {update.DOI && <a href={getDoiUrl(update.DOI)} target="_blank" rel="noreferrer" className="underline underline-offset-2">View notice</a>}
                            </span>
                          ))}
                          {!seriousUpdates.length && correctionUpdates.map((update, updateIndex) => (
                            <span key={`correction-${update.DOI || updateIndex}`} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                              <Info className="h-3.5 w-3.5" /> {update.label || "Correction linked"}
                              {update.DOI && <a href={getDoiUrl(update.DOI)} target="_blank" rel="noreferrer" className="underline underline-offset-2">View notice</a>}
                            </span>
                          ))}
                          {!seriousUpdates.length && !correctionUpdates.length && <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:bg-[#181818] dark:text-slate-300"><Info className="h-3.5 w-3.5 text-slate-400" /> No update linked in Crossref</span>}
                          {typeof work["references-count"] === "number" && <span className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:bg-[#181818] dark:text-slate-300">{work["references-count"].toLocaleString()} references listed</span>}
                          <span className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${knownAbstract ? "bg-white text-slate-600 dark:bg-[#181818] dark:text-slate-300" : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"}`}>{knownAbstract ? "Abstract available" : "No abstract metadata"}</span>
                          <span className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${knownAuthors ? "bg-white text-slate-600 dark:bg-[#181818] dark:text-slate-300" : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"}`}>{knownAuthors ? "Author metadata available" : "Author metadata missing"}</span>
                        </div>
                        <p className="mt-2.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">These are context signals, not a quality verdict. Crossref does not verify peer review, and an unlisted update does not prove that none exists. Review the paper’s methods and check the publisher’s record.</p>
                        </div>}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-[#2A2A2A]">
                        {paperUrl && <a href={paperUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700">{hasPdf ? "Open PDF" : "View publication"} <ArrowUpRight className="h-3.5 w-3.5" /></a>}
                        <button onClick={() => void findFreeFullText(work, copyKey)} disabled={freeTextLinks[copyKey]?.loading} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15">{freeTextLinks[copyKey]?.loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <BookOpenText className="h-3.5 w-3.5" />}{freeTextLinks[copyKey]?.loading ? "Finding free copy…" : "Find free full text"}</button>
                        {freeTextLinks[copyKey]?.url && <a href={freeTextLinks[copyKey].url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Open free version <ArrowUpRight className="h-3.5 w-3.5" /></a>}
                        {work.DOI && <a href={getDoiUrl(work.DOI)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-[#333] dark:text-slate-300 dark:hover:bg-[#222]">DOI <ArrowUpRight className="h-3.5 w-3.5" /></a>}
                        <button onClick={() => void handleCopyCitation(work)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-[#333] dark:text-slate-300 dark:hover:bg-[#222]"><Copy className="h-3.5 w-3.5" />{copiedDoi === copyKey ? "Citation copied" : "Copy citation"}</button>
                        
                        <button
                          type="button"
                          onClick={() => toggleBookmark(work)}
                          className={`ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${isSaved ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[#333] dark:bg-[#181818] dark:text-slate-300 dark:hover:bg-[#222]"}`}
                        >
                          {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                          {isSaved ? "Saved" : "Save"}
                        </button>
                      </div>
                    </article>
                  );
                })}
                {activeTab === "search" && (nextCursor || semanticHasMore || openAlexHasMore) && <div className="flex justify-center py-4"><button onClick={loadMore} disabled={loadingMore} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-[#333] dark:bg-[#181818] dark:text-slate-200 dark:hover:bg-[#222]">{loadingMore && <LoaderCircle className="h-4 w-4 animate-spin" />}Load more papers</button></div>}
              </div>
            )}
            {activeTab === "search" && <p className="mt-5 text-center text-[11px] text-slate-400">Search results combine Crossref and OpenAlex, with Semantic Scholar included when reachable; duplicate records are merged by DOI or title and year. Abstract and full-text availability vary by source and publisher.</p>}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
