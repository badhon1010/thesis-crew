import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock3, Loader2, UserRound, X, Eye, Users, Sparkles } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { StudentProfileModal } from "@/components/common/StudentProfileModal";
import { GroupMemberProfileModal } from "@/components/common/GroupMemberProfileModal";
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";
import { calculateSkillMatch } from "@/utils/skillMatching";
import { reviewJoinRequest, type JoinRequest } from "@/firebase/teamFormation";

export default function TeacherJoinRequests() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<JoinRequest["teamMembers"] | []>([]);

  useEffect(() => {
    let unsubscribeRequests: Unsubscribe | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeRequests?.();
      if (!user) {
        setRequests([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      unsubscribeRequests = onSnapshot(
        query(collection(db, "joinRequests"), where("supervisorId", "==", user.uid)),
        (snapshot) => {
          setRequests(snapshot.docs.map((request) => ({ id: request.id, ...(request.data() as Omit<JoinRequest, "id">) })));
          setLoading(false);
        },
        (error) => {
          console.error("Failed to subscribe to join requests:", error);
          setToast({ type: "error", message: "Could not load join requests." });
          setLoading(false);
        },
      );
    });

    return () => { unsubscribeAuth(); unsubscribeRequests?.(); };
  }, []);

  const pendingRequests = useMemo(() => requests.filter((request) => request.status === "pending"), [requests]);
  const individualRequests = useMemo(() => pendingRequests.filter((req) => req.requestType === "individual"), [pendingRequests]);
  const groupRequests = useMemo(() => pendingRequests.filter((req) => req.requestType === "group"), [pendingRequests]);

  const handleReview = async (request: JoinRequest, decision: "accepted" | "rejected") => {
    if (!auth.currentUser) return;
    setReviewingId(request.id);
    try {
      await reviewJoinRequest(request.id, auth.currentUser.uid, decision);
      if (request.requestType === "group") {
        setToast({
          type: "success",
          message: decision === "accepted"
            ? `Group of ${request.teamMembers?.length || 0} students was added to the team.`
            : "Group request rejected."
        });
      } else {
        setToast({
          type: "success",
          message: decision === "accepted"
            ? `${request.studentName} was added to the team.`
            : "Join request rejected."
        });
      }
    } catch (error) {
      console.error("Failed to review join request:", error);
      setToast({ type: "error", message: error instanceof Error ? error.message : "Could not review the request." });
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <DashboardLayout role="teacher">
      <div className="mx-auto max-w-6xl px-2 sm:px-4">
        {toast && <ToastAlert type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

        <StudentProfileModal
          isOpen={selectedStudentId !== null}
          studentId={selectedStudentId || ""}
          onClose={() => setSelectedStudentId(null)}
        />

        <GroupMemberProfileModal
          isOpen={(selectedGroupMembers?.length ?? 0) > 0}
          teamMembers={selectedGroupMembers || []}
          onClose={() => setSelectedGroupMembers([])}
        />

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Link to="/teacher/dashboard" className="mb-3 inline-flex text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Team join requests
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Review student applications and build teams for your research topics.
            </p>
          </div>
          <span className="w-fit rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
            {pendingRequests.length} pending
          </span>
        </div>

        {/* Individual Requests Section */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-[#2A2A2A]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                <UserRound className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Individual Requests</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Students applying individually</p>
              </div>
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              {individualRequests.length}
            </span>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
          ) : individualRequests.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <UserRound className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                No pending individual requests
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Individual applications will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#2A2A2A]">
              {individualRequests.map((request) => {
                const match = calculateSkillMatch(request.studentSkills, request.topicRequiredSkills);
                const busy = reviewingId === request.id;
                return (
                  <article key={request.id} className="p-6">
                    <div className="flex flex-col justify-between gap-5 sm:flex-row">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                          {request.studentName.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {request.studentName}
                            </p>
                            <button
                              onClick={() => setSelectedStudentId(request.studentId)}
                              className="rounded-lg p-1 text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                              title="View Profile"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {request.studentEmail || "No email added"} · {request.studentDepartment || "Department not added"}
                          </p>
                          <p className="mt-3 text-sm font-medium text-indigo-700 dark:text-indigo-300">
                            {request.topicTitle}
                          </p>
                          {request.message && (
                            <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-[#121212] dark:text-slate-300">
                              "{request.message}"
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {request.studentSkills.length ? (
                              request.studentSkills.map((skill) => (
                                <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500">No skills added</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                        {request.aiMatchAnalysis ? (
                          <div className="rounded-lg bg-indigo-50 px-3 py-2 text-right dark:bg-indigo-500/10">
                            <div className="flex items-center justify-end gap-1 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                              <Sparkles className="h-4 w-4" /> {request.aiMatchAnalysis.matchScore}% match
                            </div>
                            <p className="mt-0.5 text-[10px] text-indigo-700/70 dark:text-indigo-300/70">
                              AI Analyzed
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-right dark:bg-emerald-950/30">
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              {match.score}% match
                            </p>
                            <p className="mt-0.5 text-[10px] text-emerald-700/70 dark:text-emerald-300/70">
                              {match.matchedSkills.length} of {match.matchedSkills.length + match.missingSkills.length} required skills
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            disabled={busy}
                            onClick={() => handleReview(request, "rejected")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => handleReview(request, "accepted")}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Accept
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

        {/* Group Requests Section */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-[#2A2A2A]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10">
                <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Group Requests</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Teams applying together</p>
              </div>
            </div>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
              {groupRequests.length}
            </span>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
          ) : groupRequests.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                No pending group requests
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Group applications will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#2A2A2A]">
              {groupRequests.map((request) => {
                const busy = reviewingId === request.id;
                
                // Construct a complete list of team members, including the leader
                const leaderMember = {
                  studentId: request.studentId,
                  uid: request.teamLeaderId || request.studentId, // Ensure uid fallback
                  name: request.studentName,
                  email: request.studentEmail,
                  department: request.studentDepartment,
                  cgpa: request.studentCgpa,
                  skills: request.studentSkills,
                };
                
                const otherMembers = request.teamMembers || [];
                const fullTeamMembers = [leaderMember, ...otherMembers];
                const teamSize = fullTeamMembers.length;

                // Calculate average skill match across all team members
                const allSkills = fullTeamMembers.flatMap(m => m.skills || []);
                const avgMatch = calculateSkillMatch(allSkills, request.topicRequiredSkills);

                return (
                  <article key={request.id} className="p-6">
                    <div className="flex flex-col justify-between gap-5 sm:flex-row">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 font-bold text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                          <Users className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              Group Request ({teamSize} member{teamSize === 1 ? "" : "s"})
                            </p>
                            <button
                              onClick={() => setSelectedGroupMembers(fullTeamMembers)}
                              className="rounded-lg p-1 text-violet-600 transition-colors hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10"
                              title="View All Members"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Leader: {request.studentName}
                          </p>
                          <p className="mt-3 text-sm font-medium text-indigo-700 dark:text-indigo-300">
                            {request.topicTitle}
                          </p>
                          {request.message && (
                            <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-[#121212] dark:text-slate-300">
                              "{request.message}"
                            </p>
                          )}

                          {/* Team Members Preview */}
                          <div className="mt-4">
                            <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">Team Members:</p>
                            <div className="space-y-2">
                              {fullTeamMembers.map((member, index) => (
                                <div key={member.studentId} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 dark:bg-[#121212]">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                                    {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                      {member.name} {index === 0 && <span className="text-[10px] text-violet-600 dark:text-violet-400">(Leader)</span>}
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                      {member.studentId} · {member.department || "N/A"}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                        {request.aiMatchAnalysis ? (
                          <div className="rounded-lg bg-indigo-50 px-3 py-2 text-right dark:bg-indigo-500/10">
                            <div className="flex items-center justify-end gap-1 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                              <Sparkles className="h-4 w-4" /> {request.aiMatchAnalysis.matchScore}% match
                            </div>
                            <p className="mt-0.5 text-[10px] text-indigo-700/70 dark:text-indigo-300/70">
                              AI Analyzed Team Match
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-right dark:bg-emerald-950/30">
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              {avgMatch.score}% match
                            </p>
                            <p className="mt-0.5 text-[10px] text-emerald-700/70 dark:text-emerald-300/70">
                              Team average
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            disabled={busy}
                            onClick={() => handleReview(request, "rejected")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => handleReview(request, "accepted")}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Accept Group
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

        <div className="mt-5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Clock3 className="h-3.5 w-3.5" />
          Accepted students are added to one shared team for each research topic.
        </div>
      </div>
    </DashboardLayout>
  );
}
