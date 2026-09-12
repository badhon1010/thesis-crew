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
  status: "pending" | "in-progress" | "completed";
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

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

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

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: "todo" | "in-progress" | "completed") => {
    e.preventDefault();
    const taskId = draggedTaskId;
    
    if (!taskId || !id) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      try {
        await updateDoc(doc(db, "researchGroups", id, "tasks", taskId), {
          status: newStatus,
        });
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
        isOpen={selectedStudentId !== null}
        studentId={selectedStudentId || ""}
        onClose={() => setSelectedStudentId(null)}
      />

      <div className="mx-auto max-w-5xl px-2 sm:px-0">
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

        {activeTab === "milestones" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Research Milestones</h2>
              <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
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
                          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
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
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tasks Kanban Board</h2>
            </div>

            {/* Kanban Columns Authentic Jira-style */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {(["todo", "in-progress", "completed"] as const).map((status) => {
                const columnTasks = tasks.filter((t) => t.status === status);
                
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
                    onDrop={(e) => handleDrop(e, status)}
                  >
                    <div className="mb-3 flex items-center justify-between px-1 pt-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-xs font-bold ${headerColor}`}>{title}</h3>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${countBg}`}>
                          {columnTasks.length}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-1.5 min-h-[250px] pb-1">
                      {columnTasks.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center rounded-[3px] border-2 border-dashed border-slate-300/50 dark:border-slate-700">
                          <p className="text-xs text-slate-400">Drop tasks here</p>
                        </div>
                      ) : (
                        columnTasks.map((task) => {
                          let PriorityIcon = ChevronDown;
                          let priorityColor = "text-blue-500";
                          
                          if (task.priority === "high") {
                            PriorityIcon = ChevronUp;
                            priorityColor = "text-rose-500";
                          } else if (task.priority === "medium") {
                            PriorityIcon = Minus;
                            priorityColor = "text-amber-500";
                          }

                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              className="group cursor-grab rounded-[3px] bg-white p-2.5 shadow-[0_1px_2px_rgba(9,30,66,0.25)] hover:bg-slate-50 active:cursor-grabbing dark:bg-[#222731] dark:shadow-[0_1px_2px_rgba(0,0,0,0.5)] dark:hover:bg-[#2c333f] border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-colors"
                            >
                              <div className="mb-2">
                                <h4 className={`text-[14px] leading-snug text-[#172b4d] dark:text-[#b6c2cf] ${status === "completed" ? "line-through opacity-70" : ""}`}>
                                  {task.title}
                                </h4>
                              </div>

                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-2">
                                  <div title={`Priority: ${task.priority}`} className="flex h-5 w-5 items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                                    <PriorityIcon className={`h-4 w-4 ${priorityColor}`} strokeWidth={3} />
                                  </div>
                                  <span className="text-[12px] font-medium text-[#5e6c84] dark:text-slate-400 hover:underline cursor-pointer">
                                    {task.id.substring(0, 7).toUpperCase()}
                                  </span>
                                </div>
                                
                                {task.dueDate && (
                                  <span className="text-[11px] text-[#5e6c84] dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-[3px]">
                                    {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
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
