import { useEffect, useState } from "react";
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
  Loader2,
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
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { GroupChat } from "@/components/chat/GroupChat";
import { auth } from "@/firebase/auth";
import { StudentProfileModal } from "@/components/common/StudentProfileModal";
import { MilestoneViewModal } from "@/components/ui/MilestoneViewModal";
import { TaskViewModal } from "@/components/ui/TaskViewModal";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { notifyTeacherOfTaskUpdate, notifyTeacherOfMilestoneCompletion } from "@/firebase/notifications";

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

export default function StudentGroupDetails() {
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
  const [conversations, setConversations] = useState<{ id: string; updatedAt?: any }[]>([]);
  
  const [lastViewed, setLastViewed] = useState<Record<string, number>>(() => {
    const stored = localStorage.getItem(`group_${id}_lastViewed`);
    return stored ? JSON.parse(stored) : { overview: Date.now() };
  });
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [viewingMilestone, setViewingMilestone] = useState<Milestone | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  const [toast, setToast] = useState<{ show: boolean; type: "success" | "error"; message: string }>({
    show: false,
    type: "success",
    message: "",
  });

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



  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
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

      <div className="mx-auto max-w-7xl px-2 sm:px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/student/my-groups")}
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
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id !== activeTab && hasUnread(tab.id) && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#181818]"></span>
                )}
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

        {activeTab === "milestones" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Project Milestones</h2>
            </div>

            <div className="space-y-4">
              {milestones.length === 0 ? (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 py-12 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400">No milestones have been created yet.</p>
                </div>
              ) : (
                milestones.map((milestone) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const deadlineDate = new Date(milestone.deadline);
                  const isOverdue = deadlineDate < today && milestone.status !== "completed";
                  const milestoneTasks = tasks.filter((t) => t.milestoneId === milestone.id);

                  return (
                    <div
                      key={milestone.id}
                      className={`rounded-xl border p-5 ${
                        isOverdue 
                          ? "border-rose-200 bg-rose-50/30 dark:border-rose-900/50 dark:bg-rose-950/10" 
                          : "border-slate-200 bg-white dark:border-[#333] dark:bg-[#1A1A1A]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
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
                          
                          <div className="mt-4 flex items-center gap-4 text-sm font-medium">
                            <div className={`flex items-center gap-1.5 ${
                              isOverdue 
                                ? "text-rose-600 dark:text-rose-400 font-bold" 
                                : "text-slate-500 dark:text-slate-400"
                            }`}>
                              <Calendar className="h-4 w-4" />
                              {isOverdue ? "Overdue: " : "Deadline: "}
                              {new Date(milestone.deadline).toLocaleDateString()}
                            </div>
                            
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                              <CheckCircle2 className="h-4 w-4" />
                              {milestoneTasks.filter(t => t.status === "completed").length} / {milestoneTasks.length} Tasks Completed
                            </div>
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
                      {milestoneTasks.length > 0 && (
                        <div className="mt-6 border-t border-slate-100 pt-4 dark:border-[#2A2A2A]">
                          <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Associated Tasks</h4>
                          <div className="grid gap-2">
                            {milestoneTasks.map(task => (
                              <div key={task.id} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 dark:bg-[#111]">
                                <div className="mt-0.5">
                                  {task.status === "completed" ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  ) : task.status === "in-progress" ? (
                                    <Clock className="h-4 w-4 text-amber-500" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                                  )}
                                </div>
                                <div>
                                  <p className={`text-sm font-medium ${task.status === "completed" ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}>
                                    {task.title}
                                  </p>
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
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 dark:border-slate-700 dark:bg-[#181818]">
                <p className="text-sm text-slate-500 dark:text-slate-400">No tasks have been created yet.</p>
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
                            className={`flex flex-col rounded-lg ${columnBg} p-3 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, status, milestone.id)}
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
                                      className={`group ${isAssigned ? 'cursor-grab' : 'cursor-not-allowed opacity-75'} rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all duration-200 border ${
                                        isOverdue
                                          ? "bg-rose-50/50 border-rose-200 hover:border-rose-300 dark:bg-rose-950/20 dark:border-rose-900/50 dark:hover:border-rose-800"
                                          : "bg-white hover:bg-slate-50 dark:bg-[#1C1C1E] dark:hover:bg-[#252528] border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600"
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
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Documents & Resources</h2>
              <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
                <Upload className="h-4 w-4" /> Upload Document
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
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{doc.title}</h3>
                        <p className="mt-0.5 text-xs capitalize text-slate-500 dark:text-slate-400">
                          {doc.type} • Uploaded by {doc.uploadedBy}
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
                        <LinkIcon className="h-4 w-4" />
                      </a>
                      <button className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
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
    </DashboardLayout>
  );
}
