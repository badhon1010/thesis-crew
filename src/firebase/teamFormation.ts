import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firestore";
import type { ResearchTopic } from "./researchTopics";
import type { AIMatchAnalysis } from "@/lib/ai";

export type JoinRequestStatus = "pending" | "accepted" | "rejected";
export type RequestType = "individual" | "group";

export interface StudentRequestProfile {
  name?: string;
  email?: string;
  department?: string;
  cgpa?: string;
  skills?: string[];
}

export interface TeamMemberInfo {
  name: string;
  studentId: string;
  uid: string;
  email?: string;
  department?: string;
  cgpa?: string;
  skills?: string[];
}

export interface JoinRequest {
  id: string;
  projectId: string;
  topicTitle: string;
  supervisorId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentDepartment: string;
  studentCgpa: string;
  studentSkills: string[];
  topicRequiredSkills: string[];
  message: string;
  maxTeamSize: number;
  status: JoinRequestStatus;
  requestType: RequestType;
  teamMembers?: TeamMemberInfo[];
  teamLeaderId?: string;
  aiMatchAnalysis?: AIMatchAnalysis;
  createdAt?: unknown;
  reviewedAt?: unknown;
  reviewedBy?: string;
}

function requestId(projectId: string, studentId: string) {
  return `${projectId}_${studentId}`;
}

/** Creates one stable request per student and research topic. */
export async function submitJoinRequest(
  topic: ResearchTopic,
  studentId: string,
  profile: StudentRequestProfile,
  message = "",
  aiMatchAnalysis?: AIMatchAnalysis,
) {
  const joinRequestRef = doc(db, "joinRequests", requestId(topic.id, studentId));

  await runTransaction(db, async (transaction) => {
    const existingRequest = await transaction.get(joinRequestRef);
    if (existingRequest.exists()) {
      throw new Error("You have already sent a request for this research topic.");
    }

    transaction.set(joinRequestRef, {
      projectId: topic.id,
      topicTitle: topic.title,
      supervisorId: topic.supervisorId,
      studentId,
      studentName: profile.name || "Unnamed student",
      studentEmail: profile.email || "",
      studentDepartment: profile.department || "",
      studentCgpa: profile.cgpa || "",
      studentSkills: profile.skills || [],
      topicRequiredSkills: topic.requiredSkills || [],
      message: message.trim().slice(0, 400),
      maxTeamSize: topic.maxTeamSize,
      status: "pending" satisfies JoinRequestStatus,
      requestType: "individual" satisfies RequestType,
      aiMatchAnalysis: aiMatchAnalysis || null,
      createdAt: serverTimestamp(),
    });
  });
}

/** Submit a group join request with multiple team members */
export async function submitGroupJoinRequest(
  topic: ResearchTopic,
  leaderId: string,
  leaderProfile: StudentRequestProfile,
  teamMembers: TeamMemberInfo[],
  message = "",
  aiMatchAnalysis?: AIMatchAnalysis,
) {
  const joinRequestRef = doc(db, "joinRequests", requestId(topic.id, leaderId));

  await runTransaction(db, async (transaction) => {
    const existingRequest = await transaction.get(joinRequestRef);
    if (existingRequest.exists()) {
      throw new Error("You have already sent a request for this research topic.");
    }

    // Validate team size
    const totalMembers = teamMembers.length;
    if (totalMembers > topic.maxTeamSize) {
      throw new Error(`Team size (${totalMembers}) exceeds the maximum allowed (${topic.maxTeamSize}).`);
    }

    // Check all team members for duplicate student IDs
    const studentIds = teamMembers.map(m => m.studentId);
    const uniqueIds = new Set(studentIds);
    if (studentIds.length !== uniqueIds.size) {
      throw new Error("Duplicate student IDs found in team members.");
    }

    transaction.set(joinRequestRef, {
      projectId: topic.id,
      topicTitle: topic.title,
      supervisorId: topic.supervisorId,
      studentId: leaderId,
      studentName: leaderProfile.name || "Unnamed student",
      studentEmail: leaderProfile.email || "",
      studentDepartment: leaderProfile.department || "",
      studentCgpa: leaderProfile.cgpa || "",
      studentSkills: leaderProfile.skills || [],
      topicRequiredSkills: topic.requiredSkills || [],
      message: message.trim().slice(0, 400),
      maxTeamSize: topic.maxTeamSize,
      status: "pending" satisfies JoinRequestStatus,
      requestType: "group" satisfies RequestType,
      teamMembers,
      teamLeaderId: leaderId,
      aiMatchAnalysis: aiMatchAnalysis || null,
      createdAt: serverTimestamp(),
    });
  });
}

