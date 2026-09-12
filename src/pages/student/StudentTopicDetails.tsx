import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, GraduationCap, Loader2, Mail, Send, Users } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, query, collection, where, type Unsubscribe } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";
import type { ResearchTopic } from "@/firebase/researchTopics";
import { calculateSkillMatch } from "@/utils/skillMatching";
import { cancelJoinRequest, submitJoinRequest, type JoinRequestStatus } from "@/firebase/teamFormation";
import { TeamSubmissionModal } from "@/components/student/TeamSubmissionModal";

interface StudentProfile {
  name?: string;
  email?: string;
  department?: string;
  cgpa?: string;
  skills?: string[];
  studentId?: string;
}

interface SupervisorProfile {
  name?: string;
  email?: string;
  department?: string;
  designation?: string;
  researchAreas?: string;
}

function formatDeadline(deadline?: string) {
  if (!deadline) return "Not set";
  const date = new Date(deadline);
  return Number.isNaN(date.getTime()) ? deadline : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function StudentTopicDetails() {
  const { id } = useParams<{ id: string }>();
  const [topic, setTopic] = useState<ResearchTopic | null>(null);
  const [supervisor, setSupervisor] = useState<SupervisorProfile>({});
  const [studentProfile, setStudentProfile] = useState<StudentProfile>({});
  const [requestStatus, setRequestStatus] = useState<JoinRequestStatus | null>(null);
  const [teamMemberCount, setTeamMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isLeader, setIsLeader] = useState(true);

  useEffect(() => {
    if (!id) return;
    let unsubscribeSupervisor: Unsubscribe | undefined;
    let unsubscribeProfile: Unsubscribe | undefined;
    let unsubscribeRequest: Unsubscribe | undefined;
    let unsubscribeTeam: Unsubscribe | undefined;

    const unsubscribeTopic = onSnapshot(doc(db, "researchTopics", id), (snapshot) => {
      if (!snapshot.exists()) {
        setTopic(null);
        setLoading(false);
        return;
      }
      const topicData = { id: snapshot.id, ...(snapshot.data() as Omit<ResearchTopic, "id">) };
      setTopic(topicData);
      setLoading(false);
      unsubscribeSupervisor?.();
      unsubscribeTeam?.();
      unsubscribeSupervisor = onSnapshot(doc(db, "users", topicData.supervisorId), (supervisorSnapshot) => {
        setSupervisor((supervisorSnapshot.data() as SupervisorProfile | undefined) ?? {});
      }, (error) => console.error("Failed to load supervisor details:", error));
      unsubscribeTeam = onSnapshot(doc(db, "teams", topicData.id), (teamSnapshot) => {
        setTeamMemberCount(((teamSnapshot.data()?.memberIds as string[] | undefined) ?? []).length);
      }, (error) => console.error("Failed to load team capacity:", error));
    }, (error) => { console.error("Failed to load research topic:", error); setLoading(false); });

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile?.();
      unsubscribeRequest?.();
      if (!user) { setStudentProfile({}); setRequestStatus(null); return; }
      unsubscribeProfile = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
        const profileData = (snapshot.data() as StudentProfile | undefined) ?? {};
        setStudentProfile(profileData);
        
        unsubscribeRequest?.();
        unsubscribeRequest = onSnapshot(
          query(collection(db, "joinRequests"), where("projectId", "==", id)),
          (reqSnapshot) => {
            const myReqDoc = reqSnapshot.docs.find(d => {
              const data = d.data();
              return data.studentId === user.uid || 
                     (data.requestType === "group" && data.teamMembers?.some((m: any) => m.studentId === profileData.studentId));
            });
            
            if (myReqDoc) {
              const data = myReqDoc.data();
              setRequestStatus(data.status as JoinRequestStatus);
              setIsLeader(data.studentId === user.uid);
            } else {
              setRequestStatus(null);
              setIsLeader(true);
            }
          },
          (error) => console.error("Failed to load join request status:", error)
        );
      }, (error) => console.error("Failed to load student profile:", error));
    });

    return () => { unsubscribeTopic(); unsubscribeSupervisor?.(); unsubscribeTeam?.(); unsubscribeAuth(); unsubscribeProfile?.(); unsubscribeRequest?.(); };
  }, [id]);

  const handleJoinRequest = async () => {
    const user = auth.currentUser;
    if (!topic || !user) {
      setToast({ type: "error", message: "Please sign in before sending a join request." });
      return;
    }
    
    setSubmitting(true);
    try {
      const leaderProfile = { ...studentProfile, email: studentProfile.email || user.email || "" };
      await submitJoinRequest(topic, user.uid, leaderProfile, requestMessage);
      setToast({ type: "success", message: "Join request sent to the supervisor." });
    } catch (error) {
      console.error("Failed to send join request:", error);
      setToast({ type: "error", message: error instanceof Error ? error.message : "Could not send your join request." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    const user = auth.currentUser;
    if (!topic || !user) return;
    setCancelling(true);
    try {
      await cancelJoinRequest(topic.id, user.uid);
      setToast({ type: "success", message: "Your join request has been cancelled." });
    } catch (error) {
      console.error("Failed to cancel join request:", error);
      setToast({ type: "error", message: error instanceof Error ? error.message : "Could not cancel your join request." });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <DashboardLayout role="student"><div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div></DashboardLayout>;
  if (!topic || topic.status !== "published") return <DashboardLayout role="student"><div className="mx-auto max-w-3xl px-2 py-20 text-center"><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Topic unavailable</h1><p className="mt-2 text-sm text-slate-500">This research topic is no longer published or does not exist.</p><Link to="/student/research-topics" className="mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Back to research topics</Link></div></DashboardLayout>;

  const match = calculateSkillMatch(studentProfile.skills, topic.requiredSkills);
  const teamFull = teamMemberCount >= topic.maxTeamSize;
  
  // Check deadline
  const isDeadlinePassed = topic.applicationDeadline ? new Date(topic.applicationDeadline) < new Date() : false;
  
  let buttonLabel = "Join team";
  if (requestStatus === "pending") buttonLabel = "Request pending";
  else if (requestStatus === "accepted") buttonLabel = "You joined this team";
  else if (requestStatus === "rejected") buttonLabel = "Request declined";
  else if (teamFull) buttonLabel = "Team is full";
  else if (isDeadlinePassed) buttonLabel = "Deadline passed";

  return <DashboardLayout role="student"><div className="mx-auto max-w-5xl px-2 sm:px-0">
    {toast && <ToastAlert type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    <Link to="/student/research-topics" className="mb-7 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"><ArrowLeft className="h-4 w-4" />All research topics</Link>
    <div className="grid gap-6 lg:grid-cols-[1.55fr_.8fr]"><main className="space-y-6"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818] sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{topic.category}</span><h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{topic.title}</h1></div><div className="rounded-xl bg-emerald-50 px-3 py-2 text-right dark:bg-emerald-950/30"><p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{match.score}%</p><p className="text-[10px] font-medium text-emerald-700/70 dark:text-emerald-300/70">skill match</p></div></div><p className="mt-6 whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-300">{topic.description}</p><div className="mt-7 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 dark:border-[#2A2A2A]"><Detail icon={CalendarDays} label="Application deadline" value={formatDeadline(topic.applicationDeadline)} /><Detail icon={Users} label="Maximum team size" value={`${topic.maxTeamSize} student${topic.maxTeamSize === 1 ? "" : "s"}`} /><Detail icon={Users} label="Current team" value={teamFull ? `${teamMemberCount}/${topic.maxTeamSize} members · Full` : `${teamMemberCount}/${topic.maxTeamSize} members · ${topic.maxTeamSize - teamMemberCount} spot${topic.maxTeamSize - teamMemberCount === 1 ? "" : "s"} left`} /></div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Required skills</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your matching skills are highlighted.</p><div className="mt-5 flex flex-wrap gap-2">{topic.requiredSkills?.length ? topic.requiredSkills.map((skill) => <span key={skill} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${match.matchedSkills.includes(skill) ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{match.matchedSkills.includes(skill) && "✓ "}{skill}</span>) : <span className="text-sm text-slate-500">No skills specified.</span>}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Research objectives</h2><p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-300">{topic.researchObjectives || "The supervisor has not added detailed objectives yet."}</p></section></main>
      <aside className="space-y-6"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"><GraduationCap className="h-6 w-6" /></div><h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Supervisor</h2><p className="mt-3 font-semibold text-slate-900 dark:text-white">{supervisor.name || topic.supervisorName || "Supervisor details unavailable"}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{supervisor.designation || "Faculty supervisor"}</p><div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm dark:border-[#2A2A2A]"><p className="text-slate-600 dark:text-slate-300"><span className="font-medium text-slate-900 dark:text-white">Department: </span>{supervisor.department || "Not specified"}</p><p className="text-slate-600 dark:text-slate-300"><span className="font-medium text-slate-900 dark:text-white">Research areas: </span>{supervisor.researchAreas || "Not specified"}</p>{supervisor.email && <a href={`mailto:${supervisor.email}`} className="inline-flex items-center gap-2 font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"><Mail className="h-4 w-4" />{supervisor.email}</a>}</div></section>
      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-6 dark:border-indigo-500/20 dark:bg-indigo-500/5">
        <h2 className="font-bold text-slate-900 dark:text-white">Interested in this topic?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {teamFull ? "This team has reached its maximum size." : isDeadlinePassed ? "The application deadline for this topic has passed." : "Send your profile and skills to the supervisor for review."}
        </p>
        
        {!requestStatus && !teamFull && !isDeadlinePassed && (
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="join-message" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Message to supervisor <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <textarea
                id="join-message"
                value={requestMessage}
                onChange={(event) => setRequestMessage(event.target.value)}
                maxLength={400}
                rows={4}
                placeholder="Briefly explain why you are interested in this research topic..."
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-[#121212] dark:text-white"
              />
              <p className="mt-1 text-right text-[11px] text-slate-500">{requestMessage.length}/400</p>
            </div>
          </div>
        )}

        {requestStatus === "pending" ? (
          <button
            type="button"
            disabled={cancelling || !isLeader}
            onClick={handleCancelRequest}
            title={!isLeader ? "Only the team leader can cancel this request" : undefined}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/30 dark:bg-transparent dark:hover:bg-rose-500/10"
          >
            {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {cancelling ? "Cancelling..." : isLeader ? "Cancel request" : "Pending Leader's Request"}
          </button>
        ) : (
          <div className="mt-5 space-y-3">
            <button
              type="button"
              disabled={Boolean(requestStatus) || submitting || teamFull || isDeadlinePassed}
              onClick={handleJoinRequest}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : requestStatus === "accepted" ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {teamFull ? "Team is full" : isDeadlinePassed ? "Deadline passed" : submitting ? "Sending request..." : "Apply Individually"}
            </button>
            
            {!requestStatus && !teamFull && !isDeadlinePassed && topic.maxTeamSize > 1 && (
              <>
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                  <span className="mx-4 flex-shrink-0 text-xs font-semibold text-slate-400">OR</span>
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-[#121212] dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                >
                  <Users className="h-4 w-4" />
                  Form a Team
                </button>
              </>
            )}
          </div>
        )}
      </section>
    </aside>

    {isTeamModalOpen && topic && auth.currentUser && (
      <TeamSubmissionModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        topic={topic}
        leaderId={auth.currentUser.uid}
        leaderProfile={{ ...studentProfile, email: studentProfile.email || auth.currentUser.email || "" }}
        onSuccess={() => setToast({ type: "success", message: "Team request sent successfully!" })}
      />
    )}
  </div>
  </div></DashboardLayout>;
}

function Detail({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) { return <div className="flex items-center gap-3"><Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /><div><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{value}</p></div></div>; }
