import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Target,
  FileText,
  Calendar,
  GitBranch,
  BookOpen,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Link as LinkIcon,
  Upload,
  MessageSquare,
  Copy,
  ExternalLink,
  Video,
  Users2,
  Search,
  Share2,
  Globe,
  Code2,
  GraduationCap,
  FileDown,
  Award,
  Sparkles,
  Send,
  Quote,
  Building2,
  Presentation,
  Flame,
  Repeat,
  ListChecks,
  CalendarClock,
  Wand2,
  Play,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Minus,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { StudentProfileModal } from "@/components/common/StudentProfileModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TaskModal } from "@/components/ui/TaskModal";
import { TaskViewModal } from "@/components/ui/TaskViewModal";
import { DocumentModal } from "@/components/ui/DocumentModal";
import { MilestoneModal } from "@/components/ui/MilestoneModal";
import { MeetingModal, type MeetingFormData, type MeetingPlatform } from "@/components/ui/MeetingModal";
import { PublicationModal, type PublicationFormData, type PublicationStatus, type PublicationType } from "@/components/ui/PublicationModal";
import { GroupChat } from "@/components/chat/GroupChat";
import { auth } from "@/firebase/auth";
import { storage } from "@/firebase/storage";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/firestore";

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
  cadence?: "weekly" | "biweekly" | "monthly" | "quarterly" | "one-time";
  phase?: "proposal" | "literature" | "methodology" | "implementation" | "evaluation" | "writing" | "defense" | "other";
  deliverables?: string[];
  createdAt?: unknown;
}

interface TaskStatusEvent {
  from: Task["status"] | "created";
  to: Task["status"];
  byUid: string;
  byName: string;
  at: string; // ISO string
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
  lastMovedAt?: string; // ISO string
  statusHistory?: TaskStatusEvent[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface Document {
  id: string;
  title: string;
  type: "paper" | "dataset" | "code" | "presentation" | "other";
  url: string;
  uploadedBy: string;
  uploadedAt?: unknown;
  isLink?: boolean;
  storagePath?: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  duration: string;
  platform?: MeetingPlatform | "";
  meetingLink?: string;
  agenda?: string;
  notes?: string;
  attendees: string[];
  createdAt?: unknown;
}

interface Publication {
  id: string;
  title: string;
  venue: string;
  publisher?: string;
  type: PublicationType | "conference" | "journal" | "workshop" | "preprint";
  status: PublicationStatus | "draft" | "submitted" | "under-review" | "accepted" | "published" | "rejected";
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
  volume?: string;
  pages?: string;
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

type TabType = "overview" | "milestones" | "tasks" | "chat" | "documents" | "meetings" | "publications";

export default function ResearchGroupManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [topic, setTopic] = useState<ResearchTopic | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [deleteMilestoneId, setDeleteMilestoneId] = useState<string | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<"all" | Task["priority"]>("all");

  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [deleteMeetingId, setDeleteMeetingId] = useState<string | null>(null);
  const [copiedMeetingId, setCopiedMeetingId] = useState<string | null>(null);

  const [isPublicationModalOpen, setIsPublicationModalOpen] = useState(false);
  const [editingPublication, setEditingPublication] = useState<Publication | null>(null);
  const [deletePublicationId, setDeletePublicationId] = useState<string | null>(null);
  const [pubSearch, setPubSearch] = useState("");
  const [pubStatusFilter, setPubStatusFilter] = useState<"all" | Publication["status"]>("all");
  const [pubTypeFilter, setPubTypeFilter] = useState<"all" | Publication["type"]>("all");
  const [copiedPubId, setCopiedPubId] = useState<string | null>(null);
  const [expandedPubId, setExpandedPubId] = useState<string | null>(null);

  const [msSearch, setMsSearch] = useState("");
  const [msStatusFilter, setMsStatusFilter] = useState<"all" | Milestone["status"] | "overdue">("all");
  const [msCadenceFilter, setMsCadenceFilter] = useState<"all" | NonNullable<Milestone["cadence"]>>("all");
  const [msPhaseFilter, setMsPhaseFilter] = useState<"all" | NonNullable<Milestone["phase"]>>("all");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);
  const [presetMilestoneId, setPresetMilestoneId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ show: boolean; type: "success" | "error"; message: string }>({
    show: false,
    type: "success",
    message: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ show: true, type, message });
  };

  const handleSaveMilestone = async (milestoneData: Omit<Milestone, "id">) => {
    if (!id) {
      showToast("error", "Unable to identify the research group.");
      return;
    }

    try {
      if (editingMilestone) {
        await updateDoc(doc(db, "researchGroups", id, "milestones", editingMilestone.id), {
          ...milestoneData,
        });
        showToast("success", "Milestone updated successfully.");
      } else {
        await addDoc(collection(db, "researchGroups", id, "milestones"), {
          ...milestoneData,
          createdAt: serverTimestamp(),
        });
        showToast("success", "Milestone added successfully.");
      }
      setIsMilestoneModalOpen(false);
      setEditingMilestone(null);
    } catch (error) {
      console.error("Failed to save milestone:", error);
      showToast("error", "Failed to save milestone.");
    }
  };

  const handleDeleteMilestone = async () => {
    if (!id || !deleteMilestoneId) return;
    try {
      await deleteDoc(doc(db, "researchGroups", id, "milestones", deleteMilestoneId));
      showToast("success", "Milestone deleted successfully.");
    } catch (error) {
      console.error("Failed to delete milestone:", error);
      showToast("error", "Failed to delete milestone.");
    } finally {
      setDeleteMilestoneId(null);
    }
  };

  const advanceMilestoneStatus = async (milestone: Milestone) => {
    if (!id) return;
    const next = milestone.status === "planned" ? "in-progress" : milestone.status === "in-progress" ? "completed" : "planned";
    try {
      await updateDoc(doc(db, "researchGroups", id, "milestones", milestone.id), { status: next });
      showToast("success", next === "completed" ? "Milestone completed — nice progress." : `Milestone moved to ${next.replace("-", " ")}.`);
    } catch (error) {
      console.error("Failed to update milestone status:", error);
      showToast("error", "Failed to update milestone status.");
    }
  };