/** Students may withdraw a pending request before a supervisor reviews it. */
export async function cancelJoinRequest(projectId: string, studentId: string) {
  const joinRequestRef = doc(db, "joinRequests", requestId(projectId, studentId));

  await runTransaction(db, async (transaction) => {
    const requestSnapshot = await transaction.get(joinRequestRef);
    if (!requestSnapshot.exists()) throw new Error("This join request no longer exists.");

    const request = requestSnapshot.data() as Omit<JoinRequest, "id">;
    if (request.studentId !== studentId) throw new Error("You cannot cancel this join request.");
    if (request.status !== "pending") throw new Error("Only pending join requests can be cancelled.");

    transaction.delete(joinRequestRef);
  });
}

/**
 * Accepting a request adds the student(s) to the topic's single shared team.
 * For group requests, all team members are added.
 * The transaction enforces the topic's maximum student capacity.
 */
export async function reviewJoinRequest(
  requestIdValue: string,
  supervisorId: string,
  decision: Extract<JoinRequestStatus, "accepted" | "rejected">,
) {
  const joinRequestRef = doc(db, "joinRequests", requestIdValue);

  await runTransaction(db, async (transaction) => {
    const requestSnapshot = await transaction.get(joinRequestRef);
    if (!requestSnapshot.exists()) throw new Error("This join request no longer exists.");

    const request = requestSnapshot.data() as Omit<JoinRequest, "id">;
    if (request.supervisorId !== supervisorId) throw new Error("You cannot review this join request.");
    if (request.status !== "pending") throw new Error("This join request has already been reviewed.");

    if (decision === "rejected") {
      transaction.update(joinRequestRef, {
        status: decision,
        reviewedBy: supervisorId,
        reviewedAt: serverTimestamp(),
      });
      return;
    }

    const teamRef = doc(db, "teams", request.projectId);
    const teamSnapshot = await transaction.get(teamRef);
    const existingMemberIds = teamSnapshot.exists()
      ? ((teamSnapshot.data().memberIds as string[] | undefined) ?? [])
      : [];

    // For group requests, add leader and all team members
    const newMemberIds: string[] = [];
    if (request.requestType === "group" && request.teamMembers && request.teamMembers.length > 0) {
      // Add the leader
      if (!existingMemberIds.includes(request.studentId)) {
        newMemberIds.push(request.studentId);
      }
      
      // Add the other members
      for (const member of request.teamMembers) {
        if (!existingMemberIds.includes(member.uid)) {
          newMemberIds.push(member.uid);
        }
      }
    } else {
      // Individual request
      if (!existingMemberIds.includes(request.studentId)) {
        newMemberIds.push(request.studentId);
      }
    }

    // Check if adding new members would exceed capacity
    if (existingMemberIds.length + newMemberIds.length > request.maxTeamSize) {
      throw new Error("Adding this request would exceed the maximum team size.");
    }

    transaction.update(joinRequestRef, {
      status: decision,
      reviewedBy: supervisorId,
      reviewedAt: serverTimestamp(),
    });

    if (teamSnapshot.exists()) {
      transaction.update(teamRef, {
        memberIds: [...existingMemberIds, ...newMemberIds],
        updatedAt: serverTimestamp(),
      });
    } else {
      transaction.set(teamRef, {
        projectId: request.projectId,
        topicTitle: request.topicTitle,
        supervisorId: request.supervisorId,
        memberIds: newMemberIds,
        maxTeamSize: request.maxTeamSize,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  });
}

export interface Team {
  projectId: string;
  topicTitle: string;
  supervisorId: string;
  memberIds: string[];
  maxTeamSize: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Fetches all research groups (teams) for a given supervisor where
 * the team has reached its maximum capacity (memberIds.length === maxTeamSize).
 */
export async function getFullCapacityTeams(supervisorId: string): Promise<Team[]> {
  const { collection, query, where, getDocs } = await import("firebase/firestore");

  const teamsQuery = query(
    collection(db, "teams"),
    where("supervisorId", "==", supervisorId)
  );

  const snapshot = await getDocs(teamsQuery);

  return snapshot.docs
    .map((doc) => doc.data() as Team)
    .filter((team) => team.memberIds.length >= team.maxTeamSize);
}
