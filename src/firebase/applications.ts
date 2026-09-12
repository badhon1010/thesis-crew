import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firestore";

export interface ApplicationInput {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentUid: string;
  topicId: string;
  topicTitle: string;
  supervisorId: string;
  supervisorName: string;
  motivation: string;
  status: "pending" | "approved" | "rejected";
}

export interface Application extends ApplicationInput {
  id: string;
  createdAt?: unknown;
}

const applicationsCollection = collection(db, "applications");

export async function createApplication(
  appData: ApplicationInput
): Promise<string> {
  const docRef = await addDoc(applicationsCollection, {
    ...appData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getStudentApplicationForTopic(
  studentUid: string,
  topicId: string
): Promise<Application | null> {
  const q = query(
    applicationsCollection,
    where("studentUid", "==", studentUid),
    where("topicId", "==", topicId)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as ApplicationInput),
  }));

  // Return pending application if one exists, otherwise most recent application
  const pendingApp = docs.find((app) => app.status === "pending");
  return pendingApp || docs[0];
}
