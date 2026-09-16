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
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { StudentProfileModal } from "@/components/common/StudentProfileModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TaskModal } from "@/components/ui/TaskModal";
<<<<<<< HEAD
import { DocumentModal } from "@/components/ui/DocumentModal";
=======
import { MilestoneModal } from "@/components/ui/MilestoneModal";
>>>>>>> student
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
  createdAt?: unknown;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string[];
  status: "todo" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
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
  storagePath?: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: string;
  notes?: string;
  attendees: string[];
  createdAt?: unknown;
}

interface Publication {
  id: string;
  title: string;
  venue: string;
  type: "conference" | "journal" | "workshop" | "preprint";
  status: "draft" | "submitted" | "under-review" | "accepted" | "published" | "rejected";
  submissionDate?: string;
  acceptanceDate?: string;
  publicationDate?: string;
  doi?: string;
  createdAt?: unknown;
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
    try {
      if (editingTask) {
        await updateDoc(doc(db, "researchGroups", id, "tasks", editingTask.id), {
          ...taskData,
        });
        showToast("success", "Task updated successfully");
      } else {
        await addDoc(collection(db, "researchGroups", id, "tasks"), {
          ...taskData,
          createdAt: serverTimestamp(),
        });
        showToast("success", "Task created successfully");
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

  const toggleTaskStatus = async (task: Task) => {
    if (!id) return;
    try {
      const newStatus = task.status === "completed" ? "todo" : "completed";
      await updateDoc(doc(db, "researchGroups", id, "tasks", task.id), {
        status: newStatus,
      });
    } catch (error) {
      console.error("Error updating task status:", error);
      showToast("error", "Failed to update task status");
    }
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
        }}
        onSave={handleSaveTask}
        editingTask={editingTask}
        teamMembers={teamMembers}
        milestones={milestones}
      />
      <MilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={() => {
          setIsMilestoneModalOpen(false);
          setEditingMilestone(null);
        }}
        onSave={handleSaveMilestone}
        initialData={editingMilestone}
      />

      <DocumentModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        onSave={handleSaveDocument}
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
                    publications.some((pub) => pub.status === "published")
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                  }`}
                >
                  {publications.some((pub) => pub.status === "published") ? "Published" : "Ongoing"}
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
                      .map((milestone) => (
                        <div key={milestone.id} className="flex items-start gap-3">
                          <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{milestone.title}</p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              Due: {new Date(milestone.deadline).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
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

        {activeTab === "milestones" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Research Milestones</h2>
              <button
                type="button"
                onClick={() => {
                  setEditingMilestone(null);
                  setIsMilestoneModalOpen(true);
                }}
                className="relative z-10 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" /> Add Milestone
              </button>
            </div>
            <div className="space-y-4">
              {milestones.length === 0 ? (
                <div className="py-12 text-center">
                  <GitBranch className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">No milestones yet</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Create milestones to track research progress
                  </p>
                </div>
              ) : (
                milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-start gap-4 rounded-xl border border-slate-200 p-4 dark:border-[#2A2A2A]"
                  >
                    <div className="flex-shrink-0">
                      {milestone.status === "completed" ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      ) : milestone.status === "in-progress" ? (
                        <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <Circle className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white">{milestone.title}</h3>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{milestone.description}</p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <span>Due: {new Date(milestone.deadline).toLocaleDateString()}</span>
                            <span className="capitalize">Status: {milestone.status.replace("-", " ")}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingMilestone(milestone);
                              setIsMilestoneModalOpen(true);
                            }}
                            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteMilestoneId(milestone.id || null)}
                            className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tasks & Deliverables</h2>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" /> Add Task
              </button>
            </div>

            {/* Task Stats */}
            <div className="mb-6 grid grid-cols-4 gap-4">
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-[#0F0F0F]">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{getTaskStats().total}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-500/10">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">To Do</p>
                <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-100">{getTaskStats().todo}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-500/10">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">In Progress</p>
                <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100">{getTaskStats().inProgress}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-500/10">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Completed</p>
                <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100">{getTaskStats().completed}</p>
              </div>
            </div>

            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">No tasks yet</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Add tasks to organize and track work
                  </p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-4 rounded-xl border border-slate-200 p-4 dark:border-[#2A2A2A]"
                  >
                    <input
                      type="checkbox"
                      checked={task.status === "completed"}
                      onChange={() => toggleTaskStatus(task)}
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className={`font-semibold ${task.status === "completed" ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>
                            {task.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{task.description}</p>
                          <div className="mt-2 flex items-center gap-4 text-xs">
                            <span
                              className={`rounded-full px-2 py-0.5 font-semibold capitalize ${
                                task.priority === "high"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                                  : task.priority === "medium"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300"
                              }`}
                            >
                              {task.priority}
                            </span>
                            {task.dueDate && (
                              <span className="text-slate-500 dark:text-slate-400">
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingTask(task);
                              setIsTaskModalOpen(true);
                            }}
                            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTaskId(task.id || null)}
                            className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

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

        {activeTab === "meetings" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Meetings & Discussions</h2>
              <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
                <Plus className="h-4 w-4" /> Schedule Meeting
              </button>
            </div>
            <div className="space-y-4">
              {meetings.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">No meetings yet</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Schedule meetings to collaborate with your team
                  </p>
                </div>
              ) : (
                meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="rounded-xl border border-slate-200 p-4 dark:border-[#2A2A2A]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{meeting.title}</h3>
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
                        {meeting.notes && (
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{meeting.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "publications" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Publications & Submissions</h2>
              <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
                <Plus className="h-4 w-4" /> Add Publication
              </button>
            </div>
            <div className="space-y-4">
              {publications.length === 0 ? (
                <div className="py-12 text-center">
                  <BookOpen className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">No publications yet</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Track conference and journal submissions here
                  </p>
                </div>
              ) : (
                publications.map((pub) => (
                  <div
                    key={pub.id}
                    className="rounded-xl border border-slate-200 p-4 dark:border-[#2A2A2A]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-white">{pub.title}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${
                              pub.status === "published"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                : pub.status === "accepted"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                : pub.status === "under-review"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                : pub.status === "rejected"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300"
                            }`}
                          >
                            {pub.status.replace("-", " ")}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {pub.venue} • {pub.type}
                        </p>
                        {pub.doi && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">DOI: {pub.doi}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
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
    </DashboardLayout>
  );
}
