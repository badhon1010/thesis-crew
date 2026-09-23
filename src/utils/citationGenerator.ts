import type { PublicationFormData } from "@/components/ui/PublicationModal";

// Helper to format names: "John Doe" -> "Doe, J."
function formatNameAPA(fullName: string): string {
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return parts[0];
  const last = parts.pop();
  const initials = parts.map(p => p[0].toUpperCase() + ".").join(" ");
  return `${last}, ${initials}`;
}

// Helper to format names: "John Doe" -> "J. Doe"
function formatNameIEEE(fullName: string): string {
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return parts[0];
  const last = parts.pop();
  const initials = parts.map(p => p[0].toUpperCase() + ".").join(" ");
  return `${initials} ${last}`;
}

export function generateAPACitation(data: PublicationFormData): string {
  // Authors
  let authorStr = "";
  if (data.authors && data.authors.length > 0) {
    const formatted = data.authors.map(formatNameAPA);
    if (formatted.length === 1) authorStr = formatted[0];
    else if (formatted.length === 2) authorStr = `${formatted[0]}, & ${formatted[1]}`;
    else authorStr = formatted.slice(0, -1).join(", ") + `, & ${formatted[formatted.length - 1]}`;
  }

  // Year
  const date = data.publicationDate || data.submissionDate;
  const year = date ? new Date(date).getFullYear() : "n.d.";

  // Title
  let title = data.title || "";
  if (title && !title.endsWith(".") && !title.endsWith("?")) title += ".";

  // Venue details
  let venueStr = "";
  if (data.venue) {
    venueStr = data.venue;
    if (data.volume) venueStr += `, ${data.volume}`;
    if (data.pages) venueStr += `, ${data.pages}`;
  }

  // Combine
  let citation = `${authorStr} (${year}). ${title} ${venueStr}.`;
  if (data.doi) {
    citation += ` https://doi.org/${data.doi}`;
  } else if (data.paperUrl) {
    citation += ` Retrieved from ${data.paperUrl}`;
  }

  return citation.trim();
}

export function generateIEEECitation(data: PublicationFormData): string {
  // Authors
  let authorStr = "";
  if (data.authors && data.authors.length > 0) {
    const formatted = data.authors.map(formatNameIEEE);
    if (formatted.length === 1) authorStr = formatted[0];
    else if (formatted.length === 2) authorStr = `${formatted[0]} and ${formatted[1]}`;
    else authorStr = formatted.slice(0, -1).join(", ") + `, and ${formatted[formatted.length - 1]}`;
  }

  // Title
  let title = data.title ? `"${data.title},"` : "";

  // Venue
  let venueStr = data.venue ? data.venue : "";
  if (data.volume) venueStr += `, vol. ${data.volume}`;
  if (data.pages) venueStr += `, pp. ${data.pages}`;

  // Date
  const date = data.publicationDate || data.submissionDate;
  let dateStr = "";
  if (date) {
    const d = new Date(date);
    dateStr = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
  }

  // Combine
  let citation = `${authorStr}, ${title} ${venueStr}`;
  if (dateStr) citation += `, ${dateStr}.`;
  else citation += ".";

  if (data.doi) {
    citation += ` doi: ${data.doi}.`;
  }

  return citation.trim();
}
