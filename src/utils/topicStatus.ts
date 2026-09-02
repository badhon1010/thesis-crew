import type { ResearchTopic } from "@/firebase/researchTopics";

const NEW_TOPIC_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function toDate(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate() as Date;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/** Newly published topics retain their label for seven days. */
export function isNewlyPublishedTopic(topic: ResearchTopic, now = Date.now()) {
  const publishedAt = toDate(topic.publishedAt ?? topic.createdAt);
  if (!publishedAt) return false;
  const age = now - publishedAt.getTime();
  return age >= 0 && age <= NEW_TOPIC_WINDOW_MS;
}
