import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Mail,
  Users,
  Send,
  Sparkles,
  Loader2,
  XCircle,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { calculateSkillMatch } from "@/utils/skillMatching";
import { analyzeSkillMatch, getQuickMatchScore, type AIMatchAnalysis } from "@/lib/ai";
import { doc, onSnapshot, query, collection, where, type Unsubscribe } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";
import type { ResearchTopic } from "@/firebase/researchTopics";
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
  const [aiMatchAnalysis, setAiMatchAnalysis] = useState<AIMatchAnalysis | null>(null);
  const [isAnalyzingMatch, setIsAnalyzingMatch] = useState(false);
  const [aiError, setAiError] = useState("");
  const [apiMatchScore, setApiMatchScore] = useState<number | null>(null);

  useEffect(() => {
    if (topic && studentProfile && Object.keys(studentProfile).length > 0) {
      getQuickMatchScore(studentProfile, topic).then(res => {
        setApiMatchScore(res.matchScore);
      });
    }
  }, [topic, studentProfile]);

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
      await submitJoinRequest(topic, user.uid, leaderProfile, requestMessage, aiMatchAnalysis || undefined);
      setToast({ type: "success", message: "Join request sent to the supervisor." });
    } catch (error) {
      console.error("Failed to send join request:", error);
      setToast({ type: "error", message: error instanceof Error ? error.message : "Could not send your join request." });
    } finally {
      setSubmitting(false);
    }
  };
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleCancelRequest = async () => {
    const user = auth.currentUser;
    if (!topic || !user) return;
    setCancelling(true);
    try {
      await cancelJoinRequest(topic.id, user.uid);
      setToast({ type: "success", message: "Your join request has been cancelled." });
      setShowCancelModal(false);
    } catch (error) {
      console.error("Failed to cancel join request:", error);
      setToast({ type: "error", message: error instanceof Error ? error.message : "Could not cancel your join request." });
    } finally {
      setCancelling(false);
    }
  };

  const handleAnalyzeMatch = async () => {
    if (!topic || !studentProfile) return;
    setIsAnalyzingMatch(true);
    setAiError("");
    try {
      const analysis = await analyzeSkillMatch(studentProfile, topic);
      setAiMatchAnalysis(analysis);
    } catch (err: any) {
      setAiError(err.message || "Failed to analyze match.");
    } finally {
      setIsAnalyzingMatch(false);
    }
  };

  if (loading) return <DashboardLayout role="student"><div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div></DashboardLayout>;
  if (!topic || topic.status !== "published") return <DashboardLayout role="student"><div className="mx-auto max-w-3xl px-2 py-20 text-center"><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Topic unavailable</h1><p className="mt-2 text-sm text-slate-500">This research topic is no longer published or does not exist.</p><Link to="/student/research-topics" className="mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Back to research topics</Link></div></DashboardLayout>;

  const match = calculateSkillMatch(studentProfile.skills, topic.requiredSkills);
  const teamFull = teamMemberCount >= topic.maxTeamSize;
  
  // Check deadline
  const now = new Date();
  const isDeadlinePassed = topic.applicationDeadline ? new Date(topic.applicationDeadline) < now : false;
  const isClosingSoon = !isDeadlinePassed && (topic.applicationDeadline ? new Date(topic.applicationDeadline).getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000 : false);
  
  const displayScore = apiMatchScore !== null ? apiMatchScore : "...";

  if (requestStatus === "pending") {}

  return <DashboardLayout role="student"><div className="mx-auto max-w-6xl px-2 sm:px-4">
    {toast && <ToastAlert type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    <Link to="/student/research-topics" className="mb-7 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"><ArrowLeft className="h-4 w-4" />All research topics</Link>
    <div className="grid gap-6 lg:grid-cols-[1.55fr_.8fr]"><main className="space-y-6"><section className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-indigo-200 dark:border-[#2A2A2A] dark:bg-[#181818] sm:p-8 dark:hover:border-indigo-500/50"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 transition-colors group-hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300">{topic.category}</span>{isDeadlinePassed && <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold tracking-wide text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30">Closed</span>}{isClosingSoon && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold tracking-wide text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">Closing soon</span>}</div><h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{topic.title}</h1></div><div className="rounded-xl bg-emerald-50 px-3 py-2 text-right transition-transform group-hover:scale-105 dark:bg-emerald-950/30"><p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{displayScore}{displayScore !== "..." ? "%" : ""}</p><p className="text-[10px] font-medium text-emerald-700/70 dark:text-emerald-300/70">algorithm match</p></div></div><p className="mt-6 whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-300">{topic.description}</p><div className="mt-7 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 dark:border-[#2A2A2A]"><Detail icon={CalendarDays} label="Application deadline" value={formatDeadline(topic.applicationDeadline)} /><Detail icon={Users} label="Maximum team size" value={`${topic.maxTeamSize} student${topic.maxTeamSize === 1 ? "" : "s"}`} /><Detail icon={Users} label="Current team" value={teamFull ? `${teamMemberCount}/${topic.maxTeamSize} members · Full` : `${teamMemberCount}/${topic.maxTeamSize} members · ${topic.maxTeamSize - teamMemberCount} spot${topic.maxTeamSize - teamMemberCount === 1 ? "" : "s"} left`} /></div></section>
      <section className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-100 dark:border-[#2A2A2A] dark:bg-[#181818] dark:hover:border-indigo-500/30"><h2 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">Required skills</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your matching skills are highlighted.</p><div className="mt-5 flex flex-wrap gap-2">{topic.requiredSkills?.length ? topic.requiredSkills.map((skill) => <span key={skill} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${match.matchedSkills.includes(skill) ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{match.matchedSkills.includes(skill) && "✓ "}{skill}</span>) : <span className="text-sm text-slate-500">No skills specified.</span>}</div></section>
      <section className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-100 dark:border-[#2A2A2A] dark:bg-[#181818] dark:hover:border-indigo-500/30"><h2 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">Research objectives</h2><p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-300">{topic.researchObjectives || "The supervisor has not added detailed objectives yet."}</p></section>
      <section className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-200 dark:border-[#2A2A2A] dark:bg-[#181818] dark:hover:border-indigo-500/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI Match Analysis</h2>
          <button
            onClick={handleAnalyzeMatch}
            disabled={isAnalyzingMatch}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
          >
            {isAnalyzingMatch ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="h-4 w-4" /> Analyze Match with AI</>}
          </button>
        </div>
        
        {aiError && <p className="mt-4 text-sm font-medium text-rose-500">{aiError}</p>}

        {aiMatchAnalysis ? (
          <div className="mt-6 space-y-4">
            <div className={`rounded-xl border p-4 ${aiMatchAnalysis.matchScore >= 80 ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10" : aiMatchAnalysis.matchScore >= 50 ? "border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10" : "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full font-bold text-lg ${aiMatchAnalysis.matchScore >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : aiMatchAnalysis.matchScore >= 50 ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"}`}>
                  {aiMatchAnalysis.matchScore}%
                </div>
                <div>
                  <p className={`font-semibold ${aiMatchAnalysis.matchScore >= 80 ? "text-emerald-800 dark:text-emerald-300" : aiMatchAnalysis.matchScore >= 50 ? "text-blue-800 dark:text-blue-300" : "text-amber-800 dark:text-amber-300"}`}>
                    {aiMatchAnalysis.matchScore >= 80 ? "Excellent Match!" : aiMatchAnalysis.matchScore >= 50 ? "Good Match" : "Needs Improvement"}
                  </p>
                  <p className={`text-sm ${aiMatchAnalysis.matchScore >= 80 ? "text-emerald-600 dark:text-emerald-400/80" : aiMatchAnalysis.matchScore >= 50 ? "text-blue-600 dark:text-blue-400/80" : "text-amber-600 dark:text-amber-400/80"}`}>
                    Based on your skills and research interests.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-100 bg-white p-4 dark:border-[#2A2A2A] dark:bg-[#222222]">
                <h3 className="font-bold text-emerald-600 dark:text-emerald-400 mb-2">Strengths</h3>
                <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300 list-disc pl-4">
                  {aiMatchAnalysis.strengths.map((str, i) => <li key={i}>{str}</li>)}
                </ul>
              </div>
              <div className="rounded-xl border border-rose-100 bg-white p-4 dark:border-[#2A2A2A] dark:bg-[#222222]">
                <h3 className="font-bold text-rose-600 dark:text-rose-400 mb-2">Gaps to Improve</h3>
                <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300 list-disc pl-4">
                  {aiMatchAnalysis.gaps.map((gap, i) => <li key={i}>{gap}</li>)}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-center dark:border-[#333333] dark:bg-[#121212]/50">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-indigo-400 opacity-50" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Click the button above to generate a deep analysis of how well your profile and research interests align with this topic.
            </p>
          </div>
        )}
      </section>
      </main>
      <aside className="space-y-6"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"><GraduationCap className="h-6 w-6" /></div><h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Supervisor</h2><p className="mt-3 font-semibold text-slate-900 dark:text-white">{supervisor.name || topic.supervisorName || "Supervisor details unavailable"}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{supervisor.designation || "Faculty supervisor"}</p><div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm dark:border-[#2A2A2A]"><p className="text-slate-600 dark:text-slate-300"><span className="font-medium text-slate-900 dark:text-white">Department: </span>{supervisor.department || "Not specified"}</p><p className="text-slate-600 dark:text-slate-300"><span className="font-medium text-slate-900 dark:text-white">Research areas: </span>{supervisor.researchAreas || "Not specified"}</p>{supervisor.email && <a href={`mailto:${supervisor.email}`} className="inline-flex items-center gap-2 font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"><Mail className="h-4 w-4" />{supervisor.email}</a>}</div></section>
      <section className={`rounded-2xl border p-6 ${
          requestStatus === "accepted" 
            ? "border-emerald-100 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/5"
            : requestStatus === "rejected"
            ? "border-rose-100 bg-rose-50/60 dark:border-rose-500/20 dark:bg-rose-500/5"
            : "border-indigo-100 bg-indigo-50/60 dark:border-indigo-500/20 dark:bg-indigo-500/5"
        }`}>
        <h2 className="font-bold text-slate-900 dark:text-white">
          {requestStatus === "pending" ? "Request Submitted" :
           requestStatus === "accepted" ? "Request Accepted" :
           requestStatus === "rejected" ? "Request Rejected" :
           "Interested in this topic?"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {requestStatus === "pending" ? "Your application is currently pending review by the supervisor." :
           requestStatus === "accepted" ? "Congratulations! The supervisor has accepted your application." :
           requestStatus === "rejected" ? "Unfortunately, your application for this topic was rejected." :
           teamFull ? "This team has reached its maximum size." : 
           isDeadlinePassed ? "The application deadline for this topic has passed." : 
           "Send your profile and skills to the supervisor for review."}
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
          <div className="mt-5 space-y-3">
            <button
              type="button"
              disabled={cancelling || !isLeader}
              onClick={() => setShowCancelModal(true)}
              title={!isLeader ? "Only the team leader can cancel this request" : undefined}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/30 dark:bg-transparent dark:hover:bg-rose-500/10"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {cancelling ? "Cancelling..." : isLeader ? "Cancel request" : "Pending Leader's Request"}
            </button>
            <Link
              to="/student/requests"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-[#121212] dark:text-indigo-400 dark:hover:bg-indigo-500/10"
            >
              See Application Status
            </Link>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <button
              type="button"
              disabled={Boolean(requestStatus) || submitting || teamFull || isDeadlinePassed}
              onClick={handleJoinRequest}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : requestStatus === "accepted" ? <CheckCircle2 className="h-4 w-4" /> : requestStatus === "rejected" ? <XCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {requestStatus === "accepted" ? "Application Accepted" : requestStatus === "rejected" ? "Application Rejected" : teamFull ? "Team is full" : isDeadlinePassed ? "Deadline passed" : submitting ? "Sending request..." : "Apply Individually"}
            </button>
            
            {requestStatus ? (
              <Link
                to="/student/requests"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-[#121212] dark:text-indigo-400 dark:hover:bg-indigo-500/10"
              >
                See Application Status
              </Link>
            ) : !teamFull && !isDeadlinePassed && topic.maxTeamSize > 1 && (
              <>
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                  <span className="mx-4 flex-shrink-0 text-xs font-semibold text-slate-400">OR</span>
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-500/30 dark:bg-[#121212] dark:text-indigo-400 dark:hover:bg-indigo-500/10"
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
        aiMatchAnalysis={aiMatchAnalysis || undefined}
        onSuccess={() => setToast({ type: "success", message: "Team request sent successfully!" })}
      />
    )}

    <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Cancel Application</DialogTitle>
          <DialogDescription className="pt-2 text-slate-600 dark:text-slate-400">
            Are you sure you want to cancel this application? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <button 
            onClick={() => setShowCancelModal(false)} 
            className="rounded-xl px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            No, keep it
          </button>
          <button 
            onClick={handleCancelRequest} 
            disabled={cancelling} 
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Yes, cancel it
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
  </div></DashboardLayout>;
}

function Detail({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) { return <div className="flex items-center gap-3"><Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /><div><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{value}</p></div></div>; }


