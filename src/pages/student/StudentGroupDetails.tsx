import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  FileText,
  Calendar,
  GitBranch,
  BookOpen,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Link as LinkIcon,
  Upload,
  ChevronUp,
  ChevronDown,
  Minus,
  MessageSquare,
  MapPin,
  Copy,
  ExternalLink,
  ChevronRight,
  Video,
  ListTodo,
  Quote,
  Loader2,
  Search,
  Share2,
  Globe,
  Code2,
  GraduationCap,
  FileDown,
  Award,
  Sparkles,
  Send,
  Building2,
  Presentation,
  Target,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

import { ToastAlert } from "@/components/common/ToastAlert";
import { GroupChat } from "@/components/chat/GroupChat";
import { auth } from "@/firebase/auth";
import { StudentProfileModal } from "@/components/common/StudentProfileModal";
import { MilestoneViewModal } from "@/components/ui/MilestoneViewModal";
import { TaskViewModal } from "@/components/ui/TaskViewModal";
import { MeetingViewModal } from "@/components/ui/MeetingViewModal";
import { PublicationModal, type PublicationFormData, type PublicationStatus, type PublicationType } from "@/components/ui/PublicationModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DocumentModal } from "@/components/ui/DocumentModal";
import { rtdb } from "@/firebase/database";
import { ref as dbRef, get as dbGet, remove as dbRemove } from "firebase/database";
import { storage } from "@/firebase/storage";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import {
  doc,
  getDoc,
  collection,
  query,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { notifyTeacherOfTaskUpdate, notifyTeacherOfMilestoneCompletion } from "@/firebase/notifications";
import { UserAvatar } from "@/components/common/UserAvatar";

interface ResearchTopic {
  id: string;
  title: string;
  category: string;
  description: string;
  requiredSkills?: string[];
  maxTeamSize: number;
  applicationDeadline?: string;
  researchObjectives?: string;
  supervisorId?: string;
  supervisorName?: string;
  status?: string;
}

interface TeamMember {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  department?: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: "planned" | "in-progress" | "completed";
  createdAt?: unknown;
}

interface TaskStatusEvent {
  from: string;
  to: string;
  byUid: string;
  byName: string;
  at: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string[];
  status: "todo" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
  milestoneId?: string;
  createdBy?: string;
  createdByName?: string;
  lastMovedBy?: string;
  lastMovedByName?: string;
  lastMovedAt?: string;
  statusHistory?: TaskStatusEvent[];
  createdAt?: unknown;
}

interface Document {
  id: string;
  title: string;
  type: "paper" | "dataset" | "code" | "presentation" | "other";
  url: string;
  uploadedBy: string;
  uploadedAt?: unknown;
  isLink?: boolean;
  rtdbPath?: string;
  fileName?: string;
  fileType?: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time?: string;
  duration: string;
  type?: "online" | "offline";
  platform?: "google_meet" | "zoom" | "microsoft_teams" | "other";
  location?: string;
  meetingLink?: string;
  notes?: string;
  agenda?: string;
  attendees: string[];
  createdBy?: string;
  createdAt?: unknown;
}

interface Publication {
  id: string;
  title: string;
  venue: string;
  publisher?: string;
  type: PublicationType | "conference" | "journal" | "workshop" | "preprint" | string;
  status: PublicationStatus | "draft" | "submitted" | "under-review" | "accepted" | "published" | "rejected" | string;
  authors?: string[];
  abstract?: string;
  keywords?: string[];
  submissionDate?: string;
  acceptanceDate?: string;
  publicationDate?: string;
  doi?: string;
  paperUrl?: string;
  codeUrl?: string;
  projectUrl?: string;
  overleafUrl?: string;
  volume?: string;
  pages?: string;
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  generatedCitations?: {
    apa: string;
    ieee: string;
  };
}

type TabType = "overview" | "milestones" | "tasks" | "chat" | "documents" | "meetings" | "publications";
type MeetingSubTab = "upcoming" | "past" | "all";

  const getMeetingTime = (meeting: Meeting): number => {
  let meetingDateTime = new Date(meeting.date).getTime();
  if (meeting.time) {
    const timeMatch = meeting.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const period = timeMatch[3].toUpperCase();
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      meetingDateTime = new Date(`${meeting.date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`).getTime();
    }
  }
  return meetingDateTime;
};

