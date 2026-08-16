import { addDoc, collection, getDocs, query, serverTimestamp, where, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
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
}

const researchTopicsCollection = collection(db, "researchTopics");

export async function createResearchTopic(
  topic: ResearchTopicInput
): Promise<string> {
  const docRef = await addDoc(researchTopicsCollection, {
    ...topic,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

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
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteResearchTopic(id: string): Promise<void> {
  const docRef = doc(db, "researchTopics", id);
  await deleteDoc(docRef);
}