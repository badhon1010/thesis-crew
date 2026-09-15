import { collection, getDocs, query, serverTimestamp, where, writeBatch, doc } from "firebase/firestore";
import { db } from "./firestore";

export interface AppNotification {
  id: string;
  recipientId: string;
  type: "new_topic" | "task_update" | "milestone_completed";
  title: string;
  message: string;
  groupId?: string;
  topicId?: string;
  read: boolean;
  createdAt?: unknown;
}

/** Creates one in-app notification for every registered student. */
export async function notifyStudentsOfNewTopic(topicId: string, topicTitle: string, supervisorName: string) {
  const students = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
  const studentIds = students.docs.map((student) => student.id);

  // Firestore batches support no more than 500 writes; reserve a little room.
  for (let index = 0; index < studentIds.length; index += 450) {
    const batch = writeBatch(db);
    studentIds.slice(index, index + 450).forEach((studentId) => {
      batch.set(doc(db, "notifications", `new-topic_${topicId}_${studentId}`), {
        recipientId: studentId,
        type: "new_topic" satisfies AppNotification["type"],
        title: "New research topic available",
        message: `${supervisorName} published “${topicTitle}”.`,
        topicId,
        read: false,
        createdAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
}

export async function notifyTeacherOfTaskUpdate(teacherId: string, groupId: string, taskTitle: string, newStatus: string, studentName: string) {
  const batch = writeBatch(db);
  batch.set(doc(db, "notifications", `task-update_${groupId}_${Date.now()}_${teacherId}`), {
    recipientId: teacherId,
    type: "task_update" satisfies AppNotification["type"],
    title: "Task Status Updated",
    message: `${studentName} moved task "${taskTitle}" to ${newStatus}.`,
    groupId,
    read: false,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function notifyTeacherOfMilestoneCompletion(teacherId: string, groupId: string, milestoneTitle: string) {
  const batch = writeBatch(db);
  batch.set(doc(db, "notifications", `milestone-complete_${groupId}_${Date.now()}_${teacherId}`), {
    recipientId: teacherId,
    type: "milestone_completed" satisfies AppNotification["type"],
    title: "Milestone Completed",
    message: `Milestone "${milestoneTitle}" has been fully completed!`,
    groupId,
    read: false,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}
