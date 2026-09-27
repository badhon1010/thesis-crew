import { collection, getDocs, query, serverTimestamp, where, doc, updateDoc, deleteDoc, getDoc, writeBatch } from "firebase/firestore";
import { db } from "./firestore";

export interface ResearchTopicInput {
  title: string;
  description: string;
  category: string;
  requiredSkills: string[];
  maxTeamSize: number;
  applicationDeadline: string;
  researchObjectives: string;
  supervisorId: string;
  supervisorName: string;
  status: "draft" | "published";
}

export interface ResearchTopic extends ResearchTopicInput {
  id: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  publishedAt?: unknown;
}

const researchTopicsCollection = collection(db, "researchTopics");

export async function createResearchTopic(
  topic: ResearchTopicInput
): Promise<string> {
  const docRef = doc(researchTopicsCollection);
  
  const batch = writeBatch(db);
  
  batch.set(docRef, {
    ...topic,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(topic.status === "published" ? { publishedAt: serverTimestamp() } : {}),
  });

  batch.set(doc(db, "researchGroups", docRef.id), {
    supervisorId: topic.supervisorId,
    groupStatus: "ongoing",
    publishedCount: 0,
    progress: 0,
    updatedAt: serverTimestamp(),
  });

  // Auto-create "General" chat group atomically
  const conversationRef = doc(collection(db, "researchGroups", docRef.id, "conversations"));
  batch.set(conversationRef, {
    name: "General",
    createdAt: serverTimestamp(),
    hiddenBy: []
  });

  await batch.commit();

  return docRef.id;
}

export async function getResearchTopics(): Promise<ResearchTopic[]> {
  const snapshot = await getDocs(researchTopicsCollection);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as ResearchTopicInput),
  }));
}

export async function getTeacherResearchTopics(
  supervisorId: string
): Promise<ResearchTopic[]> {
  const topicsQuery = query(
    researchTopicsCollection,
    where("supervisorId", "==", supervisorId)
  );

  const snapshot = await getDocs(topicsQuery);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as ResearchTopicInput),
  }));
}

export async function getPublishedResearchTopics(): Promise<ResearchTopic[]> {
  const topicsQuery = query(
    researchTopicsCollection,
    where("status", "==", "published")
  );

  const snapshot = await getDocs(topicsQuery);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as ResearchTopicInput),
  }));
}

export async function getResearchTopicById(id: string): Promise<ResearchTopic | null> {
  const docRef = doc(db, "researchTopics", id);
  const snapshot = await getDoc(docRef);
  
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as ResearchTopic;
  }
  return null;
}

export async function updateResearchTopic(id: string, data: Partial<ResearchTopicInput>): Promise<void> {
  const docRef = doc(db, "researchTopics", id);
  const currentTopic = await getDoc(docRef);
  const isBeingPublished = data.status === "published" && currentTopic.exists() && currentTopic.data().status !== "published";
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
    ...(isBeingPublished ? { publishedAt: serverTimestamp() } : {}),
  });
}

export async function deleteResearchTopic(id: string): Promise<void> {
  const batch = writeBatch(db);

  // 1. Delete the topic itself
  const docRef = doc(db, "researchTopics", id);
  batch.delete(docRef);

  // 2. Delete the associated team (if any)
  const teamRef = doc(db, "teams", id);
  batch.delete(teamRef);

  // 3. Delete all associated join requests
  const joinRequestsQuery = query(collection(db, "joinRequests"), where("projectId", "==", id));
  const joinRequestsSnapshot = await getDocs(joinRequestsQuery);
  joinRequestsSnapshot.docs.forEach((requestDoc) => {
    batch.delete(requestDoc.ref);
  });

  await batch.commit();
}