export default function StudentGroupDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [expandedPubId, setExpandedPubId] = useState<string | null>(null);
  const [topic, setTopic] = useState<ResearchTopic | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingSubTab, setMeetingSubTab] = useState<MeetingSubTab>("upcoming");
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<{ id: string; updatedAt?: any }[]>([]);
  
  const [lastViewed, setLastViewed] = useState<Record<string, number>>(() => {
    const stored = localStorage.getItem(`group_${id}_lastViewed`);
    return stored ? JSON.parse(stored) : { overview: Date.now() };
  });
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);
  const [viewingMilestone, setViewingMilestone] = useState<Milestone | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);

  const [isPublicationModalOpen, setIsPublicationModalOpen] = useState(false);
  const [editingPublication, setEditingPublication] = useState<Publication | null>(null);
  const [deletePublicationId, setDeletePublicationId] = useState<string | null>(null);
  const [copiedPubId, setCopiedPubId] = useState<string | null>(null);
  const [pubSectionTab, setPubSectionTab] = useState<"all" | "published" | "ongoing">("all");
  const [pubSearch, setPubSearch] = useState("");
  const [pubStatusFilter, setPubStatusFilter] = useState<"all" | Publication["status"]>("all");
  const [pubTypeFilter, setPubTypeFilter] = useState<"all" | Publication["type"]>("all");

  // Document states
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [documentFilter, setDocumentFilter] = useState<"all" | "files" | "links">("all");
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  const toMillis = (val: unknown): number => {
    if (!val) return 0;
    if (typeof (val as { toMillis?: () => number }).toMillis === "function") {
      return (val as { toMillis: () => number }).toMillis();
    }
    if (typeof (val as { seconds?: number }).seconds === "number") {
      return (val as { seconds: number }).seconds * 1000;
    }
    return 0;
  };

  const sortedDocuments = useMemo(
    () => [...documents].sort((a, b) => toMillis(b.uploadedAt) - toMillis(a.uploadedAt)),
    [documents]
  );

  const filteredDocuments = useMemo(
    () =>
      sortedDocuments.filter((d) =>
        documentFilter === "all" ? true : documentFilter === "files" ? !d.isLink : !!d.isLink
      ),
    [sortedDocuments, documentFilter]
  );

  const [toast, setToast] = useState<{ show: boolean; type: "success" | "error"; message: string }>({
    show: false,
    type: "success",
    message: "",
  });
  const [copiedMeetingId, setCopiedMeetingId] = useState<string | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ show: true, type, message });
  };

  useEffect(() => {
    if (!id) return;

    let unsubscribeTeam: Unsubscribe | undefined;
    let unsubscribeMilestones: Unsubscribe | undefined;
    let unsubscribeTasks: Unsubscribe | undefined;
    let unsubscribeDocuments: Unsubscribe | undefined;
    let unsubscribeMeetings: Unsubscribe | undefined;
    let unsubscribePublications: Unsubscribe | undefined;
    let unsubscribeConversations: Unsubscribe | undefined;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch Topic Details
        const topicRef = doc(db, "researchTopics", id);
        const topicSnap = await getDoc(topicRef);

        if (!topicSnap.exists()) {
          showToast("error", "Research topic not found.");
          setLoading(false);
          return;
        }

        setTopic({ id: topicSnap.id, ...topicSnap.data() } as ResearchTopic);

        // Subscribe to team members
        unsubscribeTeam = onSnapshot(
          doc(db, "teams", id),
          async (teamSnapshot) => {
            if (!teamSnapshot.exists()) {
              setTeamMembers([]);
              return;
            }

            const teamData = teamSnapshot.data();
            const memberIds = (teamData.memberIds as string[]) || [];

            if (memberIds.length > 0) {
              const membersMap = new Map<string, TeamMember>();
              await Promise.all(memberIds.map(async (memberId) => {
                try {
                  const userDoc = await getDoc(doc(db, "users", memberId));
                  if (userDoc.exists()) {
                    const data = userDoc.data();
                    membersMap.set(memberId, {
                      studentId: memberId,
                      studentName: data.name || "Unnamed student",
                      studentEmail: data.email,
                      department: data.department,
                    });
                  } else {
                    membersMap.set(memberId, {
                      studentId: memberId,
                      studentName: "Unnamed student",
                    });
                  }
                } catch (error) {
                  console.error("Failed to load team member profile:", error);
                  membersMap.set(memberId, {
                    studentId: memberId,
                    studentName: "Unnamed student",
                  });
                }
              }));

              setTeamMembers(Array.from(membersMap.values()));
            } else {
              setTeamMembers([]);
            }
          },
          (error) => console.error("Failed to load team data:", error)
        );

        // Subscribe to milestones
        unsubscribeMilestones = onSnapshot(
          query(collection(db, "researchGroups", id, "milestones")),
          (snapshot) => {
            const milestonesData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Milestone[];
            setMilestones(milestonesData.sort((a, b) => {
              if (a.status === "completed" && b.status !== "completed") return 1;
              if (a.status !== "completed" && b.status === "completed") return -1;
              return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            }));
          },
          (error) => console.error("Failed to load milestones:", error)
        );

        // Subscribe to tasks
        unsubscribeTasks = onSnapshot(
          query(collection(db, "researchGroups", id, "tasks")),
          (snapshot) => {
            const tasksData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Task[];
            setTasks(tasksData);
          },
          (error) => console.error("Failed to load tasks:", error)
        );

        // Subscribe to documents
        unsubscribeDocuments = onSnapshot(
          query(collection(db, "researchGroups", id, "documents")),
          (snapshot) => {
            const docsData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Document[];
            setDocuments(docsData);
          },
          (error) => console.error("Failed to load documents:", error)
        );

        // Subscribe to meetings
        unsubscribeMeetings = onSnapshot(
          query(collection(db, "researchGroups", id, "meetings")),
          (snapshot) => {
            const meetingsData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Meeting[];
            setMeetings(meetingsData.sort((a, b) => {
              const now = new Date().getTime();
              const aTime = new Date(a.date).getTime();
              const bTime = new Date(b.date).getTime();
              const aIsPast = aTime < now;
              const bIsPast = bTime < now;

              if (aIsPast && !bIsPast) return 1;
              if (!aIsPast && bIsPast) return -1;
              
              if (!aIsPast && !bIsPast) {
                return aTime - bTime;
              } else {
                return bTime - aTime;
              }
            }));
          },
          (error) => console.error("Failed to load meetings:", error)
        );

        // Subscribe to publications
        unsubscribePublications = onSnapshot(
          query(collection(db, "researchGroups", id, "publications")),
          (snapshot) => {
            const pubsData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Publication[];
            setPublications(pubsData);
          },
          (error) => console.error("Failed to load publications:", error)
        );

        // Subscribe to conversations for chat unread status
        unsubscribeConversations = onSnapshot(
          query(collection(db, "researchGroups", id, "conversations")),
          (snapshot) => {
            const convData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setConversations(convData);
          },
          (error) => console.error("Failed to load conversations:", error)
        );

        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        showToast("error", "Failed to load research group data.");
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      unsubscribeTeam?.();
      unsubscribeMilestones?.();
      unsubscribeTasks?.();
      unsubscribeDocuments?.();
      unsubscribeMeetings?.();
      unsubscribePublications?.();
      unsubscribeConversations?.();
    };
  }, [id]);

  const getProgressPercentage = () => {
    if (milestones.length === 0) return 0;
    const completed = milestones.filter((m) => m.status === "completed").length;
    return Math.round((completed / milestones.length) * 100);
  };

  const getTaskStats = () => {
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === "completed").length,
      inProgress: tasks.filter((t) => t.status === "in-progress").length,
      todo: tasks.filter((t) => t.status === "todo").length,
    };
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: "todo" | "in-progress" | "completed", targetMilestoneId: string) => {
    e.preventDefault();
    const taskId = draggedTaskId;
    
    if (!taskId || !id) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    if ((task.milestoneId || "unassigned") !== targetMilestoneId) {
      showToast("error", "Cannot drag a task to a different milestone");
      setDraggedTaskId(null);
      return;
    }

    if (task.status !== newStatus) {
      try {
        const moverUid = auth.currentUser?.uid || "";
        const moverName = auth.currentUser?.displayName || "Student";
        const nowIso = new Date().toISOString();
        await updateDoc(doc(db, "researchGroups", id, "tasks", taskId), {
          status: newStatus,
          lastMovedBy: moverUid,
          lastMovedByName: moverName,
          lastMovedAt: nowIso,
          statusHistory: [...(task.statusHistory || []), { from: task.status, to: newStatus, byUid: moverUid, byName: moverName, at: nowIso }],
        });

        // Notify Teacher of task update
        if (topic?.supervisorId && auth.currentUser?.displayName) {
          await notifyTeacherOfTaskUpdate(topic.supervisorId, id, task.title, newStatus, auth.currentUser.displayName);
        }

        // Auto-complete milestone if all tasks are completed
        if (newStatus === "completed" && task.milestoneId) {
          const milestoneTasks = tasks.filter(t => t.milestoneId === task.milestoneId);
          // Check if all OTHER tasks in this milestone are already completed
          const allOthersCompleted = milestoneTasks
            .filter(t => t.id !== taskId)
            .every(t => t.status === "completed");
            
          if (allOthersCompleted) {
            await updateDoc(doc(db, "researchGroups", id, "milestones", task.milestoneId), {
              status: "completed",
            });
            showToast("success", "Milestone auto-completed! All tasks are done.");
            
            const milestone = milestones.find(m => m.id === task.milestoneId);
            if (topic?.supervisorId && milestone) {
              await notifyTeacherOfMilestoneCompletion(topic.supervisorId, id, milestone.title);
            }
          }
        }

      } catch (error) {
        console.error("Error updating task status:", error);
        showToast("error", "Failed to update task status");
      }
    }
    setDraggedTaskId(null);
  };

  const handleSaveDocument = async (data: { title: string; type: string; url: string; file: File | null; isLink: boolean }) => {
    if (!id || !auth.currentUser) return;
    try {
      let documentUrl = data.url;
      let rtdbPath: string | null = null;

      if (!data.isLink && data.file) {
        console.log("Uploading file to Firebase Storage:", data.file.name, "Size:", data.file.size);
        
        const safeFileName = data.file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const docKey = `${Date.now()}_${safeFileName}`;
        rtdbPath = `researchGroups/${id}/documents/${docKey}`;
        
        const fileRef = storageRef(storage, rtdbPath);
        await uploadBytes(fileRef, data.file);
        documentUrl = await getDownloadURL(fileRef);
        console.log("Firebase Storage upload finished.");
      }

      const currentStudent = teamMembers.find(
        (m) => m.studentEmail === auth.currentUser?.email || m.studentId === auth.currentUser?.uid
      );
      const uploaderName = currentStudent?.studentName || auth.currentUser.displayName || "Student";

      console.log("Saving document metadata to Firestore...");
      await addDoc(collection(db, "researchGroups", id, "documents"), {
        title: data.title,
        type: data.type,
        url: documentUrl,
        isLink: data.isLink,
        rtdbPath,
        fileName: data.file?.name || null,
        fileType: data.file?.type || null,
        uploadedBy: uploaderName,
        uploadedAt: serverTimestamp(),
      });

      showToast("success", "Resource added successfully");
    } catch (error) {
      console.error("Error saving document:", error);
      showToast("error", "Failed to upload document");
      throw error;
    }
  };

  const triggerDeleteDocument = (docData: Document) => {
    setDocumentToDelete(docData);
  };

  const confirmDeleteDocument = async () => {
    if (!id || !documentToDelete) return;
    setIsDeletingDoc(true);
    try {
      if (!documentToDelete.isLink && documentToDelete.rtdbPath) {
        if (documentToDelete.rtdbPath.startsWith("researchGroupDocuments/")) {
          await dbRemove(dbRef(rtdb, documentToDelete.rtdbPath)).catch((e) =>
            console.error("Error deleting from Realtime Database", e)
          );
        } else {
          const fileRef = storageRef(storage, documentToDelete.rtdbPath);
          await deleteObject(fileRef).catch((e) =>
            console.error("Error deleting from Storage", e)
          );
        }
      }
      await deleteDoc(doc(db, "researchGroups", id, "documents", documentToDelete.id));
      showToast("success", "Resource deleted successfully");
    } catch (error) {
      console.error("Error deleting document:", error);
      showToast("error", "Failed to delete resource");
    } finally {
      setIsDeletingDoc(false);
      setDocumentToDelete(null);
    }
  };

  const handleViewDocument = async (docData: Document) => {
    if (docData.isLink || (!docData.rtdbPath?.startsWith("researchGroupDocuments/") && docData.url)) {
      window.open(docData.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (!docData.rtdbPath) {
      showToast("error", "This file is no longer available.");
      return;
    }
    setViewingDocId(docData.id);
    try {
      if (docData.rtdbPath.startsWith("researchGroupDocuments/")) {
        const snapshot = await dbGet(dbRef(rtdb, docData.rtdbPath));
        if (!snapshot.exists()) {
          showToast("error", "This file is no longer available.");
          return;
        }
        const stored = snapshot.val() as { data: string; type?: string; name?: string };
        const res = await fetch(stored.data);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      }
    } catch (error) {
      console.error("Error opening document:", error);
      showToast("error", "Failed to open this file.");
    } finally {
      setViewingDocId(null);
    }
  };



  const handleSavePublication = async (data: PublicationFormData) => {
    if (!id || !auth.currentUser) return;
    try {
      const payload = {
        ...data,
        acceptanceDate: data.status === "accepted" || data.status === "published" ? data.publicationDate || "" : "",
        updatedAt: serverTimestamp(),
      };
      if (editingPublication) {
        await updateDoc(doc(db, "researchGroups", id, "publications", editingPublication.id), payload);
        showToast("success", "Publication updated successfully");
      } else {
        await addDoc(collection(db, "researchGroups", id, "publications"), {
          ...payload,
          createdBy: auth.currentUser?.displayName || "Student",
          createdAt: serverTimestamp(),
        });
        showToast("success", "Publication added successfully");
      }
      setIsPublicationModalOpen(false);
      setEditingPublication(null);
    } catch (error) {
      console.error("Error saving publication:", error);
      showToast("error", "Failed to save publication");
      throw error;
    }
  };

  const handleDeletePublication = async () => {
    if (!id || !deletePublicationId) return;

    try {
      await deleteDoc(doc(db, "researchGroups", id, "publications", deletePublicationId));
      showToast("success", "Publication removed successfully");
    } catch (error) {
      console.error("Error deleting publication:", error);
      showToast("error", "Failed to remove publication");
    } finally {
      setDeletePublicationId(null);
    }
  };

  const getPublicationShareText = (pub: Publication) => {
    const links: string[] = [];
    if (pub.doi) links.push(`https://doi.org/${pub.doi}`);
    if (pub.paperUrl) links.push(pub.paperUrl);
    if (pub.overleafUrl) links.push(`Overleaf: ${pub.overleafUrl}`);
    if (pub.projectUrl) links.push(pub.projectUrl);
    return `${pub.title} — ${pub.venue}${links.length ? `\n${links.join("\n")}` : ""}`;
  };

  const handleCopyPublicationLink = async (pub: Publication, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const bestLink = pub.paperUrl || (pub.doi ? `https://doi.org/${pub.doi}` : "") || pub.overleafUrl || pub.projectUrl || pub.codeUrl || "";
    const text = bestLink || getPublicationShareText(pub);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPubId(pub.id);
      showToast("success", bestLink ? "Publication link copied — ready to share." : "Citation copied to clipboard.");
      setTimeout(() => setCopiedPubId(null), 2000);
    } catch {
      showToast("error", "Failed to copy link");
    }
  };

  const handleNativeSharePublication = async (pub: Publication, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareUrl = pub.paperUrl || (pub.doi ? `https://doi.org/${pub.doi}` : "") || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: pub.title,
          text: `${pub.title} (${pub.venue})`,
          url: shareUrl,
        });
        return;
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === "AbortError") return;
      }
    }
    handleCopyPublicationLink(pub);
  };

  const handleCopyCitation = async (pub: Publication, format: "apa" | "ieee", e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = pub.generatedCitations?.[format];
    if (!text) {
      showToast("error", "Citation not available for this publication.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPubId(pub.id + format);
      showToast("success", `${format.toUpperCase()} citation copied to clipboard.`);
      setTimeout(() => setCopiedPubId(null), 2000);
    } catch {
      showToast("error", "Failed to copy citation");
    }
  };

  const handleCopyMeetingLink = (meeting: Meeting) => {
    if (!meeting.meetingLink) return;
    navigator.clipboard.writeText(meeting.meetingLink).then(() => {
      setCopiedMeetingId(meeting.id);
      showToast("success", "Meeting link copied to clipboard!");
      setTimeout(() => setCopiedMeetingId(null), 2000);
    });
  };

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="mx-auto max-w-6xl px-2 sm:px-4">
          <div className="mb-6 h-10 w-48 animate-pulse rounded-full bg-slate-200 dark:bg-[#181818]"></div>
          
          <div className="mb-8 h-48 w-full animate-pulse rounded-3xl bg-slate-200 dark:bg-[#181818]"></div>
          
          <div className="mb-8 h-12 w-full max-w-3xl animate-pulse rounded-full bg-slate-200 dark:bg-[#181818]"></div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-[#181818]"></div>
            ))}
          </div>
          
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="h-96 animate-pulse rounded-2xl bg-slate-200 lg:col-span-2 dark:bg-[#181818]"></div>
            <div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-[#181818]"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!topic) {
    return (
      <DashboardLayout role="student">
        <div className="mx-auto max-w-4xl py-12 text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Research Group Not Found</h2>
          <button
            onClick={() => navigate("/student/my-groups")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Research Groups
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Eye className="h-4 w-4" /> },
    { id: "milestones", label: "Milestones", icon: <GitBranch className="h-4 w-4" /> },
    { id: "tasks", label: "Tasks", icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: "chat", label: "Group Chat", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
    { id: "meetings", label: "Meetings", icon: <Calendar className="h-4 w-4" /> },
    { id: "publications", label: "Publications", icon: <BookOpen className="h-4 w-4" /> },
  ];

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    const updatedLastViewed = { ...lastViewed, [tabId]: Date.now() };
    setLastViewed(updatedLastViewed);
    localStorage.setItem(`group_${id}_lastViewed`, JSON.stringify(updatedLastViewed));
  };

  const hasUnread = (tabId: TabType) => {
    const lastTime = lastViewed[tabId] || 0;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getMaxTime = (items: any[], dateField = "createdAt") => {
      let max = 0;
      items.forEach(item => {
        const t = item[dateField];
        let millis = 0;
        if (t && t.toMillis) millis = t.toMillis();
        else if (t instanceof Date) millis = t.getTime();
        else if (typeof t === "string") millis = new Date(t).getTime();
        
        if (millis > max) max = millis;
      });
      return max;
    };

    switch (tabId) {
      case "milestones":
        return getMaxTime(milestones) > lastTime;
      case "tasks":
        return getMaxTime(tasks) > lastTime;
      case "documents":
        return getMaxTime(documents) > lastTime;
      case "meetings":
        return getMaxTime(meetings, "createdAt") > lastTime;
      case "publications":
        return getMaxTime(publications, "createdAt") > lastTime;
      case "chat":
        return getMaxTime(conversations, "updatedAt") > lastTime;
      default:
        return false;
    }
  };

  return (
    <DashboardLayout role="student">
      <ToastAlert
        show={toast.show}
        type={toast.type}
        message={toast.message}
        duration={3000}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />

      <StudentProfileModal
        isOpen={!!selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
        studentId={selectedStudentId || ""}
        hideCgpa={true}
      />

      <MilestoneViewModal
        isOpen={viewingMilestone !== null}
        milestone={viewingMilestone}
        onClose={() => setViewingMilestone(null)}
      />

      <TaskViewModal
        isOpen={viewingTask !== null}
        task={viewingTask}
        milestoneName={viewingTask?.milestoneId ? milestones.find(m => m.id === viewingTask.milestoneId)?.title : undefined}
        assigneeNames={(viewingTask?.assignedTo || []).map((sid) => teamMembers.find((m) => m.studentId === sid)?.studentName || "Unknown member")}
        onClose={() => setViewingTask(null)}
      />

      <div className="mx-auto max-w-6xl px-2 sm:px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/student/my-groups")}
            className="group inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-indigo-600 transition-all hover:scale-105 active:scale-95 dark:bg-[#181818] dark:text-slate-300 dark:ring-[#2A2A2A] dark:hover:bg-[#222] dark:hover:text-indigo-400"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Research Groups
          </button>
        </div>

        {/* Title Card */}
        <div className="relative mb-6 rounded-2xl bg-indigo-50/50 p-6 shadow-sm border border-indigo-100 dark:bg-[#181818] dark:border-[#2A2A2A] dark:shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                  {topic.category}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                    publications.some((pub) => pub.status === "published")
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                  }`}
                >
                  <div className={`h-1.5 w-1.5 rounded-full ${publications.some((pub) => pub.status === "published") ? "bg-emerald-500" : "bg-amber-500"}`}></div>
                  {publications.some((pub) => pub.status === "published") ? "Published" : "Ongoing"}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{topic.title}</h1>
              
              <div className="mt-4 flex items-center gap-3">
                <UserAvatar 
                  userId={topic.supervisorId} 
                  name={topic.supervisorName || "Supervisor"} 
                  className="h-9 w-9 text-sm"
                />
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Supervisor</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{topic.supervisorName || "N/A"}</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-shrink-0 items-center justify-center rounded-xl bg-white p-4 shadow-sm border border-slate-200 dark:bg-[#181818] dark:border-[#2A2A2A]">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle className="text-slate-100 dark:text-slate-800 stroke-current" strokeWidth="10" cx="50" cy="50" r="40" fill="transparent"></circle>
                  <circle 
                    className="text-indigo-500 stroke-current transition-all duration-1000 ease-out" 
                    strokeWidth="10" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" 
                    strokeDasharray={`${2 * Math.PI * 40}`} 
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - getProgressPercentage() / 100)}`}
                  ></circle>
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-slate-900 dark:text-white">
                  <span className="text-sm font-bold">{getProgressPercentage()}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-20 z-20 -mx-6 mb-8 bg-[#fcfcfd]/90 px-6 py-3 backdrop-blur-xl transition-all dark:bg-[#000000]/90 border-b border-slate-200/50 dark:border-slate-800/50 lg:-mx-10 lg:px-10">
          <div className="overflow-x-auto pb-1">
            <div className="flex w-full min-w-max items-center gap-1 rounded-full bg-slate-100/80 p-1.5 dark:bg-[#181818]">
              {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const hasNotification = tab.id !== activeTab && hasUnread(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-[#2A2A2A] dark:text-indigo-400"
                      : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#222] dark:hover:text-slate-200"
                  }`}
                >
                  <div className={`${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`}>
                    {tab.icon}
                  </div>
                  {tab.label}
                  {hasNotification && (
                    <span className="absolute right-1 top-1 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

        {/* Tab Content */}
        <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
          {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-[#2A2A2A] dark:bg-[#181818]">
                <div className="absolute bottom-0 left-0 h-1 w-0 bg-indigo-500 transition-all duration-300 group-hover:w-full"></div>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-transform duration-300 group-hover:scale-110 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Team Size</span>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                      {teamMembers.length} <span className="text-sm font-medium text-slate-400">/ {topic.maxTeamSize}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => handleTabChange("milestones")}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer dark:border-[#2A2A2A] dark:bg-[#181818]"
              >
                <div className="absolute bottom-0 left-0 h-1 w-0 bg-emerald-500 transition-all duration-300 group-hover:w-full"></div>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform duration-300 group-hover:scale-110 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <GitBranch className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors group-hover:text-emerald-600 dark:text-slate-400 dark:group-hover:text-emerald-400">Progress</span>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{getProgressPercentage()}%</p>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => handleTabChange("tasks")}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer dark:border-[#2A2A2A] dark:bg-[#181818]"
              >
                <div className="absolute bottom-0 left-0 h-1 w-0 bg-blue-500 transition-all duration-300 group-hover:w-full"></div>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform duration-300 group-hover:scale-110 dark:bg-blue-500/10 dark:text-blue-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors group-hover:text-blue-600 dark:text-slate-400 dark:group-hover:text-blue-400">Tasks</span>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                      {getTaskStats().completed} <span className="text-sm font-medium text-slate-400">/ {getTaskStats().total}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => handleTabChange("publications")}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer dark:border-[#2A2A2A] dark:bg-[#181818]"
              >
                <div className="absolute bottom-0 left-0 h-1 w-0 bg-amber-500 transition-all duration-300 group-hover:w-full"></div>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-transform duration-300 group-hover:scale-110 dark:bg-amber-500/10 dark:text-amber-400">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors group-hover:text-amber-600 dark:text-slate-400 dark:group-hover:text-amber-400">Publications</span>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{publications.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left: Team Members & Description */}
              <div className="space-y-6 lg:col-span-2">
                {/* Description */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Research Description</h2>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {topic.description}
                  </p>
                </div>

                {/* Team Members */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Team Members</h2>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      {teamMembers.length}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {teamMembers.map((member) => (
                      <div
                        key={member.studentId}
                        onClick={() => setSelectedStudentId(member.studentId)}
                        className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all hover:-translate-y-1 hover:bg-white hover:shadow-md active:scale-[0.98] dark:border-[#2A2A2A] dark:bg-[#0F0F0F] dark:hover:bg-[#181818]"
                      >
                        <UserAvatar 
                          userId={member.studentId} 
                          name={member.studentName} 
                          className="h-10 w-10 text-sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{member.studentName}</p>
                          {member.department && (
                            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{member.department}</p>
                          )}
                        </div>
                        
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => setSelectedStudentId(member.studentId)}
                            className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                            title="View Profile"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Publications */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <h2 
                    onClick={() => handleTabChange("publications")}
                    className="mb-4 text-base font-bold text-slate-900 cursor-pointer transition-colors hover:text-orange-600 dark:text-white dark:hover:text-orange-400 inline-block"
                  >
                    Recent Publications
                  </h2>
                  <div className="space-y-3">
                    {publications.slice(0, 3).map((pub) => (
                      <div 
                        key={pub.id} 
                        onClick={() => handleTabChange("publications")}
                        className="group flex cursor-pointer items-start gap-3 rounded-lg p-2 -mx-2 transition-all hover:-translate-y-0.5 hover:bg-slate-50 active:scale-[0.98] dark:hover:bg-[#222]"
                      >
                        <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400 transition-colors group-hover:text-indigo-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">{pub.title}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-xs">
                            <span className={`capitalize font-medium ${
                              pub.status === "published" ? "text-emerald-600 dark:text-emerald-400" :
                              pub.status === "accepted" ? "text-blue-600 dark:text-blue-400" :
                              pub.status === "under-review" ? "text-amber-600 dark:text-amber-400" :
                              pub.status === "rejected" ? "text-rose-600 dark:text-rose-400" :
                              "text-slate-500 dark:text-slate-400"
                            }`}>{pub.status.replace("-", " ")}</span>
                            <span className="text-slate-400">&bull;</span>
                            <span className="truncate text-slate-500 dark:text-slate-400">{pub.venue}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {publications.length === 0 && (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-8 text-center dark:border-[#2A2A2A] dark:bg-[#181818]/50">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner dark:bg-indigo-500/20 dark:text-indigo-400">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">No publications yet</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right: Recent Activity */}
              <div className="space-y-6">
                {/* Upcoming Milestones */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <h2 
                    onClick={() => handleTabChange("milestones")}
                    className="mb-4 text-base font-bold text-slate-900 cursor-pointer transition-colors hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400 inline-block"
                  >
                    Upcoming Milestones
                  </h2>
                  <div className="space-y-3">
                    {milestones
                      .filter((m) => m.status !== "completed")
                      .slice(0, 3)
                      .map((milestone) => (
                        <div 
                          key={milestone.id} 
                          onClick={() => setViewingMilestone(milestone)}
                          className="group flex cursor-pointer items-start gap-3 rounded-lg p-2 -mx-2 transition-all hover:-translate-y-0.5 hover:bg-slate-50 active:scale-[0.98] dark:hover:bg-[#222]"
                        >
                          <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400 transition-colors group-hover:text-indigo-500" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{milestone.title}</p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              Due: {new Date(milestone.deadline).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    {milestones.filter((m) => m.status !== "completed").length === 0 && (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-8 text-center dark:border-[#2A2A2A] dark:bg-[#181818]/50">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner dark:bg-indigo-500/20 dark:text-indigo-400">
                          <Circle className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">No upcoming milestones</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Documents */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <h2 
                    onClick={() => handleTabChange("documents")}
                    className="mb-4 text-base font-bold text-slate-900 cursor-pointer transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-400 inline-block"
                  >
                    Recent Documents
                  </h2>
                  <div className="space-y-3">
                    {documents.slice(0, 3).map((doc) => (
                      <div 
                        key={doc.id} 
                        onClick={() => handleViewDocument(doc)}
                        className="group flex cursor-pointer items-start gap-3 rounded-lg p-2 -mx-2 transition-all hover:-translate-y-0.5 hover:bg-slate-50 active:scale-[0.98] dark:hover:bg-[#222]"
                      >
                        <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400 transition-colors group-hover:text-indigo-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">{doc.title}</p>
                          <p className="mt-0.5 text-xs capitalize text-slate-500 dark:text-slate-400">{doc.type}</p>
                        </div>
                      </div>
                    ))}
                    {documents.length === 0 && (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-8 text-center dark:border-[#2A2A2A] dark:bg-[#181818]/50">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner dark:bg-indigo-500/20 dark:text-indigo-400">
                          <FileText className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">No documents yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upcoming Meetings */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <h2 
                    onClick={() => handleTabChange("meetings")}
                    className="mb-4 text-base font-bold text-slate-900 cursor-pointer transition-colors hover:text-violet-600 dark:text-white dark:hover:text-violet-400 inline-block"
                  >
                    Upcoming Meetings
                  </h2>
                  <div className="space-y-3">
                    {meetings
                      .filter((m) => new Date(m.date).getTime() > new Date().getTime())
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(0, 3)
                      .map((meeting) => (
                        <div 
                          key={meeting.id} 
                          onClick={() => handleTabChange("meetings")}
                          className="group flex cursor-pointer items-start gap-3 rounded-lg p-2 -mx-2 transition-all hover:-translate-y-0.5 hover:bg-slate-50 active:scale-[0.98] dark:hover:bg-[#222]"
                        >
                          <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400 transition-colors group-hover:text-indigo-500" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">{meeting.title}</p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {new Date(meeting.date).toLocaleDateString()} at {meeting.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    {meetings.filter((m) => new Date(m.date).getTime() > new Date().getTime()).length === 0 && (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-8 text-center dark:border-[#2A2A2A] dark:bg-[#181818]/50">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner dark:bg-indigo-500/20 dark:text-indigo-400">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">No upcoming meetings</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "milestones" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Project Milestones</h2>
            </div>
            
            {/* Overall Progress Bar */}
            <div className="mb-8 rounded-xl bg-slate-50 p-4 transition-all hover:bg-slate-100 hover:shadow-inner dark:bg-[#111] dark:hover:bg-[#151515] group/progress cursor-default">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700 transition-colors group-hover/progress:text-indigo-600 dark:text-slate-300 dark:group-hover/progress:text-indigo-400">Overall Progress</span>
                <span className="font-bold text-indigo-600 transition-transform group-hover/progress:scale-110 dark:text-indigo-400">{getProgressPercentage()}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-1000 ease-out group-hover/progress:bg-indigo-600 group-hover/progress:shadow-[0_0_10px_rgba(99,102,241,0.5)] dark:group-hover/progress:bg-indigo-400"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
              <div className="mt-3 flex gap-4 text-xs font-medium text-slate-500 transition-all group-hover/progress:opacity-100 opacity-80 dark:text-slate-400">
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm"></div>Completed</div>
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-500 shadow-sm"></div>In Progress</div>
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-rose-500 shadow-sm"></div>Overdue</div>
              </div>
            </div>

            <div className="space-y-4">
              {milestones.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center dark:border-[#2A2A2A] dark:bg-[#181818]/50">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner dark:bg-indigo-500/20 dark:text-indigo-400">
                    <GitBranch className="h-8 w-8" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">No Milestones Yet</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your supervisor has not created any milestones for this project yet.</p>
                </div>
              ) : (
                milestones.map((milestone) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const deadlineDate = new Date(milestone.deadline);
                  const isOverdue = deadlineDate < today && milestone.status !== "completed";
                  const milestoneTasks = tasks.filter((t) => t.milestoneId === milestone.id);
                  const completedTasksCount = milestoneTasks.filter(t => t.status === "completed").length;
                  const totalTasksCount = milestoneTasks.length;
                  const taskProgress = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
                  
                  const borderColor = milestone.status === "completed" 
                    ? "border-l-emerald-500" 
                    : isOverdue 
                    ? "border-l-rose-500" 
                    : milestone.status === "in-progress"
                    ? "border-l-amber-500"
                    : "border-l-blue-500";

                  const isExpanded = expandedMilestoneId === milestone.id;

                  return (
                    <div
                      key={milestone.id}
                      onClick={() => setViewingMilestone(milestone)}
                      className={`group relative cursor-pointer overflow-hidden rounded-xl border-y border-r border-l-4 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-[0.99] ${borderColor} ${
                        isOverdue 
                          ? "border-y-rose-200 border-r-rose-200 bg-rose-50/30 hover:border-y-rose-400 hover:border-r-rose-400 dark:border-y-rose-900/50 dark:border-r-rose-900/50 dark:hover:border-y-rose-500/60 dark:hover:border-r-rose-500/60 dark:bg-rose-950/10" 
                          : milestone.status === "completed" 
                          ? "border-y-slate-200 border-r-slate-200 bg-white hover:border-y-emerald-400 hover:border-r-emerald-400 dark:border-y-[#333] dark:border-r-[#333] dark:hover:border-y-emerald-500/60 dark:hover:border-r-emerald-500/60 dark:bg-[#1A1A1A]" 
                          : "border-y-slate-200 border-r-slate-200 bg-white hover:border-y-indigo-300 hover:border-r-indigo-300 dark:border-y-[#333] dark:border-r-[#333] dark:hover:border-y-indigo-500/50 dark:hover:border-r-indigo-500/50 dark:bg-[#1A1A1A]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className={`font-bold text-lg ${
                              milestone.status === "completed" 
                                ? "line-through text-slate-400 dark:text-slate-500" 
                                : isOverdue 
                                ? "text-rose-700 dark:text-rose-400" 
                                : "text-slate-900 dark:text-white"
                            }`}>
                              {milestone.title}
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                              milestone.status === "completed" 
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                : milestone.status === "in-progress"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                            }`}>
                              {milestone.status}
                            </span>
                          </div>
                          
                          <p className={`mt-2 text-sm ${isOverdue ? "text-rose-600/80 dark:text-rose-400/80" : "text-slate-600 dark:text-slate-300"}`}>
                            {milestone.description}
                          </p>
                          
                          <div className="mt-4 flex flex-wrap items-center gap-6 text-sm font-medium">
                            <div className={`flex items-center gap-1.5 ${
                              isOverdue 
                                ? "text-rose-600 dark:text-rose-400 font-bold" 
                                : "text-slate-500 dark:text-slate-400"
                            }`}>
                              <Calendar className="h-4 w-4" />
                              {isOverdue ? "Overdue: " : "Deadline: "}
                              {new Date(milestone.deadline).toLocaleDateString()}
                            </div>
                            
                            <div className="flex items-center gap-3 flex-1 max-w-[200px]">
                              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                <CheckCircle2 className="h-4 w-4" />
                                {completedTasksCount} / {totalTasksCount} Tasks
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 flex-1">
                                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${taskProgress}%` }}></div>
                              </div>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedMilestoneId(isExpanded ? null : milestone.id);
                              }}
                              className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 dark:border-[#333] dark:text-slate-300 dark:hover:bg-[#0F0F0F] transition-colors"
                            >
                              <ListTodo className="h-3 w-3" />
                              {isExpanded ? "Hide tasks" : `View tasks (${totalTasksCount})`}
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setViewingMilestone(milestone)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-[#2A2A2A] dark:hover:text-indigo-400"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </div>
                      
                      {/* Tasks under this milestone */}
                      {isExpanded && milestoneTasks.length > 0 && (
                        <div className="mt-6 border-t border-slate-100 pt-4 dark:border-[#2A2A2A]">
                          <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Associated Tasks</h4>
                          <div className="grid gap-2">
                            {milestoneTasks.map(task => (
                              <div 
                                key={task.id} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingTask(task);
                                }}
                                className="group/task flex cursor-pointer items-start gap-3 rounded-lg bg-slate-50 p-3 transition-all hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-sm active:scale-[0.99] dark:bg-[#111] dark:hover:bg-[#181818]"
                              >
                                <div className="mt-0.5">
                                  {task.status === "completed" ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  ) : task.status === "in-progress" ? (
                                    <Clock className="h-4 w-4 text-amber-500" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className={`text-sm font-medium ${task.status === "completed" ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}>
                                    {task.title}
                                  </p>
                                </div>
                                <div className="opacity-0 transition-opacity group-hover/task:opacity-100 flex items-center justify-center">
                                  <Eye className="h-4 w-4 text-indigo-400" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="space-y-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tasks Kanban Board</h2>
            </div>

            {milestones.length === 0 && tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center dark:border-[#2A2A2A] dark:bg-[#181818]/50">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner dark:bg-indigo-500/20 dark:text-indigo-400">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">No Tasks Yet</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Tasks associated with milestones will appear in this kanban board.</p>
              </div>
            ) : (
              [...milestones, { id: "unassigned", title: "Unassigned Tasks", status: "none", description: "", deadline: "" }].map((milestone) => {
                const milestoneTasks = milestone.id === "unassigned" 
                  ? tasks.filter(t => !t.milestoneId) 
                  : tasks.filter(t => t.milestoneId === milestone.id);
                  
                if (milestone.id === "unassigned" && milestoneTasks.length === 0) return null;

                return (
                  <div key={milestone.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                    <div className="mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <GitBranch className="h-5 w-5 text-indigo-500" />
                          {milestone.title}
                        </h3>
                        {milestone.id !== "unassigned" && milestone.deadline && (
                          <span className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full dark:bg-slate-800 dark:text-slate-400">
                            <Calendar className="h-3 w-3" />
                            Deadline: {new Date(milestone.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {(["todo", "in-progress", "completed"] as const).map((status) => {
                        const columnTasks = milestoneTasks.filter((t) => t.status === status).sort((a,b) => {
                          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                          return dateA - dateB;
                        });
                        
                        let title = "TO DO";
                        let columnBg = "bg-blue-50 dark:bg-blue-900/10";
                        let headerColor = "text-blue-700 dark:text-blue-400";
                        let countBg = "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
                        
                        if (status === "in-progress") {
                          title = "IN PROGRESS";
                          columnBg = "bg-amber-50 dark:bg-amber-900/10";
                          headerColor = "text-amber-700 dark:text-amber-400";
                          countBg = "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
                        } else if (status === "completed") {
                          title = "DONE";
                          columnBg = "bg-emerald-50 dark:bg-emerald-900/10";
                          headerColor = "text-emerald-700 dark:text-emerald-400";
                          countBg = "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
                        }

                        return (
                          <div
                            key={status}
                            className={`flex flex-col rounded-lg ${columnBg} p-3 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all duration-200`}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => e.currentTarget.classList.add("ring-2", "ring-indigo-400", "scale-[1.01]")}
                            onDragLeave={(e) => e.currentTarget.classList.remove("ring-2", "ring-indigo-400", "scale-[1.01]")}
                            onDrop={(e) => {
                              e.currentTarget.classList.remove("ring-2", "ring-indigo-400", "scale-[1.01]");
                              handleDrop(e, status, milestone.id);
                            }}
                          >
                            <div className="mb-3 flex items-center justify-between px-1 pt-1">
                              <div className="flex items-center gap-2">
                                <h4 className={`text-xs font-bold ${headerColor}`}>{title}</h4>
                                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${countBg}`}>
                                  {columnTasks.length}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-1 flex-col gap-1.5 min-h-[150px] pb-1">
                              {columnTasks.length === 0 ? (
                                <div className="flex flex-1 items-center justify-center rounded-[3px] border-2 border-dashed border-slate-300/50 dark:border-slate-700">
                                  <p className="text-xs text-slate-400">Drop tasks here</p>
                                </div>
                              ) : (
                                columnTasks.map((task) => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const isOverdue = task.dueDate ? new Date(task.dueDate) < today && task.status !== "completed" : false;

                                  let PriorityIcon = ChevronDown;
                                  let priorityColor = "text-blue-500";
                                  
                                  if (task.priority === "high") {
                                    PriorityIcon = ChevronUp;
                                    priorityColor = "text-rose-500";
                                  } else if (task.priority === "medium") {
                                    PriorityIcon = Minus;
                                    priorityColor = "text-amber-500";
                                  }

                                  const isAssigned = auth.currentUser ? task.assignedTo?.includes(auth.currentUser.uid) : false;

                                  return (
                                    <div
                                      key={task.id}
                                      title={isAssigned ? "" : "You are not assigned to this task"}
                                      draggable={isAssigned}
                                      onDragStart={(e) => {
                                        if (isAssigned) handleDragStart(e, task.id);
                                        else e.preventDefault();
                                      }}
                                      onClick={() => setViewingTask(task)}
                                      className={`group ${isAssigned ? 'cursor-grab active:cursor-grabbing hover:-translate-y-1' : 'cursor-not-allowed opacity-75'} rounded-xl p-3.5 shadow-sm transition-all duration-300 hover:shadow-lg border ${
                                        isOverdue
                                          ? "bg-rose-50/50 border-rose-200 hover:border-rose-400 dark:bg-rose-950/20 dark:border-rose-900/50 dark:hover:border-rose-500/60"
                                          : "bg-white border-slate-200 hover:border-indigo-300 dark:bg-[#1C1C1E] dark:border-[#333] dark:hover:border-indigo-500/50"
                                      }`}
                                    >
                                      <div className="mb-2 flex items-start justify-between gap-2">
                                        <h4 className={`text-sm font-semibold leading-snug ${
                                          status === "completed" 
                                            ? "text-slate-400 dark:text-slate-500 line-through" 
                                            : isOverdue
                                            ? "text-rose-700 dark:text-rose-400"
                                            : "text-slate-800 dark:text-slate-200"
                                        }`}>
                                          {task.title}
                                        </h4>
                                        <div className="flex flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setViewingTask(task);
                                            }}
                                            className={`rounded p-1 ${isOverdue ? "text-rose-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/50" : "text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-[#2A2A2A] dark:hover:text-indigo-400"}`}
                                          >
                                            <Eye className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between mt-3">
                                        <div className="flex items-center gap-2">
                                          <div title={`Priority: ${task.priority}`} className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                            <PriorityIcon className={`h-3.5 w-3.5 ${priorityColor}`} strokeWidth={3} />
                                          </div>
                                          {task.assignedTo && task.assignedTo.length > 0 && (
                                            <div title={`${task.assignedTo.length} Assignees`} className="flex h-6 items-center justify-center gap-1 rounded-md bg-indigo-50 px-1.5 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                                              <Users className="h-3 w-3 text-indigo-500" />
                                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{task.assignedTo.length}</span>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {task.dueDate && (
                                          <div className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-medium ${
                                            isOverdue 
                                              ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                          }`}>
                                            <Calendar className="h-3 w-3" />
                                            <span>
                                              {isOverdue ? "Overdue: " : ""}
                                              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <GroupChat 
            groupId={id!} 
            currentUserId={auth.currentUser?.uid || ""} 
            currentUserName={teamMembers.find(m => m.studentEmail === auth.currentUser?.email)?.studentName || auth.currentUser?.displayName || "Student"} 
            currentUserRole="student" 
            members={[
              ...(topic?.supervisorId ? [{ id: topic.supervisorId, name: topic.supervisorName || "Supervisor", role: "teacher" as const }] : []),
              ...teamMembers.map(m => ({ id: m.studentId, name: m.studentName, role: "student" as const }))
            ]}
          />
        )}

        {activeTab === "documents" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Documents & Resources</h2>
              <button
                onClick={() => setIsDocumentModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <Upload className="h-4 w-4" /> Upload Document
              </button>
            </div>

            {documents.length > 0 && (
              <div className="mb-6 flex gap-2">
                {(
                  [
                    { key: "all", label: "All", count: documents.length },
                    { key: "files", label: "Files", count: documents.filter((d) => !d.isLink).length },
                    { key: "links", label: "Links", count: documents.filter((d) => !!d.isLink).length },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setDocumentFilter(f.key)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      documentFilter === f.key
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                        : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-[#2A2A2A] dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {f.label} <span className="text-xs opacity-70">({f.count})</span>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center dark:border-[#2A2A2A] dark:bg-[#181818]/50">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner dark:bg-indigo-500/20 dark:text-indigo-400">
                    <FileText className="h-8 w-8" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">No Documents Yet</p>
                  <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                    Upload papers, datasets, code, and other resources relevant to your research.
                  </p>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="py-12 text-center">
                  {documentFilter === "links" ? (
                    <LinkIcon className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                  ) : (
                    <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                  )}
                  <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">
                    No {documentFilter} to show
                  </p>
                  <button
                    onClick={() => setDocumentFilter("all")}
                    className="mt-2 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Show all resources
                  </button>
                </div>
              ) : (
                filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleViewDocument(doc)}
                    className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4 hover:border-indigo-200 hover:shadow-md hover:-translate-y-1 transition-all duration-200 dark:border-[#2A2A2A] dark:hover:border-indigo-500/30 dark:hover:bg-[#1a1a1a]"
                  >
                    <div className="flex flex-1 items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          doc.type === "paper"
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                            : doc.type === "code"
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                            : doc.type === "dataset"
                            ? "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400"
                        }`}
                      >
                        {doc.isLink ? <LinkIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{doc.title}</h3>
                        <p className="mt-0.5 text-xs capitalize text-slate-500 dark:text-slate-400">
                          {doc.type} • {doc.isLink ? "Shared" : "Uploaded"} by {doc.uploadedBy}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDocument(doc);
                          }}
                          disabled={viewingDocId === doc.id}
                          className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                        >
                          {viewingDocId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerDeleteDocument(doc);
                        }}
                        disabled={isDeletingDoc}
                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "meetings" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Meetings & Discussions</h2>
              <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-[#222]">
                <button
                  onClick={() => setMeetingSubTab("upcoming")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    meetingSubTab === "upcoming"
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-[#333] dark:text-indigo-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setMeetingSubTab("past")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    meetingSubTab === "past"
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-[#333] dark:text-indigo-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Past
                </button>
                <button
                  onClick={() => setMeetingSubTab("all")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    meetingSubTab === "all"
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-[#333] dark:text-indigo-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  All
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {(() => {
                const filteredMeetings = meetings.filter((meeting) => {
                  // Only show meetings created by the supervisor (or legacy without createdBy)
                  if (meeting.createdBy && topic?.supervisorId && meeting.createdBy !== topic.supervisorId) return false;

                  if (meetingSubTab === "all") return true;
                  
                  const meetingDateTime = getMeetingTime(meeting);
                  const now = new Date().getTime();
                  if (meetingSubTab === "upcoming") return meetingDateTime >= now;
                  return meetingDateTime < now;
                });

                if (filteredMeetings.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center dark:border-[#2A2A2A] dark:bg-[#181818]/50">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner dark:bg-indigo-500/20 dark:text-indigo-400">
                        <Calendar className="h-8 w-8" />
                      </div>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">No Meetings Found</p>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your supervisor has not scheduled any meetings for this tab yet.</p>
                    </div>
                  );
                }

                const now = new Date().getTime();
                const upcomingMeetings = filteredMeetings
                  .filter((m) => getMeetingTime(m) >= now)
                  .sort((a, b) => getMeetingTime(a) - getMeetingTime(b));
                const pastMeetings = filteredMeetings
                  .filter((m) => getMeetingTime(m) < now)
                  .sort((a, b) => getMeetingTime(b) - getMeetingTime(a));

                const platformConfig: Record<string, { label: string; color: string; bg: string; darkBg: string; border: string }> = {
                  zoom: { label: "Zoom", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50", darkBg: "dark:bg-blue-500/15", border: "border-blue-200 dark:border-blue-500/30" },
                  "google-meet": { label: "Google Meet", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50", darkBg: "dark:bg-emerald-500/15", border: "border-emerald-200 dark:border-emerald-500/30" },
                  "google_meet": { label: "Google Meet", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50", darkBg: "dark:bg-emerald-500/15", border: "border-emerald-200 dark:border-emerald-500/30" },
                  "google-classroom": { label: "Google Classroom", color: "text-teal-700 dark:text-teal-300", bg: "bg-teal-50", darkBg: "dark:bg-teal-500/15", border: "border-teal-200 dark:border-teal-500/30" },
                  teams: { label: "MS Teams", color: "text-violet-700 dark:text-violet-300", bg: "bg-violet-50", darkBg: "dark:bg-violet-500/15", border: "border-violet-200 dark:border-violet-500/30" },
                  microsoft_teams: { label: "MS Teams", color: "text-violet-700 dark:text-violet-300", bg: "bg-violet-50", darkBg: "dark:bg-violet-500/15", border: "border-violet-200 dark:border-violet-500/30" },
                  custom: { label: "Online Meeting", color: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-50", darkBg: "dark:bg-indigo-500/15", border: "border-indigo-200 dark:border-indigo-500/30" },
                  other: { label: "Online Meeting", color: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-50", darkBg: "dark:bg-indigo-500/15", border: "border-indigo-200 dark:border-indigo-500/30" },
                };

                const renderMeetingCard = (meeting: Meeting, isPast: boolean) => {
                  const platform = meeting.platform || "";
                  const cfg = platformConfig[platform];

                  return (
                    <div
                      key={meeting.id}
                      onClick={() => setViewingMeeting(meeting)}
                      className={`group relative cursor-pointer overflow-hidden rounded-xl border-y border-r border-l-4 p-4 transition-all hover:-translate-y-1 hover:shadow-md active:scale-[0.99] ${
                        isPast 
                          ? "border-l-slate-400 border-y-slate-200 border-r-slate-200 bg-slate-50 opacity-75 hover:border-l-slate-500 dark:border-l-slate-600 dark:border-y-[#2A2A2A] dark:border-r-[#2A2A2A] dark:bg-[#121212]" 
                          : "border-l-indigo-500 border-y-slate-200 border-r-slate-200 bg-white hover:border-l-indigo-600 hover:border-y-indigo-500/30 hover:border-r-indigo-500/30 dark:border-l-indigo-500 dark:border-y-[#2A2A2A] dark:border-r-[#2A2A2A] dark:bg-[#1A1A1A]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{meeting.title}</h3>
                            {isPast && (
                              <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">Completed</span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              {new Date(meeting.date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              {meeting.duration}
                            </span>
                          </div>
                          {(meeting.agenda || meeting.notes) && (
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                              {meeting.agenda || meeting.notes}
                            </p>
                          )}
                          
                          {/* Platform badge + link actions OR offline location */}
                          {meeting.type === "offline" && meeting.location ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                                  isPast
                                    ? "border-slate-200 bg-slate-100 text-slate-400 dark:border-[#222] dark:bg-[#1A1A1A] dark:text-slate-500"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
                                }`}
                              >
                                <MapPin className="h-3 w-3" />
                                {meeting.location}
                              </span>
                            </div>
                          ) : platform && cfg ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                                  isPast
                                    ? "border-slate-200 bg-slate-100 text-slate-400 dark:border-[#222] dark:bg-[#1A1A1A] dark:text-slate-500"
                                    : `${cfg.border} ${cfg.bg} ${cfg.color} ${cfg.darkBg}`
                                }`}
                              >
                                <Video className="h-3 w-3" />
                                {cfg.label}
                              </span>

                              {meeting.meetingLink && (
                                <>
                                  <a
                                    href={meeting.meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                                      isPast
                                        ? "border-slate-200 text-slate-400 hover:bg-slate-100 dark:border-[#222] dark:text-slate-500 dark:hover:bg-[#1A1A1A]"
                                        : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/25"
                                    }`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Join
                                  </a>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyMeetingLink(meeting);
                                    }}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                                      copiedMeetingId === meeting.id
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
                                        : isPast
                                        ? "border-slate-200 text-slate-400 hover:bg-slate-100 dark:border-[#222] dark:text-slate-500"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#333] dark:text-slate-400 dark:hover:bg-[#0F0F0F]"
                                    }`}
                                  >
                                    <Copy className="h-3 w-3" />
                                    {copiedMeetingId === meeting.id ? "Copied!" : "Copy Link"}
                                  </button>
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center justify-center opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                          <div className="rounded-full bg-slate-100 p-2 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400">
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    {/* Upcoming */}
                    {(meetingSubTab === "all" || meetingSubTab === "upcoming") && (
                      <div>
                        {upcomingMeetings.length > 0 ? (
                          <>
                            <div className="mb-3 flex items-center gap-2">
                              <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                              </span>
                              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                Upcoming ({upcomingMeetings.length})
                              </h3>
                            </div>
                            <div className="space-y-3">
                              {upcomingMeetings.map((m) => renderMeetingCard(m, false))}
                            </div>
                          </>
                        ) : meetingSubTab === "upcoming" ? (
                          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-10 text-center dark:border-[#2A2A2A] dark:bg-[#181818]/50">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner dark:bg-indigo-500/20 dark:text-indigo-400">
                              <Calendar className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">No upcoming meetings</p>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Past */}
                    {(meetingSubTab === "all" || meetingSubTab === "past") && (
                      <div className={meetingSubTab === "all" && upcomingMeetings.length > 0 ? "mt-8" : ""}>
                        {pastMeetings.length > 0 ? (
                          <>
                            <div className="mb-3 flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Past ({pastMeetings.length})
                              </h3>
                            </div>
                            <div className="space-y-3">
                              {pastMeetings.map((m) => renderMeetingCard(m, true))}
                            </div>
                          </>
                        ) : meetingSubTab === "past" ? (
                          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-10 text-center dark:border-[#2A2A2A] dark:bg-[#181818]/50">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner dark:bg-indigo-500/20 dark:text-indigo-400">
                              <Clock className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">No past meetings</p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === "publications" && (() => {
          const typeMeta: Record<string, { label: string; tile: string; icon: React.ReactNode }> = {
            journal: { label: "Journal", tile: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300", icon: <BookOpen className="h-5 w-5" /> },
            conference: { label: "Conference", tile: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300", icon: <Presentation className="h-5 w-5" /> },
            workshop: { label: "Workshop", tile: "bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300", icon: <Target className="h-5 w-5" /> },
            preprint: { label: "Preprint", tile: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300", icon: <FileText className="h-5 w-5" /> },
            "book-chapter": { label: "Book Chapter", tile: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300", icon: <BookOpen className="h-5 w-5" /> },
            poster: { label: "Poster", tile: "bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-300", icon: <Eye className="h-5 w-5" /> },
            demo: { label: "Demo", tile: "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300", icon: <Video className="h-5 w-5" /> },
            thesis: { label: "Thesis", tile: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300", icon: <GraduationCap className="h-5 w-5" /> },
            magazine: { label: "Magazine", tile: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300", icon: <FileText className="h-5 w-5" /> },
            symposium: { label: "Symposium", tile: "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-300", icon: <Users className="h-5 w-5" /> },
            other: { label: "Other", tile: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300", icon: <FileText className="h-5 w-5" /> },
          };
          const statusStyles: Record<string, string> = {
            published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
            accepted: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
            "under-review": "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
            revision: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
            submitted: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
            rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
            draft: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
          };
          const publishedCount = publications.filter((p) => p.status === "published").length;
          const totalPublishedCount = publishedCount;
          const totalOngoingCount = publications.filter((p) => p.status !== "published").length;
          const decided = publications.filter((p) => ["published", "accepted", "rejected"].includes(p.status)).length;
          const acceptanceRate = decided === 0 ? 0 : Math.round(((publishedCount + publications.filter((p) => p.status === "accepted").length) / decided) * 100);
          const isGroupPublished = publishedCount > 0;

          const q = pubSearch.trim().toLowerCase();
          const filtered = publications
            .filter((p) => {
              if (pubSectionTab === "published") return p.status === "published";
              if (pubSectionTab === "ongoing") return p.status !== "published";
              return true;
            })
            .filter((p) => (pubStatusFilter === "all" ? true : p.status === pubStatusFilter))
            .filter((p) => (pubTypeFilter === "all" ? true : p.type === pubTypeFilter))
            .filter((p) => {
              if (!q) return true;
              return (
                p.title.toLowerCase().includes(q) ||
                p.venue.toLowerCase().includes(q) ||
                (p.authors || []).join(" ").toLowerCase().includes(q) ||
                (p.keywords || []).join(" ").toLowerCase().includes(q) ||
                (p.doi || "").toLowerCase().includes(q) ||
                (p.overleafUrl || "").toLowerCase().includes(q)
              );
            })
            .sort((a, b) => {
              const rank = (s: string) => ({ published: 0, accepted: 1, "under-review": 2, revision: 3, submitted: 4, draft: 5, rejected: 6 } as Record<string, number>)[s] ?? 7;
              return rank(a.status) - rank(b.status);
            });

          const publishedPapers = filtered.filter((p) => p.status === "published");
          const ongoingPapers = filtered.filter((p) => p.status !== "published");

          const renderPublicationCard = (pub: Publication) => {
            const meta = typeMeta[pub.type] || typeMeta.other;
            const expanded = expandedPubId === pub.id;
            const doiUrl = pub.doi ? `https://doi.org/${pub.doi}` : "";

            return (
              <article
                key={pub.id}
                className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:bg-[#181818] ${
                  pub.status === "published"
                    ? "border-emerald-200 hover:border-emerald-400 dark:border-emerald-500/30 dark:hover:border-emerald-400/60"
                    : "border-slate-200 hover:border-indigo-300 dark:border-[#2A2A2A] dark:hover:border-indigo-500/50"
                }`}
              >
                {pub.status === "published" && <div className="h-1 w-full bg-emerald-500" />}
                <div className="p-5 sm:p-6">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.tile}`}>
                        {meta.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {meta.label}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                            <Building2 className="h-3 w-3" /> {pub.venue}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold capitalize ${statusStyles[pub.status] || statusStyles.draft}`}>
                            {pub.status.replace("-", " ")}
                          </span>
                        </div>
                        <h3
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPublication(pub);
                            setIsPublicationModalOpen(true);
                          }}
                          className="mt-1.5 text-lg font-extrabold leading-snug text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors cursor-pointer"
                        >
                          {pub.title}
                        </h3>
                        {(pub.authors?.length || pub.publisher || pub.volume || pub.pages) && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {(pub.authors || []).join(", ")}
                            {pub.publisher ? ` · ${pub.publisher}` : ""}
                            {pub.volume ? ` · ${pub.volume}` : ""}
                            {pub.pages ? ` · pp. ${pub.pages}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPublication(pub);
                            setIsPublicationModalOpen(true);
                          }}
                          title="Edit publication"
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletePublicationId(pub.id);
                          }}
                          title="Remove publication"
                          className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex shrink-0 items-center justify-center opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                        <div className="rounded-full bg-slate-100 p-2 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Authors */}
                  {(pub.authors?.length ?? 0) > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {pub.authors!.slice(0, 6).map((a) => (
                        <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-1 pr-2.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          <span className="flex h-5 w-5 items-center justify-center">
                            <UserAvatar name={a} className="h-full w-full text-[10px]" />
                          </span>
                          {a}
                        </span>
                      ))}
                      {(pub.authors?.length ?? 0) > 6 && (
                        <span className="text-xs font-semibold text-slate-400">+{(pub.authors?.length ?? 0) - 6} more</span>
                      )}
                    </div>
                  )}

                  {/* Abstract */}
                  {pub.abstract && (
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-[#262626] dark:bg-[#0F0F0F]">
                      <p className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                        <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
                        <span className={expanded ? "" : "line-clamp-2"}>{pub.abstract}</span>
                      </p>
                      {pub.abstract.length > 180 && (
                        <button onClick={() => setExpandedPubId(expanded ? null : pub.id)} className="mt-1.5 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400">
                          {expanded ? "Show less" : "Read abstract"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Keywords */}
                  {(pub.keywords?.length ?? 0) > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {pub.keywords!.map((k) => (
                        <span key={k} className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-[#333] dark:text-slate-400">
                          #{k}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Dates */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {pub.submissionDate && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Submitted {new Date(pub.submissionDate).toLocaleDateString()}</span>}
                    {pub.publicationDate && <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Published {new Date(pub.publicationDate).toLocaleDateString()}</span>}
                    {pub.acceptanceDate && pub.status !== "published" && <span>Accepted {new Date(pub.acceptanceDate).toLocaleDateString()}</span>}
                  </div>

                  {/* Link bar */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-[#262626]">
                    {pub.doi && (
                      <a href={doiUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 hover:scale-105 active:scale-95 transition-all dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20">
                        <LinkIcon className="h-3 w-3" /> DOI: {pub.doi.length > 28 ? `${pub.doi.slice(0, 28)}…` : pub.doi}
                      </a>
                    )}
                    {pub.paperUrl && (
                      <a href={pub.paperUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all shadow-sm hover:shadow-md">
                        <FileDown className="h-3 w-3" /> Paper / PDF <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {pub.overleafUrl ? (
                      <a
                        href={pub.overleafUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 hover:scale-105 active:scale-95 transition-all shadow-sm hover:shadow dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Edit in Overleaf
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPublication(pub);
                          setIsPublicationModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-emerald-400 hover:bg-emerald-50/70 hover:text-emerald-700 hover:scale-105 active:scale-95 transition-all dark:border-[#333] dark:text-slate-400 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                        title="Attach Overleaf editor URL"
                      >
                        <Plus className="h-3 w-3" /> Overleaf
                      </button>
                    )}
                    {pub.codeUrl && (
                      <a href={pub.codeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all dark:border-[#333] dark:text-slate-300 dark:hover:bg-[#0F0F0F]">
                        <Code2 className="h-3 w-3" /> Code
                      </a>
                    )}
                    {pub.projectUrl && (
                      <a href={pub.projectUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all dark:border-[#333] dark:text-slate-300 dark:hover:bg-[#0F0F0F]">
                        <Globe className="h-3 w-3" /> Project page
                      </a>
                    )}
                    <div className="ml-auto flex items-center gap-1.5">
                      {pub.generatedCitations?.apa && (
                        <button
                          onClick={(e) => handleCopyCitation(pub, "apa", e)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95 ${copiedPubId === pub.id + "apa" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#333] dark:text-slate-400 dark:hover:bg-[#0F0F0F]"}`}
                        >
                          <Copy className="h-3 w-3" /> {copiedPubId === pub.id + "apa" ? "Copied APA" : "APA"}
                        </button>
                      )}
                      {pub.generatedCitations?.ieee && (
                        <button
                          onClick={(e) => handleCopyCitation(pub, "ieee", e)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95 ${copiedPubId === pub.id + "ieee" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#333] dark:text-slate-400 dark:hover:bg-[#0F0F0F]"}`}
                        >
                          <Copy className="h-3 w-3" /> {copiedPubId === pub.id + "ieee" ? "Copied IEEE" : "IEEE"}
                        </button>
                      )}
                      <button
                        onClick={(e) => handleCopyPublicationLink(pub, e)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95 ${copiedPubId === pub.id ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#333] dark:text-slate-400 dark:hover:bg-[#0F0F0F]"}`}
                      >
                        <Copy className="h-3 w-3" /> {copiedPubId === pub.id ? "Copied!" : "Copy link"}
                      </button>
                      <button
                        onClick={(e) => handleNativeSharePublication(pub, e)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all dark:border-[#333] dark:text-slate-400 dark:hover:bg-[#0F0F0F]"
                      >
                        <Share2 className="h-3 w-3" /> Share
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          };

          return (
            <div className="space-y-6">
              {/* Minimal header */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                      <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">Publications & Research Outputs</h2>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {publications.length} total
                        {isGroupPublished ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400"> · Published ({totalPublishedCount})</span>
                        ) : (
                          <span> · In Progress ({totalOngoingCount})</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingPublication(null);
                      setIsPublicationModalOpen(true);
                    }}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" /> Add Publication
                  </button>
                </div>
              </div>

              {/* Published celebration */}
              {isGroupPublished && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                      This group has {totalPublishedCount} published paper{totalPublishedCount === 1 ? "" : "s"} live!
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                      The header badge, group status and citations reflect these outputs. Keep tracking new submissions in the pipeline.
                    </p>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: "Total outputs", section: "all", filter: "all", value: publications.length, icon: <BookOpen className="h-4 w-4" />, cls: "text-indigo-600 dark:text-indigo-400 border-transparent hover:border-indigo-300 dark:hover:border-indigo-500/50" },
                  { label: "Published papers", section: "published", filter: "all", value: totalPublishedCount, icon: <CheckCircle2 className="h-4 w-4" />, cls: "text-emerald-600 dark:text-emerald-400 border-transparent hover:border-emerald-300 dark:hover:border-emerald-500/50" },
                  { label: "In pipeline", section: "ongoing", filter: "all", value: totalOngoingCount, icon: <Send className="h-4 w-4" />, cls: "text-amber-600 dark:text-amber-400 border-transparent hover:border-amber-300 dark:hover:border-amber-500/50" },
                  { label: "Acceptance rate", section: "all", filter: "accepted", value: `${acceptanceRate}%`, icon: <Sparkles className="h-4 w-4" />, cls: "text-violet-600 dark:text-violet-400 border-transparent hover:border-violet-300 dark:hover:border-violet-500/50" },
                ].map((s) => (
                  <div
                    key={s.label}
                    onClick={() => {
                      setPubSectionTab(s.section as any);
                      if (s.filter && s.filter !== "all") setPubStatusFilter(s.filter as any);
                      else setPubStatusFilter("all");
                    }}
                    className={`group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md active:scale-95 dark:border-[#2A2A2A] dark:bg-[#181818] ${s.cls}`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide opacity-80 group-hover:opacity-100 transition-opacity">
                      {s.icon} <span className="group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{s.label}</span>
                    </div>
                    <p className="mt-1.5 text-2xl font-extrabold text-slate-900 group-hover:scale-105 origin-left transition-transform dark:text-white">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Sub-tab view switcher & filter toolbar */}
              {publications.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-[#222]">
                      <button
                        onClick={() => {
                          setPubSectionTab("all");
                          setPubStatusFilter("all");
                        }}
                        className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                          pubSectionTab === "all"
                            ? "bg-white text-indigo-700 shadow-sm dark:bg-[#333] dark:text-indigo-400"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        }`}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>All Outputs ({publications.length})</span>
                      </button>
                      <button
                        onClick={() => {
                          setPubSectionTab("published");
                          setPubStatusFilter("all");
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                          pubSectionTab === "published"
                            ? "bg-white text-emerald-700 shadow-sm dark:bg-[#333] dark:text-emerald-400"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Published Papers ({totalPublishedCount})</span>
                      </button>
                      <button
                        onClick={() => {
                          setPubSectionTab("ongoing");
                          setPubStatusFilter("all");
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                          pubSectionTab === "ongoing"
                            ? "bg-white text-amber-700 shadow-sm dark:bg-[#333] dark:text-amber-400"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        <span>Ongoing Submissions ({totalOngoingCount})</span>
                      </button>
                    </div>

                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Showing {filtered.length} of {publications.length}
                    </div>
                  </div>

                  {/* Search and Filters Toolbar */}
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818] lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={pubSearch}
                        onChange={(e) => setPubSearch(e.target.value)}
                        placeholder="Search title, venue, author, keyword, DOI…"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white"
                      />
                    </div>

                    {/* Status filter pills */}
                    {pubSectionTab !== "published" && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(pubSectionTab === "ongoing"
                          ? (["all", "under-review", "submitted", "accepted", "revision", "draft", "rejected"] as const)
                          : (["all", "published", "under-review", "submitted", "accepted", "draft", "rejected"] as const)
                        ).map((s) => (
                          <button
                            key={s}
                            onClick={() => setPubStatusFilter(s)}
                            className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition-all ${
                              pubStatusFilter === s
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            }`}
                          >
                            {s === "all" ? (pubSectionTab === "ongoing" ? "All Ongoing" : "All Status") : s.replace("-", " ")}
                          </button>
                        ))}
                      </div>
                    )}

                    <select
                      value={pubTypeFilter}
                      onChange={(e) => setPubTypeFilter(e.target.value as Publication["type"] | "all")}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-[#333] dark:bg-[#0F0F0F] dark:text-slate-300"
                    >
                      <option value="all">All types</option>
                      <option value="journal">Journal</option>
                      <option value="conference">Conference</option>
                      <option value="workshop">Workshop</option>
                      <option value="preprint">Preprint</option>
                      <option value="book-chapter">Book chapter</option>
                      <option value="poster">Poster</option>
                      <option value="demo">Demo</option>
                      <option value="thesis">Thesis</option>
                      <option value="magazine">Magazine</option>
                      <option value="symposium">Symposium</option>
                      <option value="other">Other</option>
                    </select>

                    {(pubSearch || pubStatusFilter !== "all" || pubTypeFilter !== "all") && (
                      <button
                        onClick={() => {
                          setPubSearch("");
                          setPubStatusFilter("all");
                          setPubTypeFilter("all");
                        }}
                        className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400 whitespace-nowrap"
                      >
                        Reset filters
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* List */}
              {publications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                    <BookOpen className="h-8 w-8" />
                  </div>
                  <p className="mt-4 text-base font-bold text-slate-900 dark:text-white">No publications yet — start the group&apos;s story</p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                    Add a journal article, conference paper, arXiv preprint, poster or thesis. Attach DOI and share links so students, reviewers and visitors can find it.
                  </p>
                  <button
                    onClick={() => {
                      setEditingPublication(null);
                      setIsPublicationModalOpen(true);
                    }}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" /> Add First Publication
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <Search className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">No matches for these filters</p>
                  <button
                    onClick={() => {
                      setPubSearch("");
                      setPubStatusFilter("all");
                      setPubTypeFilter("all");
                    }}
                    className="mt-3 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Clear search & filters
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Section 1: Published Papers */}
                  {(pubSectionTab === "all" || pubSectionTab === "published") && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-[#2A2A2A]">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                            <Award className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">Published Papers</h3>
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                                {publishedPapers.length}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Officially published peer-reviewed research outputs
                            </p>
                          </div>
                        </div>
                      </div>

                      {publishedPapers.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center dark:border-[#2A2A2A] dark:bg-[#181818]">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No published papers yet</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Papers marked with status &quot;Published&quot; will be featured in this section.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {publishedPapers.map((pub) => renderPublicationCard(pub))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 2: Ongoing Submissions & Pipeline */}
                  {(pubSectionTab === "all" || pubSectionTab === "ongoing") && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-[#2A2A2A]">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">Ongoing Submissions & Pipeline</h3>
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                                {ongoingPapers.length}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Manuscripts under review, in revision, submitted, or in preparation
                            </p>
                          </div>
                        </div>
                      </div>

                      {ongoingPapers.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center dark:border-[#2A2A2A] dark:bg-[#181818]">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No ongoing submissions</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Manuscripts in draft, submitted, or under review will appear in this section.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {ongoingPapers.map((pub) => renderPublicationCard(pub))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
        </div>
      </div>

      <MeetingViewModal
        isOpen={!!viewingMeeting}
        onClose={() => setViewingMeeting(null)}
        meeting={viewingMeeting}
        teamMembers={teamMembers}
        supervisorName={topic?.supervisorName}
        supervisorId={topic?.supervisorId}
      />

      <PublicationModal
        isOpen={isPublicationModalOpen}
        onClose={() => {
          setIsPublicationModalOpen(false);
          setEditingPublication(null);
        }}
        onSave={handleSavePublication}
        editingPublication={editingPublication as any}
        defaultAuthors={[...teamMembers.map((m) => m.studentName), topic?.supervisorName].filter((name): name is string => !!name)}
      />

      <ConfirmModal
        isOpen={!!deletePublicationId}
        onClose={() => setDeletePublicationId(null)}
        onConfirm={handleDeletePublication}
        title="Delete Publication"
        message="Are you sure you want to delete this publication? This action cannot be undone."
        confirmText="Delete Publication"
      />

      <DocumentModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        onSave={handleSaveDocument}
      />

      <ConfirmModal
        isOpen={!!documentToDelete}
        onClose={() => setDocumentToDelete(null)}
        onConfirm={confirmDeleteDocument}
        title="Delete Resource"
        message="Are you sure you want to delete this resource? This action cannot be undone."
        confirmText="Delete Resource"
      />
    </DashboardLayout>
  );
}