  const generateMilestonePlan = async (weeks: 4 | 12) => {
    if (!id) return;
    const existingCount = milestones.length;
    const startFrom = milestones.reduce((latest, m) => {
      const t = new Date(m.deadline).getTime();
      return Number.isNaN(t) ? latest : Math.max(latest, t);
    }, Date.now());
    const phases: NonNullable<Milestone["phase"]>[] = ["proposal", "literature", "methodology", "implementation", "evaluation", "writing"];
    try {
      setIsGeneratingPlan(true);
      for (let w = 1; w <= weeks; w++) {
        const d = new Date(startFrom);
        d.setDate(d.getDate() + w * 7);
        await addDoc(collection(db, "researchGroups", id, "milestones"), {
          title: `Week ${existingCount + w} check-in`,
          description: `Weekly sync #${existingCount + w}: demo progress, flag blockers, agree next week's deliverables.`,
          deadline: d.toISOString().split("T")[0],
          status: "planned",
          cadence: "weekly",
          phase: phases[Math.min(Math.floor(((existingCount + w - 1) / weeks) * phases.length), phases.length - 1)],
          deliverables: ["Progress demo", "Updated notes"],
          createdAt: serverTimestamp(),
        });
      }
      showToast("success", `${weeks}-week plan added — weekly check-ins are on the timeline.`);
    } catch (error) {
      console.error("Failed to generate milestone plan:", error);
      showToast("error", "Failed to generate weekly plan.");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    let unsubscribeTeam: Unsubscribe | undefined;
    let unsubscribeMilestones: Unsubscribe | undefined;
    let unsubscribeTasks: Unsubscribe | undefined;
    let unsubscribeDocuments: Unsubscribe | undefined;
    let unsubscribeMeetings: Unsubscribe | undefined;
    let unsubscribePublications: Unsubscribe | undefined;

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
              const joinRequestsQuery = query(
                collection(db, "joinRequests"),
                where("projectId", "==", id),
                where("status", "==", "accepted")
              );
              const joinRequestsSnap = await getDocs(joinRequestsQuery);

              const membersMap = new Map<string, TeamMember>();

              joinRequestsSnap.docs.forEach((doc) => {
                const data = doc.data();
                if (data.requestType === "group" && Array.isArray(data.teamMembers) && data.teamMembers.length > 0) {
                  data.teamMembers.forEach((tm: { studentId: string; name: string; email?: string; department?: string }) => {
                    if (tm.studentId && !membersMap.has(tm.studentId)) {
                      membersMap.set(tm.studentId, {
                        studentId: tm.studentId,
                        studentName: tm.name || "Unnamed student",
                        studentEmail: tm.email,
                        department: tm.department,
                      });
                    }
                  });
                } else if (data.studentId && !membersMap.has(data.studentId)) {
                  membersMap.set(data.studentId, {
                    studentId: data.studentId,
                    studentName: data.studentName || "Unnamed student",
                    studentEmail: data.studentEmail,
                    department: data.studentDepartment,
                  });
                }
              });

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
            setMilestones(milestonesData.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()));
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
            setMeetings(meetingsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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

  const handleSaveTask = async (taskData: Omit<Task, "id">) => {
    if (!id) return;
    const meUid = auth.currentUser?.uid || "";
    const meName = auth.currentUser?.displayName || topic?.supervisorName || "Supervisor";
    try {
      if (editingTask) {
        const statusChanged = editingTask.status !== taskData.status;
        const history = [...(editingTask.statusHistory || [])];
        const update: Record<string, unknown> = { ...taskData, updatedAt: serverTimestamp() };
        if (statusChanged) {
          history.push({ from: editingTask.status, to: taskData.status, byUid: meUid, byName: meName, at: new Date().toISOString() });
          update.statusHistory = history;
          update.lastMovedBy = meUid;
          update.lastMovedByName = meName;
          update.lastMovedAt = new Date().toISOString();
        }
        await updateDoc(doc(db, "researchGroups", id, "tasks", editingTask.id), update);
        showToast("success", statusChanged ? `Task updated and moved to ${taskData.status.replace("-", " ")}.` : "Task updated successfully");
      } else {
        await addDoc(collection(db, "researchGroups", id, "tasks"), {
          ...taskData,
          createdBy: meUid,
          createdByName: meName,
          lastMovedBy: meUid,
          lastMovedByName: meName,
          lastMovedAt: new Date().toISOString(),
          statusHistory: [{ from: "created", to: taskData.status, byUid: meUid, byName: meName, at: new Date().toISOString() }],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast("success", "Task created successfully — it's on the board");
      }
      setIsTaskModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error("Error saving task:", error);
      showToast("error", "Failed to save task");
    }
  };

  const handleDeleteTask = async () => {
    if (!id || !deleteTaskId) return;
    try {
      await deleteDoc(doc(db, "researchGroups", id, "tasks", deleteTaskId));
      showToast("success", "Task deleted successfully");
    } catch (error) {
      console.error("Error deleting task:", error);
      showToast("error", "Failed to delete task");
    } finally {
      setDeleteTaskId(null);
    }
  };

  const moveTask = async (task: Task, newStatus: Task["status"]) => {
    if (!id || task.status === newStatus) return;
    const meUid = auth.currentUser?.uid || "";
    const meName = auth.currentUser?.displayName || topic?.supervisorName || "Supervisor";
    const nowIso = new Date().toISOString();
    try {
      await updateDoc(doc(db, "researchGroups", id, "tasks", task.id), {
        status: newStatus,
        lastMovedBy: meUid,
        lastMovedByName: meName,
        lastMovedAt: nowIso,
        statusHistory: [...(task.statusHistory || []), { from: task.status, to: newStatus, byUid: meUid, byName: meName, at: nowIso }],
        updatedAt: serverTimestamp(),
      });
      showToast("success", `Moved to ${newStatus.replace("-", " ")}.`);
    } catch (error) {
      console.error("Error updating task status:", error);
      showToast("error", "Failed to update task status");
    }
  };

  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(taskId);
  };

  const handleTaskDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleTaskDrop = async (e: React.DragEvent, newStatus: Task["status"], targetMilestoneId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDraggedTaskId(null);
    if (!taskId || !id) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if ((task.milestoneId || "unassigned") !== targetMilestoneId) {
      showToast("error", "Cannot drag a task to a different milestone — edit it to reassign.");
      return;
    }
    await moveTask(task, newStatus);
  };

  const handleSaveDocument = async (data: { title: string; type: string; url: string; file: File | null; isLink: boolean }) => {
    if (!id || !auth.currentUser) return;
    try {
      let documentUrl = data.url;
      let storagePath = null;

      if (!data.isLink && data.file) {
        console.log("Starting Firebase Storage upload for:", data.file.name, "Size:", data.file.size);
        storagePath = `researchGroups/${id}/documents/${Date.now()}_${data.file.name}`;
        const fileRef = ref(storage, storagePath);
        console.log("FileRef created, uploading bytes...");
        const uploadResult = await uploadBytes(fileRef, data.file);
        console.log("Upload bytes finished. Result:", uploadResult);
        documentUrl = await getDownloadURL(uploadResult.ref);
        console.log("Got download URL:", documentUrl);
      }

      console.log("Saving document to Firestore...");
      await addDoc(collection(db, "researchGroups", id, "documents"), {
        title: data.title,
        type: data.type,
        url: documentUrl,
        isLink: data.isLink,
        storagePath,
        uploadedBy: auth.currentUser.displayName || "Teacher",
        uploadedAt: serverTimestamp(),
      });
      
      showToast("success", "Resource added successfully");
    } catch (error) {
      console.error("Error saving document:", error);
      throw error;
    }
  };

  const handleDeleteDocument = async (docData: Document) => {
    if (!id || !window.confirm("Are you sure you want to delete this resource?")) return;
    try {
      if (!docData.isLink && docData.storagePath) {
        const fileRef = ref(storage, docData.storagePath);
        await deleteObject(fileRef).catch(e => console.error("Error deleting from storage", e));
      }
      await deleteDoc(doc(db, "researchGroups", id, "documents", docData.id));
      showToast("success", "Resource deleted successfully");
    } catch (error) {
      console.error("Error deleting document:", error);
      showToast("error", "Failed to delete resource");
    }
  };

  const handleSaveMeeting = async (data: MeetingFormData) => {
    if (!id) return;
    try {
      if (editingMeeting) {
        await updateDoc(doc(db, "researchGroups", id, "meetings", editingMeeting.id), {
          ...data,
        });
        showToast("success", "Meeting updated successfully");
      } else {
        await addDoc(collection(db, "researchGroups", id, "meetings"), {
          ...data,
          createdAt: serverTimestamp(),
        });
        showToast("success", "Meeting scheduled successfully");
      }
      setIsMeetingModalOpen(false);
      setEditingMeeting(null);
    } catch (error) {
      console.error("Error saving meeting:", error);
      throw error;
    }
  };

  const handleDeleteMeeting = async () => {
    if (!id || !deleteMeetingId) return;
    try {
      await deleteDoc(doc(db, "researchGroups", id, "meetings", deleteMeetingId));
      showToast("success", "Meeting deleted successfully");
    } catch (error) {
      console.error("Error deleting meeting:", error);
      showToast("error", "Failed to delete meeting");
    } finally {
      setDeleteMeetingId(null);
    }
  };

  const handleCopyMeetingLink = (meeting: Meeting) => {
    if (!meeting.meetingLink) return;
    navigator.clipboard.writeText(meeting.meetingLink).then(() => {
      setCopiedMeetingId(meeting.id);
      showToast("success", "Meeting link copied to clipboard!");
      setTimeout(() => setCopiedMeetingId(null), 2000);
    }).catch(() => showToast("error", "Failed to copy link"));
  };

  const isGroupPublished = publications.some((p) => p.status === "published");
  const publishedCount = publications.filter((p) => p.status === "published").length;

  // Keep the group's state in sync: any published paper => group is "published"
  useEffect(() => {
    if (!id || loading) return;
    const groupStatus = isGroupPublished ? "published" : "ongoing";
    const sync = async () => {
      try {
        await setDoc(
          doc(db, "researchGroups", id),
          { groupStatus, publishedCount, updatedAt: serverTimestamp() },
          { merge: true }
        );
        const topicRef = doc(db, "researchTopics", id);
        const topicSnap = await getDoc(topicRef);
        if (topicSnap.exists()) {
          await updateDoc(topicRef, { groupStatus, publishedCount, updatedAt: serverTimestamp() });
        }
      } catch (e) {
        console.error("Failed to sync group publish state:", e);
      }
    };
    sync();
  }, [id, loading, isGroupPublished, publishedCount]);

  const handleSavePublication = async (data: PublicationFormData) => {
    if (!id || !auth.currentUser) {
      showToast("error", "Unable to identify the research group.");
      return;
    }
    try {
      const payload = {
        ...data,
        acceptanceDate: data.status === "accepted" || data.status === "published" ? data.publicationDate || "" : "",
        updatedAt: serverTimestamp(),
      };
      if (editingPublication) {
        await updateDoc(doc(db, "researchGroups", id, "publications", editingPublication.id), payload);
        showToast("success", data.status === "published" ? "Publication updated. Group is now Published." : "Publication updated successfully.");
      } else {
        await addDoc(collection(db, "researchGroups", id, "publications"), {
          ...payload,
          createdBy: auth.currentUser.displayName || "Teacher",
          createdAt: serverTimestamp(),
        });
        showToast("success", data.status === "published" ? "Publication added. Group is now Published." : "Publication added successfully.");
      }
      setIsPublicationModalOpen(false);
      setEditingPublication(null);
    } catch (error) {
      console.error("Error saving publication:", error);
      showToast("error", "Failed to save publication.");
      throw error;
    }
  };

  const handleDeletePublication = async () => {
    if (!id || !deletePublicationId) return;
    try {
      await deleteDoc(doc(db, "researchGroups", id, "publications", deletePublicationId));
      showToast("success", "Publication removed successfully.");
    } catch (error) {
      console.error("Error deleting publication:", error);
      showToast("error", "Failed to delete publication.");
    } finally {
      setDeletePublicationId(null);
    }
  };

  const getPublicationShareText = (pub: Publication) => {
    const links: string[] = [];
    if (pub.doi) links.push(`https://doi.org/${pub.doi}`);
    if (pub.paperUrl) links.push(pub.paperUrl);
    if (pub.projectUrl) links.push(pub.projectUrl);
    return `${pub.title} — ${pub.venue}${links.length ? `\n${links.join("\n")}` : ""}`;
  };

  const handleCopyPublicationLink = async (pub: Publication) => {
    const bestLink = pub.paperUrl || (pub.doi ? `https://doi.org/${pub.doi}` : "") || pub.projectUrl || pub.codeUrl || "";
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

  const handleNativeSharePublication = async (pub: Publication) => {
    const bestLink = pub.paperUrl || (pub.doi ? `https://doi.org/${pub.doi}` : "") || pub.projectUrl || "";
    const shareData = { title: pub.title, text: `${pub.title} — ${pub.venue}`, url: bestLink || undefined };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: typeof shareData) => Promise<void> }).share(shareData);
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    handleCopyPublicationLink(pub);
  };

  if (loading) {
    return (
      <DashboardLayout role="teacher">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!topic) {
    return (
      <DashboardLayout role="teacher">
        <div className="mx-auto max-w-4xl py-12 text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Research Group Not Found</h2>
          <button
            onClick={() => navigate("/teacher/research-groups")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Research Groups
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Target className="h-4 w-4" /> },
    { id: "milestones", label: "Milestones", icon: <GitBranch className="h-4 w-4" /> },
    { id: "tasks", label: "Tasks", icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: "chat", label: "Group Chat", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
    { id: "meetings", label: "Meetings", icon: <Calendar className="h-4 w-4" /> },
    { id: "publications", label: "Publications", icon: <BookOpen className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout role="teacher">
      <ToastAlert
        show={toast.show}
        type={toast.type}
        message={toast.message}
        duration={3000}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />

      <StudentProfileModal
        isOpen={selectedStudentId !== null}
        studentId={selectedStudentId || ""}
        onClose={() => setSelectedStudentId(null)}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
          setPresetMilestoneId(null);
        }}
        onSave={handleSaveTask}
        editingTask={editingTask}
        initialMilestoneId={presetMilestoneId || undefined}
        teamMembers={teamMembers}
        milestones={milestones}
      />
      <TaskViewModal
        isOpen={viewingTask !== null}
        onClose={() => setViewingTask(null)}
        task={viewingTask}
        milestoneName={viewingTask?.milestoneId ? milestones.find((m) => m.id === viewingTask.milestoneId)?.title : undefined}
        assigneeNames={(viewingTask?.assignedTo || []).map((sid) => teamMembers.find((m) => m.studentId === sid)?.studentName || "Unknown member")}
      />
      <MilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={() => {
          setIsMilestoneModalOpen(false);
          setEditingMilestone(null);
        }}
        onSave={handleSaveMilestone}
        initialData={editingMilestone}
        existingMilestones={milestones}
      />

      <DocumentModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        onSave={handleSaveDocument}
      />

      <MeetingModal
        isOpen={isMeetingModalOpen}
        onClose={() => {
          setIsMeetingModalOpen(false);
          setEditingMeeting(null);
        }}
        onSave={handleSaveMeeting}
        editingMeeting={editingMeeting ? {
          id: editingMeeting.id,
          title: editingMeeting.title,
          date: editingMeeting.date,
          time: editingMeeting.time || "",
          duration: editingMeeting.duration,
          platform: editingMeeting.platform || "",
          meetingLink: editingMeeting.meetingLink || "",
          agenda: editingMeeting.agenda || editingMeeting.notes || "",
          attendees: editingMeeting.attendees || [],
        } : null}
        teamMembers={teamMembers}
      />

      <PublicationModal
        isOpen={isPublicationModalOpen}
        onClose={() => {
          setIsPublicationModalOpen(false);
          setEditingPublication(null);
        }}
        onSave={handleSavePublication}
        editingPublication={editingPublication}
        defaultAuthors={teamMembers.map((m) => m.studentName)}
      />

      <div className="mx-auto max-w-7xl px-2 sm:px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/teacher/research-groups")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Research Groups
          </button>
        </div>

        {/* Title Card */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50 p-6 shadow-sm dark:border-[#2A2A2A] dark:from-indigo-500/10 dark:to-violet-500/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                  {topic.category}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                    isGroupPublished
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                  }`}
                >
                  {isGroupPublished ? "Published" : "Ongoing"}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">{topic.title}</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Supervisor: <span className="font-semibold">{topic.supervisorName || "N/A"}</span>
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-[#181818]">
              <Users className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 border-b border-slate-200 dark:border-[#2A2A2A]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Team Size</span>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                  {teamMembers.length} / {topic.maxTeamSize}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                <div className="flex items-center gap-3">
                  <GitBranch className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Progress</span>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{getProgressPercentage()}%</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Tasks</span>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                  {getTaskStats().completed} / {getTaskStats().total}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Publications</span>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{publications.length}</p>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left: Team Members & Description */}
              <div className="space-y-6 lg:col-span-2">
                {/* Description */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
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
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-[#2A2A2A] dark:bg-[#0F0F0F]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{member.studentName}</p>
                          {member.department && (
                            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{member.department}</p>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedStudentId(member.studentId)}
                          className="ml-2 rounded-lg p-1.5 text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                          title="View Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Recent Activity */}
              <div className="space-y-6">
                {/* Upcoming Milestones */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Upcoming Milestones</h2>
                  <div className="space-y-3">
                    {milestones
                      .filter((m) => m.status !== "completed")
                      .slice(0, 3)
                      .map((milestone) => {
                        const due = new Date(`${milestone.deadline}T00:00:00`).getTime();
                        const overdue = !Number.isNaN(due) && due < new Date(new Date().setHours(0, 0, 0, 0)).getTime();
                        return (
                          <div key={milestone.id} className="flex items-start gap-3">
                            <Circle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${overdue ? "text-rose-400" : "text-slate-400"}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{milestone.title}</p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <span className={overdue ? "font-bold text-rose-500" : ""}>
                                  Due: {new Date(milestone.deadline).toLocaleDateString()}{overdue ? " · overdue" : ""}
                                </span>
                                {milestone.cadence && milestone.cadence !== "one-time" && (
                                  <span className="rounded-full bg-indigo-50 px-1.5 py-px text-[10px] font-bold capitalize text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                                    {milestone.cadence}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    {milestones.filter((m) => m.status !== "completed").length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming milestones</p>
                    )}
                  </div>
                </div>

                {/* Recent Documents */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Recent Documents</h2>
                  <div className="space-y-3">
                    {documents.slice(0, 3).map((doc) => (
                      <div key={doc.id} className="flex items-start gap-3">
                        <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{doc.title}</p>
                          <p className="mt-0.5 text-xs capitalize text-slate-500 dark:text-slate-400">{doc.type}</p>
                        </div>
                      </div>
                    ))}
                    {documents.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No documents yet</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <GroupChat 
            groupId={id!} 
            currentUserId={auth.currentUser?.uid || ""} 
            currentUserName={topic?.supervisorName || auth.currentUser?.displayName || "Supervisor"} 
            currentUserRole="teacher" 
            members={[
              ...(topic?.supervisorId ? [{ id: topic.supervisorId, name: topic.supervisorName || "Supervisor", role: "teacher" as const }] : []),
              ...teamMembers.map(m => ({ id: m.studentId, name: m.studentName, role: "student" as const }))
            ]}
          />
        )}

        {activeTab === "milestones" && (() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const msDate = (m: Milestone) => new Date(`${m.deadline}T00:00:00`);
          const isOverdue = (m: Milestone) => m.status !== "completed" && msDate(m).getTime() < today.getTime();
          const daysLeft = (m: Milestone) => Math.round((msDate(m).getTime() - today.getTime()) / 86400000);

          const msStatusStyles: Record<string, string> = {
            completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
            "in-progress": "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
            planned: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
          };
          const cadenceLabels: Record<string, string> = {
            weekly: "Weekly",
            biweekly: "Biweekly",
            monthly: "Monthly",
            quarterly: "Quarterly",
            "one-time": "One-time",
          };
          const phaseLabels: Record<string, string> = {
            proposal: "Proposal",
            literature: "Literature",
            methodology: "Methodology",
            implementation: "Implementation",
            evaluation: "Evaluation",
            writing: "Writing",
            defense: "Defense",
            other: "Other",
          };

          const overdueCount = milestones.filter(isOverdue).length;
          const completedCount = milestones.filter((m) => m.status === "completed").length;
          const inProgressCount = milestones.filter((m) => m.status === "in-progress").length;
          const progress = getProgressPercentage();

          const q = msSearch.trim().toLowerCase();
          const filtered = milestones
            .filter((m) => {
              if (msStatusFilter === "all") return true;
              if (msStatusFilter === "overdue") return isOverdue(m);
              return m.status === msStatusFilter;
            })
            .filter((m) => (msCadenceFilter === "all" ? true : (m.cadence || "one-time") === msCadenceFilter))
            .filter((m) => (msPhaseFilter === "all" ? true : (m.phase || "other") === msPhaseFilter))
            .filter((m) => {
              if (!q) return true;
              return (
                m.title.toLowerCase().includes(q) ||
                m.description.toLowerCase().includes(q) ||
                (m.deliverables || []).join(" ").toLowerCase().includes(q)
              );
            });

          const overdue = filtered.filter(isOverdue).sort((a, b) => msDate(a).getTime() - msDate(b).getTime());
          const upcoming = filtered.filter((m) => !isOverdue(m) && m.status !== "completed").sort((a, b) => msDate(a).getTime() - msDate(b).getTime());
          const completed = filtered.filter((m) => m.status === "completed").sort((a, b) => msDate(b).getTime() - msDate(a).getTime());

          const renderMilestoneCard = (m: Milestone) => {
            const overdueBy = isOverdue(m) ? Math.abs(daysLeft(m)) : 0;
            const left = daysLeft(m);
            const dueSoon = !isOverdue(m) && m.status !== "completed" && left >= 0 && left <= 7;
            const nextLabel = m.status === "planned" ? "Start" : m.status === "in-progress" ? "Complete" : "Reopen";
            const linkedTasks = tasks.filter((t) => t.milestoneId === m.id);
            const doneTasks = linkedTasks.filter((t) => t.status === "completed").length;
            const activeTasks = linkedTasks.filter((t) => t.status !== "completed").length;
            const taskProgress = linkedTasks.length === 0 ? 0 : Math.round((doneTasks / linkedTasks.length) * 100);
            const expanded = expandedMilestoneId === m.id;
            const memberName = (sid: string) => teamMembers.find((tm) => tm.studentId === sid)?.studentName || "Unknown";
            return (
              <article
                key={m.id}
                className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md dark:bg-[#181818] ${
                  m.status === "completed"
                    ? "border-emerald-200 dark:border-emerald-500/30"
                    : isOverdue(m)
                    ? "border-rose-200 dark:border-rose-500/30"
                    : "border-slate-200 dark:border-[#2A2A2A]"
                }`}
              >
                {(isOverdue(m) || m.status === "completed") && (
                  <div className={`h-1 w-full ${isOverdue(m) ? "bg-rose-500" : "bg-emerald-500"}`} />
                )}
                <div className="flex items-start gap-4 p-5 sm:p-6">
                  <button
                    onClick={() => advanceMilestoneStatus(m)}
                    title={m.status === "completed" ? "Reopen milestone" : m.status === "planned" ? "Start milestone" : "Mark completed"}
                    className="mt-0.5 shrink-0 rounded-full transition-transform hover:scale-110"
                  >
                    {m.status === "completed" ? (
                      <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                    ) : m.status === "in-progress" ? (
                      <Clock className="h-7 w-7 text-amber-500" />
                    ) : (
                      <Circle className="h-7 w-7 text-slate-300 hover:text-indigo-500 dark:text-slate-600" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-extrabold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                        <Repeat className="h-3 w-3" /> {cadenceLabels[m.cadence || "one-time"]}
                      </span>
                      <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-extrabold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                        {phaseLabels[m.phase || "other"]}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold capitalize ${msStatusStyles[m.status]}`}>
                        {m.status.replace("-", " ")}
                      </span>
                      {isOverdue(m) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                          <Flame className="h-3 w-3" /> Overdue by {overdueBy}d
                        </span>
                      )}
                      {dueSoon && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                          Due in {left === 0 ? "today" : `${left}d`}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <ListTodo className="h-3 w-3" /> {doneTasks}/{linkedTasks.length} tasks
                        {activeTasks > 0 && ` · ${activeTasks} active`}
                      </span>
                    </div>
                    <h3 className={`mt-2 font-extrabold leading-snug ${m.status === "completed" ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-900 dark:text-white"}`}>
                      {m.title}
                    </h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{m.description}</p>
                    {(m.deliverables?.length ?? 0) > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <ListChecks className="mt-1 h-3.5 w-3.5 text-slate-400" />
                        {m.deliverables!.map((d) => (
                          <span key={d} className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-[#333] dark:text-slate-300">
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                    {linkedTasks.length > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${taskProgress}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{taskProgress}% tasks done</span>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-[#262626] dark:text-slate-400">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {msDate(m).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <button
                        onClick={() => advanceMilestoneStatus(m)}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        <Play className="h-3 w-3" /> {nextLabel}
                      </button>
                      <button
                        onClick={() => setExpandedMilestoneId(expanded ? null : m.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 dark:border-[#333] dark:text-slate-300 dark:hover:bg-[#0F0F0F]"
                      >
                        <ListTodo className="h-3 w-3" />
                        {expanded ? "Hide tasks" : `View tasks (${linkedTasks.length})`}
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    </div>
                    {expanded && (
                      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-[#262626] dark:bg-[#0F0F0F]">
                        {linkedTasks.length === 0 ? (
                          <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400">No tasks linked to this milestone yet.</p>
                            <button
                              onClick={() => {
                                setEditingTask(null);
                                setPresetMilestoneId(m.id);
                                setIsTaskModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700"
                            >
                              <Plus className="h-3 w-3" /> Add task here
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 px-1">
                              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Linked tasks · {activeTasks} active
                              </p>
                              <button
                                onClick={() => {
                                  setEditingTask(null);
                                  setPresetMilestoneId(m.id);
                                  setIsTaskModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                              >
                                <Plus className="h-3 w-3" /> Add
                              </button>
                            </div>
                            {linkedTasks
                              .slice()
                              .sort((a, b) => {
                                const rank = (s: Task["status"]) => (s === "in-progress" ? 0 : s === "todo" ? 1 : 2);
                                return rank(a.status) - rank(b.status);
                              })
                              .map((t) => (
                                <button
                                  key={t.id}
                                  onClick={() => setViewingTask(t)}
                                  className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-[#333] dark:bg-[#181818] dark:hover:border-indigo-500/40"
                                >
                                  <span className="shrink-0">
                                    {t.status === "completed" ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    ) : t.status === "in-progress" ? (
                                      <Clock className="h-4 w-4 text-amber-500" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                                    )}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className={`block truncate text-xs font-bold ${t.status === "completed" ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100"}`}>
                                      {t.title}
                                    </span>
                                    <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">
                                      {t.assignedTo.length > 0 ? t.assignedTo.map(memberName).join(", ") : "Unassigned"}
                                      {t.dueDate ? ` · Due ${new Date(`${t.dueDate}T00:00:00`).toLocaleDateString()}` : ""}
                                      {` · ${t.priority}`}
                                    </span>
                                  </span>
                                  <Eye className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
                                </button>
                              ))}
                            <button
                              onClick={() => setActiveTab("tasks")}
                              className="w-full rounded-lg py-1.5 text-center text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-[#181818] dark:hover:text-indigo-400"
                            >
                              Open full task board →
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => {
                        setEditingMilestone(m);
                        setIsMilestoneModalOpen(true);
                      }}
                      title="Edit milestone"
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteMilestoneId(m.id || null)}
                      title="Delete milestone"
                      className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          };

          return (
            <div className="space-y-5">
              {/* Minimal header — matches Meetings/Documents style, no gradients */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                      <GitBranch className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">Milestones</h2>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {completedCount} of {milestones.length} complete
                        {overdueCount > 0 && <span className="font-bold text-rose-500"> · {overdueCount} overdue</span>}
                        {inProgressCount > 0 && <span> · {inProgressCount} in progress</span>}
                      </p>
                      {milestones.length > 0 && (
                        <div className="mt-2 flex w-48 items-center gap-2 sm:w-64">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{progress}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {milestones.length > 0 && (
                      <>
                        <button
                          onClick={() => generateMilestonePlan(4)}
                          disabled={isGeneratingPlan}
                          title="Auto-create 4 weekly check-ins"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-[#333] dark:text-slate-300 dark:hover:bg-[#0F0F0F]"
                        >
                          <Wand2 className="h-3.5 w-3.5" /> 4-week sprint
                        </button>
                        <button
                          onClick={() => generateMilestonePlan(12)}
                          disabled={isGeneratingPlan}
                          title="Auto-create 12 weekly check-ins for the semester"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-[#333] dark:text-slate-300 dark:hover:bg-[#0F0F0F]"
                        >
                          <Wand2 className="h-3.5 w-3.5" /> Semester plan
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setEditingMilestone(null);
                        setIsMilestoneModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                    >
                      <Plus className="h-4 w-4" /> Add Milestone
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats */}
              {milestones.length > 0 && (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    { label: "Total", value: milestones.length, icon: <GitBranch className="h-4 w-4" />, cls: "text-indigo-600 dark:text-indigo-400" },
                    { label: "Completed", value: completedCount, icon: <CheckCircle2 className="h-4 w-4" />, cls: "text-emerald-600 dark:text-emerald-400" },
                    { label: "In progress", value: inProgressCount, icon: <Clock className="h-4 w-4" />, cls: "text-amber-600 dark:text-amber-400" },
                    { label: "Overdue", value: overdueCount, icon: <Flame className="h-4 w-4" />, cls: "text-rose-600 dark:text-rose-400" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${s.cls}`}>
                        {s.icon} {s.label}
                      </div>
                      <p className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white">{s.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Toolbar */}
              {milestones.length > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818] lg:flex-row lg:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={msSearch}
                      onChange={(e) => setMsSearch(e.target.value)}
                      placeholder="Search milestones, deliverables…"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(["all", "overdue", "planned", "in-progress", "completed"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setMsStatusFilter(s)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition-all ${
                          msStatusFilter === s
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        {s === "in-progress" ? "In progress" : s}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={msCadenceFilter}
                      onChange={(e) => setMsCadenceFilter(e.target.value as typeof msCadenceFilter)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-[#333] dark:bg-[#0F0F0F] dark:text-slate-300"
                    >
                      <option value="all">All cadences</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="one-time">One-time</option>
                    </select>
                    <select
                      value={msPhaseFilter}
                      onChange={(e) => setMsPhaseFilter(e.target.value as typeof msPhaseFilter)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-[#333] dark:bg-[#0F0F0F] dark:text-slate-300"
                    >
                      <option value="all">All phases</option>
                      <option value="proposal">Proposal</option>
                      <option value="literature">Literature</option>
                      <option value="methodology">Methodology</option>
                      <option value="implementation">Implementation</option>
                      <option value="evaluation">Evaluation</option>
                      <option value="writing">Writing</option>
                      <option value="defense">Defense</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              {/* List */}
              {milestones.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                    <GitBranch className="h-8 w-8" />
                  </div>
                  <p className="mt-4 text-base font-bold text-slate-900 dark:text-white">No milestones yet — chart the course</p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                    Break the research into weekly check-ins, monthly reviews and final gates. Or generate a plan in one click.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setEditingMilestone(null);
                        setIsMilestoneModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      <Plus className="h-4 w-4" /> Add First Milestone
                    </button>
                    <button
                      onClick={() => generateMilestonePlan(4)}
                      disabled={isGeneratingPlan}
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                    >
                      <Wand2 className="h-4 w-4" /> Generate 4-week sprint
                    </button>
                    <button
                      onClick={() => generateMilestonePlan(12)}
                      disabled={isGeneratingPlan}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-[#333] dark:text-slate-300 dark:hover:bg-[#0F0F0F]"
                    >
                      <Wand2 className="h-4 w-4" /> Semester plan (12 weeks)
                    </button>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <Search className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">No matches for these filters</p>
                  <button
                    onClick={() => {
                      setMsSearch("");
                      setMsStatusFilter("all");
                      setMsCadenceFilter("all");
                      setMsPhaseFilter("all");
                    }}
                    className="mt-3 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Clear search & filters
                  </button>
                </div>
              ) : (
                <>
                  {overdue.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                          Needs attention ({overdue.length})
                        </h3>
                      </div>
                      <div className="space-y-3">{overdue.map(renderMilestoneCard)}</div>
                    </div>
                  )}
                  {upcoming.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                        </span>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Upcoming ({upcoming.length})
                        </h3>
                      </div>
                      <div className="space-y-3">{upcoming.map(renderMilestoneCard)}</div>
                    </div>
                  )}
                  {completed.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Completed ({completed.length})
                        </h3>
                      </div>
                      <div className="space-y-3">{completed.map(renderMilestoneCard)}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {activeTab === "tasks" && (() => {
          const stats = getTaskStats();
          const tq = taskSearch.trim().toLowerCase();
          const visibleTasks = tasks
            .filter((t) => (taskPriorityFilter === "all" ? true : t.priority === taskPriorityFilter))
            .filter((t) => {
              if (!tq) return true;
              const assigneeNames = t.assignedTo.map((sid) => teamMembers.find((m) => m.studentId === sid)?.studentName || "").join(" ");
              return (
                t.title.toLowerCase().includes(tq) ||
                (t.description || "").toLowerCase().includes(tq) ||
                assigneeNames.toLowerCase().includes(tq) ||
                (t.createdByName || "").toLowerCase().includes(tq) ||
                (t.lastMovedByName || "").toLowerCase().includes(tq)
              );
            });

          const assigneeNameOf = (sid: string) => teamMembers.find((m) => m.studentId === sid)?.studentName || "Unknown";

          const columns = [
            { status: "todo" as const, title: "TO DO", columnBg: "bg-blue-50 dark:bg-blue-500/10", headerColor: "text-blue-700 dark:text-blue-300", countBg: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" },
            { status: "in-progress" as const, title: "IN PROGRESS", columnBg: "bg-amber-50 dark:bg-amber-500/10", headerColor: "text-amber-700 dark:text-amber-300", countBg: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
            { status: "completed" as const, title: "DONE", columnBg: "bg-emerald-50 dark:bg-emerald-500/10", headerColor: "text-emerald-700 dark:text-emerald-300", countBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
          ];

          const moveStep = (t: Task, dir: -1 | 1) => {
            const order: Task["status"][] = ["todo", "in-progress", "completed"];
            const next = order[order.indexOf(t.status) + dir];
            if (next) moveTask(t, next);
          };

          const renderTaskCard = (task: Task) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isOverdue = task.dueDate ? new Date(`${task.dueDate}T00:00:00`) < today && task.status !== "completed" : false;
            const PriorityIcon = task.priority === "high" ? ChevronUp : task.priority === "medium" ? Minus : ChevronDown;
            const priorityColor = task.priority === "high" ? "text-rose-500" : task.priority === "medium" ? "text-amber-500" : "text-blue-500";
            return (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleTaskDragStart(e, task.id)}
                onClick={() => setViewingTask(task)}
                className={`group cursor-grab rounded-xl border p-3.5 shadow-sm transition-all hover:shadow-md active:cursor-grabbing ${
                  isOverdue
                    ? "border-rose-200 bg-rose-50/60 hover:border-rose-300 dark:border-rose-500/30 dark:bg-rose-500/10"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-[#333] dark:bg-[#1C1C1E] dark:hover:border-slate-600"
                }`}
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <h4 className={`text-sm font-semibold leading-snug ${
                    task.status === "completed"
                      ? "text-slate-400 line-through dark:text-slate-500"
                      : isOverdue
                      ? "text-rose-700 dark:text-rose-300"
                      : "text-slate-800 dark:text-slate-100"
                  }`}>
                    {task.title}
                  </h4>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingTask(task);
                      }}
                      title="View details"
                      className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTask(task);
                        setIsTaskModalOpen(true);
                      }}
                      title="Edit task"
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTaskId(task.id || null);
                      }}
                      title="Delete task"
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {task.description && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{task.description}</p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className={`inline-flex items-center gap-1 font-bold capitalize ${priorityColor}`}>
                    <PriorityIcon className="h-3.5 w-3.5" /> {task.priority}
                  </span>
                  {task.dueDate && (
                    <span className={`inline-flex items-center gap-1 font-semibold ${isOverdue ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
                      <Calendar className="h-3 w-3" />
                      {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString()}{isOverdue ? " · overdue" : ""}
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-[#2A2A2A]">
                  <div className="flex min-w-0 items-center">
                    {task.assignedTo.slice(0, 3).map((sid, i) => (
                      <span
                        key={sid}
                        title={assigneeNameOf(sid)}
                        className="-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-[10px] font-bold text-white first:ml-0 dark:border-[#1C1C1E]"
                        style={{ zIndex: 3 - i }}
                      >
                        {assigneeNameOf(sid).charAt(0).toUpperCase()}
                      </span>
                    ))}
                    {task.assignedTo.length > 3 && (
                      <span className="ml-1 text-[10px] font-bold text-slate-400">+{task.assignedTo.length - 3}</span>
                    )}
                    {task.assignedTo.length === 0 && (
                      <span className="text-[10px] italic text-slate-400">Unassigned</span>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => moveStep(task, -1)}
                      disabled={task.status === "todo"}
                      title="Move back"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-700"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveStep(task, 1)}
                      disabled={task.status === "completed"}
                      title="Move forward"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-700"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-1.5 space-y-0.5 text-[10px] leading-snug text-slate-400 dark:text-slate-500">
                  <p className="truncate">Created by <span className="font-bold text-slate-500 dark:text-slate-400">{task.createdByName || "Unknown"}</span></p>
                  {task.lastMovedByName && (
                    <p className="truncate">→ {task.status.replace("-", " ")} by <span className="font-bold text-slate-500 dark:text-slate-400">{task.lastMovedByName}</span></p>
                  )}
                </div>
              </div>
            );
          };

          const groups = [
            ...milestones.map((m) => ({ id: m.id, title: m.title, deadline: m.deadline, kind: "milestone" as const })),
            { id: "unassigned", title: "Unassigned Tasks", deadline: "", kind: "unassigned" as const },
          ];

          return (
            <div className="space-y-5">
              {/* Hero header */}
              <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 text-white shadow-sm dark:border-indigo-500/20">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-20 right-24 h-44 w-44 rounded-full bg-white/10" />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                        <ListTodo className="h-3.5 w-3.5" /> Task Board
                      </span>
                      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                        {stats.completed}/{stats.total} done
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Tasks & Deliverables</h2>
                    <p className="mt-1 max-w-xl text-sm text-indigo-100">
                      Drag cards across the board — every move is stamped with who moved it, so progress is always visible.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingTask(null);
                      setIsTaskModalOpen(true);
                    }}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition-all hover:bg-indigo-50 hover:shadow"
                  >
                    <Plus className="h-4 w-4" /> Add Task
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: "Total", value: stats.total, icon: <ListTodo className="h-4 w-4" />, cls: "text-slate-500 dark:text-slate-400" },
                  { label: "To Do", value: stats.todo, icon: <Circle className="h-4 w-4" />, cls: "text-blue-600 dark:text-blue-400" },
                  { label: "In Progress", value: stats.inProgress, icon: <Clock className="h-4 w-4" />, cls: "text-amber-600 dark:text-amber-400" },
                  { label: "Completed", value: stats.completed, icon: <CheckCircle2 className="h-4 w-4" />, cls: "text-emerald-600 dark:text-emerald-400" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${s.cls}`}>
                      {s.icon} {s.label}
                    </div>
                    <p className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              {tasks.length > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818] lg:flex-row lg:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                      placeholder="Search title, description, creator, mover, assignee…"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(["all", "high", "medium", "low"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setTaskPriorityFilter(p)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition-all ${
                          taskPriorityFilter === p
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        {p === "all" ? "All priorities" : p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Board */}
              {tasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md">
                    <ListTodo className="h-8 w-8" />
                  </div>
                  <p className="mt-4 text-base font-bold text-slate-900 dark:text-white">No tasks yet — fill the board</p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                    Create a task, assign it to students, and watch it travel from To Do to Done — with every move attributed.
                  </p>
                  <button
                    onClick={() => {
                      setEditingTask(null);
                      setIsTaskModalOpen(true);
                    }}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" /> Add First Task
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {groups.map((g) => {
                    const groupTasks = g.id === "unassigned"
                      ? visibleTasks.filter((t) => !t.milestoneId)
                      : visibleTasks.filter((t) => t.milestoneId === g.id);
                    if (g.id === "unassigned" && groupTasks.length === 0) return null;
                    return (
                      <div key={g.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-100">
                            <GitBranch className="h-4 w-4 text-indigo-500" />
                            {g.title}
                          </h3>
                          {g.deadline && (
                            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              <Calendar className="h-3 w-3" />
                              {new Date(`${g.deadline}T00:00:00`).toLocaleDateString()}
                            </span>
                          )}
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                            {groupTasks.length}
                          </span>
                        </div>
                        {groupTasks.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-[#333] dark:text-slate-500">
                            No tasks match the current search here.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            {columns.map((col) => {
                              const columnTasks = groupTasks
                                .filter((t) => t.status === col.status)
                                .sort((a, b) => {
                                  const da = a.dueDate ? new Date(`${a.dueDate}T00:00:00`).getTime() : Infinity;
                                  const db = b.dueDate ? new Date(`${b.dueDate}T00:00:00`).getTime() : Infinity;
                                  return da - db;
                                });
                              return (
                                <div
                                  key={col.status}
                                  onDragOver={handleTaskDragOver}
                                  onDrop={(e) => handleTaskDrop(e, col.status, g.id)}
                                  className={`flex min-h-[180px] flex-col rounded-xl ${col.columnBg} p-3 transition-colors ${
                                    draggedTaskId ? "outline-2 outline-dashed outline-indigo-300 dark:outline-indigo-500/50" : "outline-none"
                                  }`}
                                >
                                  <div className="mb-3 flex items-center justify-between px-1 pt-1">
                                    <h4 className={`text-xs font-extrabold tracking-wide ${col.headerColor}`}>{col.title}</h4>
                                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${col.countBg}`}>
                                      {columnTasks.length}
                                    </span>
                                  </div>
                                  <div className="flex flex-1 flex-col gap-2">
                                    {columnTasks.length === 0 ? (
                                      <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-slate-300/50 py-8 dark:border-slate-700">
                                        <p className="text-[11px] text-slate-400">Drop here</p>
                                      </div>
                                    ) : (
                                      columnTasks.map(renderTaskCard)
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === "documents" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Documents & Resources</h2>
              <button 
                onClick={() => setIsDocumentModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <Upload className="h-4 w-4" /> Add Resource
              </button>
            </div>
            <div className="space-y-3">
              {documents.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">No documents yet</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Upload papers, datasets, code, and other resources
                  </p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-[#2A2A2A]"
                  >
                    <div className="flex items-center gap-4">
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
                          {doc.type} • {doc.isLink ? 'Shared' : 'Uploaded'} by {doc.uploadedBy}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                      <button 
                        onClick={() => handleDeleteDocument(doc)}
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

        {activeTab === "meetings" && (() => {
          const now = new Date();
          const upcomingMeetings = meetings.filter((m) => {
            const dt = new Date(`${m.date}T${m.time || "00:00"}`);
            return dt >= now;
          });
          const pastMeetings = meetings.filter((m) => {
            const dt = new Date(`${m.date}T${m.time || "00:00"}`);
            return dt < now;
          });

          const platformConfig: Record<string, { label: string; color: string; bg: string; darkBg: string; border: string }> = {
            zoom: { label: "Zoom", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50", darkBg: "dark:bg-blue-500/15", border: "border-blue-200 dark:border-blue-500/30" },
            "google-meet": { label: "Google Meet", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50", darkBg: "dark:bg-emerald-500/15", border: "border-emerald-200 dark:border-emerald-500/30" },
            "google-classroom": { label: "Google Classroom", color: "text-teal-700 dark:text-teal-300", bg: "bg-teal-50", darkBg: "dark:bg-teal-500/15", border: "border-teal-200 dark:border-teal-500/30" },
            teams: { label: "MS Teams", color: "text-violet-700 dark:text-violet-300", bg: "bg-violet-50", darkBg: "dark:bg-violet-500/15", border: "border-violet-200 dark:border-violet-500/30" },
            custom: { label: "Custom Link", color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-50", darkBg: "dark:bg-slate-500/15", border: "border-slate-200 dark:border-slate-500/30" },
          };

          const renderMeetingCard = (meeting: Meeting, isPast: boolean) => {
            const platform = meeting.platform || "";
            const cfg = platform && platformConfig[platform] ? platformConfig[platform] : null;
            const meetingDateTime = new Date(`${meeting.date}T${meeting.time || "00:00"}`);
            const diffMs = meetingDateTime.getTime() - now.getTime();
            const isLiveSoon = !isPast && diffMs > 0 && diffMs < 30 * 60 * 1000;

            return (
              <div
                key={meeting.id}
                className={`group relative overflow-hidden rounded-2xl border p-5 transition-all ${
                  isPast
                    ? "border-slate-100 bg-slate-50/50 dark:border-[#222] dark:bg-[#111]"
                    : "border-slate-200 bg-white shadow-sm hover:shadow-md dark:border-[#2A2A2A] dark:bg-[#181818]"
                }`}
              >
                {/* Top row: title + actions */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`font-bold ${
                          isPast
                            ? "text-slate-500 dark:text-slate-500"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {meeting.title}
                      </h3>
                      {isLiveSoon && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          </span>
                          Starting soon
                        </span>
                      )}
                      {isPast && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                          Completed
                        </span>
                      )}
                    </div>

                    {/* Date, time & duration row */}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                      <span className={`flex items-center gap-1.5 ${ isPast ? "text-slate-400 dark:text-slate-500" : "text-slate-600 dark:text-slate-300" }`}>
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(meeting.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      {meeting.time && (
                        <span className={`flex items-center gap-1.5 ${ isPast ? "text-slate-400 dark:text-slate-500" : "text-slate-600 dark:text-slate-300" }`}>
                          <Clock className="h-3.5 w-3.5" />
                          {(() => {
                            const [h, m] = meeting.time.split(":").map(Number);
                            const period = h >= 12 ? "PM" : "AM";
                            const h12 = h % 12 || 12;
                            return `${h12}:${String(m).padStart(2, "0")} ${period}`;
                          })()}
                        </span>
                      )}
                      <span className={`flex items-center gap-1.5 ${ isPast ? "text-slate-400 dark:text-slate-500" : "text-slate-500 dark:text-slate-400" }`}>
                        <Clock className="h-3.5 w-3.5 opacity-60" />
                        {meeting.duration}
                      </span>
                    </div>

                    {/* Platform badge + link actions */}
                    {platform && cfg && (
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
                            >
                              <ExternalLink className="h-3 w-3" />
                              Join
                            </a>
                            <button
                              onClick={() => handleCopyMeetingLink(meeting)}
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
                    )}

                    {/* Agenda */}
                    {(meeting.agenda || meeting.notes) && (
                      <p className={`mt-3 rounded-lg border p-3 text-sm ${
                        isPast
                          ? "border-slate-100 bg-slate-50/50 text-slate-400 dark:border-[#222] dark:bg-[#0F0F0F] dark:text-slate-500"
                          : "border-slate-100 bg-slate-50 text-slate-600 dark:border-[#222] dark:bg-[#0F0F0F] dark:text-slate-300"
                      }`}>
                        {meeting.agenda || meeting.notes}
                      </p>
                    )}

                    {/* Attendees */}
                    {meeting.attendees && meeting.attendees.length > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <Users2 className={`h-3.5 w-3.5 ${ isPast ? "text-slate-400" : "text-slate-400 dark:text-slate-500" }`} />
                        <div className="flex flex-wrap gap-1">
                          {meeting.attendees.slice(0, 4).map((attendeeId) => {
                            const member = teamMembers.find((m) => m.studentId === attendeeId);
                            return member ? (
                              <span
                                key={attendeeId}
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  isPast
                                    ? "bg-slate-100 text-slate-400 dark:bg-slate-700/30 dark:text-slate-500"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
                                }`}
                              >
                                {member.studentName.split(" ")[0]}
                              </span>
                            ) : null;
                          })}
                          {meeting.attendees.length > 4 && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700/30 dark:text-slate-400">
                              +{meeting.attendees.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => {
                        setEditingMeeting(meeting);
                        setIsMeetingModalOpen(true);
                      }}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      title="Edit meeting"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteMeetingId(meeting.id)}
                      className="rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                      title="Delete meeting"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          };

          return (
            <div className="space-y-6">
              {/* Header card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Meetings &amp; Discussions</h2>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {upcomingMeetings.length} upcoming · {pastMeetings.length} past
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingMeeting(null);
                      setIsMeetingModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
                  >
                    <Plus className="h-4 w-4" /> Schedule Meeting
                  </button>
                </div>
              </div>

              {meetings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
                    <Calendar className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <p className="mt-4 text-base font-semibold text-slate-900 dark:text-white">No meetings scheduled yet</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Schedule a meeting and share a Zoom, Meet, or Teams link with your team.
                  </p>
                  <button
                    onClick={() => {
                      setEditingMeeting(null);
                      setIsMeetingModalOpen(true);
                    }}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" /> Schedule First Meeting
                  </button>
                </div>
              ) : (
                <>
                  {/* Upcoming */}
                  {upcomingMeetings.length > 0 && (
                    <div>
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
                    </div>
                  )}

                  {/* Past */}
                  {pastMeetings.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Past ({pastMeetings.length})
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {pastMeetings.map((m) => renderMeetingCard(m, true))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

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
          const inPipeline = publications.filter((p) => ["submitted", "under-review", "revision", "accepted"].includes(p.status)).length;
          const decided = publications.filter((p) => ["published", "accepted", "rejected"].includes(p.status)).length;
          const acceptanceRate = decided === 0 ? 0 : Math.round(((publishedCount + publications.filter((p) => p.status === "accepted").length) / decided) * 100);

          const q = pubSearch.trim().toLowerCase();
          const filtered = publications
            .filter((p) => (pubStatusFilter === "all" ? true : p.status === pubStatusFilter))
            .filter((p) => (pubTypeFilter === "all" ? true : p.type === pubTypeFilter))
            .filter((p) => {
              if (!q) return true;
              return (
                p.title.toLowerCase().includes(q) ||
                p.venue.toLowerCase().includes(q) ||
                (p.authors || []).join(" ").toLowerCase().includes(q) ||
                (p.keywords || []).join(" ").toLowerCase().includes(q) ||
                (p.doi || "").toLowerCase().includes(q)
              );
            })
            .sort((a, b) => {
              const rank = (s: string) => ({ published: 0, accepted: 1, "under-review": 2, revision: 3, submitted: 4, draft: 5, rejected: 6 } as Record<string, number>)[s] ?? 7;
              return rank(a.status) - rank(b.status);
            });

          return (
            <div className="space-y-5">
              {/* Hero header */}
              <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 text-white shadow-sm dark:border-indigo-500/20">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-20 right-24 h-44 w-44 rounded-full bg-white/10" />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                        <BookOpen className="h-3.5 w-3.5" /> Research Output
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isGroupPublished ? "bg-emerald-400/20 text-emerald-100" : "bg-amber-400/20 text-amber-100"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isGroupPublished ? "bg-emerald-300" : "bg-amber-300"}`} />
                        {isGroupPublished ? `Published · ${publishedCount}` : "Ongoing — no published paper yet"}
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Publications & Submissions</h2>
                    <p className="mt-1 max-w-xl text-sm text-indigo-100">
                      Journals, conferences, preprints — anything this group produces. Add as many as you need, share links, and the group badge flips to Published automatically.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingPublication(null);
                      setIsPublicationModalOpen(true);
                    }}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition-all hover:bg-indigo-50 hover:shadow"
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
                      This group is Published — {publishedCount} paper{publishedCount === 1 ? "" : "s"} live.
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                      The header badge, group record and topic record all reflect this. Keep adding follow-up work below.
                    </p>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: "Total outputs", value: publications.length, icon: <BookOpen className="h-4 w-4" />, cls: "text-indigo-600 dark:text-indigo-400" },
                  { label: "Published", value: publishedCount, icon: <CheckCircle2 className="h-4 w-4" />, cls: "text-emerald-600 dark:text-emerald-400" },
                  { label: "In pipeline", value: inPipeline, icon: <Send className="h-4 w-4" />, cls: "text-amber-600 dark:text-amber-400" },
                  { label: "Acceptance rate", value: `${acceptanceRate}%`, icon: <Sparkles className="h-4 w-4" />, cls: "text-violet-600 dark:text-violet-400" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${s.cls}`}>
                      {s.icon} {s.label}
                    </div>
                    <p className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              {publications.length > 0 && (
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
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(["all", "published", "under-review", "submitted", "accepted", "draft", "rejected"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setPubStatusFilter(s)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition-all ${
                          pubStatusFilter === s
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        {s === "all" ? "All" : s.replace("-", " ")}
                      </button>
                    ))}
                  </div>
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
                </div>
              )}

              {/* List */}
              {publications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md">
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
                <div className="space-y-4">
                  {filtered.map((pub) => {
                    const meta = typeMeta[pub.type] || typeMeta.other;
                    const expanded = expandedPubId === pub.id;
                    const doiUrl = pub.doi ? `https://doi.org/${pub.doi}` : "";
                    return (
                      <article
                        key={pub.id}
                        className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md dark:bg-[#181818] ${
                          pub.status === "published"
                            ? "border-emerald-200 dark:border-emerald-500/30"
                            : "border-slate-200 dark:border-[#2A2A2A]"
                        }`}
                      >
                        {pub.status === "published" && <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400" />}
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
                                <h3 className="mt-1.5 text-lg font-extrabold leading-snug text-slate-900 dark:text-white">
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
                            <div className="flex shrink-0 gap-1">
                              <button
                                onClick={() => {
                                  setEditingPublication(pub);
                                  setIsPublicationModalOpen(true);
                                }}
                                title="Edit publication"
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeletePublicationId(pub.id)}
                                title="Remove publication"
                                className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Authors */}
                          {(pub.authors?.length ?? 0) > 0 && (
                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              {pub.authors!.slice(0, 6).map((a) => (
                                <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-1 pr-2.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                                    {a.charAt(0).toUpperCase()}
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
                              <a href={doiUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20">
                                <LinkIcon className="h-3 w-3" /> DOI: {pub.doi.length > 28 ? `${pub.doi.slice(0, 28)}…` : pub.doi}
                              </a>
                            )}
                            {pub.paperUrl && (
                              <a href={pub.paperUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">
                                <FileDown className="h-3 w-3" /> Paper / PDF <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {pub.codeUrl && (
                              <a href={pub.codeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-[#333] dark:text-slate-300 dark:hover:bg-[#0F0F0F]">
                                <Code2 className="h-3 w-3" /> Code
                              </a>
                            )}
                            {pub.projectUrl && (
                              <a href={pub.projectUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-[#333] dark:text-slate-300 dark:hover:bg-[#0F0F0F]">
                                <Globe className="h-3 w-3" /> Project page
                              </a>
                            )}
                            <div className="ml-auto flex items-center gap-1.5">
                              <button
                                onClick={() => handleCopyPublicationLink(pub)}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${copiedPubId === pub.id ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#333] dark:text-slate-400 dark:hover:bg-[#0F0F0F]"}`}
                              >
                                <Copy className="h-3 w-3" /> {copiedPubId === pub.id ? "Copied!" : "Copy link"}
                              </button>
                              <button
                                onClick={() => handleNativeSharePublication(pub)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-[#333] dark:text-slate-400 dark:hover:bg-[#0F0F0F]"
                              >
                                <Share2 className="h-3 w-3" /> Share
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <ConfirmModal
        isOpen={!!deleteMilestoneId}
        onClose={() => setDeleteMilestoneId(null)}
        onConfirm={handleDeleteMilestone}
        title="Delete Milestone"
        message="Are you sure you want to delete this milestone? This action cannot be undone and will also delete any associated tasks."
        confirmText="Delete"
      />

      <ConfirmModal
        isOpen={!!deleteTaskId}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
      />

      <ConfirmModal
        isOpen={!!deleteMeetingId}
        onClose={() => setDeleteMeetingId(null)}
        onConfirm={handleDeleteMeeting}
        title="Delete Meeting"
        message="Are you sure you want to delete this meeting? The meeting link and all details will be permanently removed."
        confirmText="Delete"
      />

      <ConfirmModal
        isOpen={!!deletePublicationId}
        onClose={() => setDeletePublicationId(null)}
        onConfirm={handleDeletePublication}
        title="Remove Publication"
        message="Are you sure you want to remove this publication? If it was the only published paper, the group will return to Ongoing."
        confirmText="Remove"
      />
    </DashboardLayout>
  );
}
