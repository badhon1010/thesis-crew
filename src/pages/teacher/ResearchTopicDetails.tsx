import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Code2,
  FileText,
  UserCheck,
  Edit,
  Loader2,
  Mail,
  BookOpen,
  Eye,
  Trash2,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { StudentProfileModal } from "@/components/common/StudentProfileModal";
import { doc, getDoc, updateDoc, arrayRemove, collection, query, where, getDocs, onSnapshot, type Unsubscribe } from "firebase/firestore";
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
  supervisorName?: string;
  status?: string;
}

interface TeamMember {
  studentId: string;
  studentName: string;
  studentEmail?: string;
}

export default function ResearchTopicDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [topic, setTopic] = useState<ResearchTopic | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; type: "success" | "error"; message: string }>({
    show: false,
    type: "success",
    message: "",
  });

  useEffect(() => {
    if (!id) return;

    let unsubscribeJoinRequests: Unsubscribe | undefined;
    let unsubscribeTeam: Unsubscribe | undefined;

    const fetchTopicData = async () => {
      try {
        setLoading(true);
        // Fetch Topic Details
        const topicRef = doc(db, "researchTopics", id);
        const topicSnap = await getDoc(topicRef);

        if (!topicSnap.exists()) {
          setToast({ show: true, type: "error", message: "Research topic not found." });
          setLoading(false);
          return;
        }

        setTopic({ id: topicSnap.id, ...topicSnap.data() } as ResearchTopic);

        // Subscribe to pending requests count in real-time
        unsubscribeJoinRequests = onSnapshot(
          query(collection(db, "joinRequests"), where("projectId", "==", id), where("status", "==", "pending")),
          (snapshot) => {
            setPendingRequestCount(snapshot.docs.length);
          },
          (error) => console.error("Failed to load pending requests:", error)
        );

        // Subscribe to team members in real-time
        unsubscribeTeam = onSnapshot(
          doc(db, "teams", id),
          async (teamSnapshot) => {
            if (!teamSnapshot.exists()) {
              setTeamMembers([]);
              setLoading(false);
              return;
            }

            const teamData = teamSnapshot.data();
            const memberIds = (teamData.memberIds as string[]) || [];

            // Fetch accepted join requests for these members to get their details
            if (memberIds.length > 0) {
              const joinRequestsQuery = query(
                collection(db, "joinRequests"),
                where("projectId", "==", id),
                where("status", "==", "accepted")
              );
              const joinRequestsSnap = await getDocs(joinRequestsQuery);

              // Map every identifier a member could be known by (their own studentId,
              // a team-leader id, or a uid used on group sub-members) to their real details.
              // This avoids the same person being resolved twice under different ids,
              // and avoids falling back to a coded placeholder name when a real match exists.
              const identityMap = new Map<string, TeamMember>();
              const registerIdentity = (idValue: string | undefined, member: TeamMember) => {
                if (idValue && !identityMap.has(idValue)) {
                  identityMap.set(idValue, member);
                }
              };

              joinRequestsSnap.docs.forEach((doc) => {
                const data = doc.data();

                // Always register the requester (team leader for group requests,
                // or the sole applicant for individual requests) under every id
                // they might be referenced by elsewhere.
                const leaderMember: TeamMember = {
                  studentId: data.studentId,
                  studentName: data.studentName || "Unnamed student",
                  studentEmail: data.studentEmail,
                };
                registerIdentity(data.studentId, leaderMember);
                registerIdentity(data.teamLeaderId, leaderMember);

                // Register any additional teammates for group requests
                if (data.requestType === "group" && Array.isArray(data.teamMembers) && data.teamMembers.length > 0) {
                  data.teamMembers.forEach((tm: { studentId?: string; uid?: string; name: string; email?: string }) => {
                    const groupMember: TeamMember = {
                      studentId: tm.studentId || tm.uid || "",
                      studentName: tm.name || "Unnamed student",
                      studentEmail: tm.email,
                    };
                    registerIdentity(tm.studentId, groupMember);
                    registerIdentity(tm.uid, groupMember);
                  });
                }
              });

              // The team's memberIds array is the source of truth for who is actually
              // on the team and how many members there are. Resolve each one against
              // the identity map, deduping by the member's canonical studentId so the
              // same person can never appear twice.
              const resolvedMembers = new Map<string, TeamMember>();
              memberIds.forEach((memberId) => {
                const known = identityMap.get(memberId);
                if (known) {
                  resolvedMembers.set(known.studentId || memberId, known);
                } else if (!resolvedMembers.has(memberId)) {
                  resolvedMembers.set(memberId, {
                    studentId: memberId,
                    studentName: `Student (${memberId.slice(0, 6)})`,
                  });
                }
              });

              setTeamMembers(Array.from(resolvedMembers.values()));
            } else {
              setTeamMembers([]);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Failed to load team data:", error);
            setLoading(false);
          }
        );
      } catch (error) {
        console.error("Error loading topic details:", error);
        setToast({ show: true, type: "error", message: "Failed to load topic details." });
        setLoading(false);
      }
    };

    fetchTopicData();

    return () => {
      unsubscribeJoinRequests?.();
      unsubscribeTeam?.();
    };
  }, [id]);

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!id) return;
    const confirmed = window.confirm(`Remove ${studentName} from this research team? This cannot be undone.`);
    if (!confirmed) return;

    setRemovingStudentId(studentId);
    try {
      await updateDoc(doc(db, "teams", id), {
        memberIds: arrayRemove(studentId),
      });
      setToast({ show: true, type: "success", message: `${studentName} was removed from the team.` });
    } catch (error) {
      console.error("Failed to remove student from team:", error);
      setToast({ show: true, type: "error", message: "Could not remove the student. Please try again." });
    } finally {
      setRemovingStudentId(null);
    }
  };

  // Helper to check if deadline has passed (same logic as TeacherResearchTopics.tsx)
  const isTopicClosed = (deadline?: string) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadlineDate < today;
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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Topic Not Found</h2>
          <button
            onClick={() => navigate("/teacher/topics")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Research Topics
          </button>
        </div>
      </DashboardLayout>
    );
  }

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

      <div className="mx-auto max-w-5xl px-2 sm:px-0">
        {/* Navigation & Actions */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <Link
            to={`/teacher/topics/edit/${topic.id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-300 dark:hover:bg-[#222222]"
          >
            <Edit className="h-3.5 w-3.5" /> Edit Topic
          </Link>
        </div>

        {/* Header Title Card */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              {topic.category}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                isTopicClosed(topic.applicationDeadline)
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              }`}
            >
              {isTopicClosed(topic.applicationDeadline) ? "Closed" : "Open"}
            </span>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
            {topic.title}
          </h1>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Supervisor: <span className="font-semibold text-slate-700 dark:text-slate-300">{topic.supervisorName || "N/A"}</span>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
              <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-semibold uppercase">Pending Requests</span>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{pendingRequestCount}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Awaiting review
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
              <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold uppercase">Accepted Members</span>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
              {teamMembers.length} / {topic.maxTeamSize}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Max team capacity: {topic.maxTeamSize}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
              <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-semibold uppercase">Deadline</span>
            </div>
            <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
              {topic.applicationDeadline
                ? new Date(topic.applicationDeadline).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "No deadline set"}
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Details & Objectives */}
          <div className="space-y-6 lg:col-span-2">
            {/* Description */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Project Description
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {topic.description}
              </p>
            </div>

            {/* Objectives */}
            {topic.researchObjectives && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Research Objectives
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {topic.researchObjectives}
                </p>
              </div>
            )}

            {/* Required Skills */}
            {topic.requiredSkills && topic.requiredSkills.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
                <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <Code2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Required Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {topic.requiredSkills.map((skill, index) => (
                    <span
                      key={index}
                      className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Accepted Students List */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Accepted Students
                </h2>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  {teamMembers.length}
                </span>
              </div>

              {teamMembers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No students have been accepted for this topic yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-[#2A2A2A]">
                  {teamMembers.map((member) => (
                    <div key={member.studentId} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {member.studentName}
                          </p>
                          {member.studentEmail && (
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                              <Mail className="h-3 w-3" />
                              {member.studentEmail}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => setSelectedStudentId(member.studentId)}
                            className="rounded-lg p-1.5 text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                            title="View Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveStudent(member.studentId, member.studentName)}
                            disabled={removingStudentId === member.studentId}
                            className="rounded-lg p-1.5 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                            title="Remove Student"
                          >
                            {removingStudentId === member.studentId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pendingRequestCount > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-4 dark:border-[#2A2A2A]">
                  <Link
                    to="/teacher/requests"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 py-2.5 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Review {pendingRequestCount} Pending Request{pendingRequestCount === 1 ? "" : "s"}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
