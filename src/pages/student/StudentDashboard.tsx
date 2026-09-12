import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, CalendarDays, Clock3, FileText, FolderKanban, Loader2, Sparkles, X } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, query, updateDoc, where, type Unsubscribe } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";
import type { ResearchTopic } from "@/firebase/researchTopics";
import { calculateSkillMatch } from "@/utils/skillMatching";
import { isNewlyPublishedTopic } from "@/utils/topicStatus";

interface StudentProfile { name?: string; department?: string; cgpa?: string; researchInterests?: string; skills?: string[]; }
interface RecommendedTopic extends ResearchTopic { matchScore: number; }

function getMatchScore(topic: ResearchTopic, profile: StudentProfile) {
  return calculateSkillMatch(profile.skills, topic.requiredSkills).score;
}

function dateFromValue(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate() as Date;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatDeadline(deadline?: string) {
  if (!deadline) return "No deadline set";
  const date = new Date(deadline);
  return Number.isNaN(date.getTime()) ? deadline : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function StudentDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [profile, setProfile] = useState<StudentProfile>({});
  const [topics, setTopics] = useState<ResearchTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [skillInput, setSkillInput] = useState("");
  const [savingSkill, setSavingSkill] = useState(false);
  const [skillError, setSkillError] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let unsubscribeProfile: Unsubscribe | undefined;
    let unsubscribeTopics: Unsubscribe | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile?.();
      unsubscribeTopics?.();
      if (!user) { setProfile({}); setTopics([]); setLoading(false); return; }
      setLoading(true);
      unsubscribeProfile = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
        setProfile((snapshot.data() as StudentProfile | undefined) ?? {});
      }, (error) => console.error("Failed to subscribe to student profile:", error));
      unsubscribeTopics = onSnapshot(query(collection(db, "researchTopics"), where("status", "==", "published")), (snapshot) => {
        setTopics(snapshot.docs.map((topic) => ({ id: topic.id, ...(topic.data() as Omit<ResearchTopic, "id">) })));
        setLoading(false);
      }, (error) => { console.error("Failed to subscribe to research topics:", error); setLoading(false); });
    });
    return () => { unsubscribeAuth(); unsubscribeProfile?.(); unsubscribeTopics?.(); };
  }, []);

  const recommendedTopics = useMemo<RecommendedTopic[]>(() => topics
    .map((topic) => ({ ...topic, matchScore: getMatchScore(topic, profile) }))
    .sort((a, b) => {
      const now = new Date();
      const aDate = a.applicationDeadline ? new Date(a.applicationDeadline) : new Date(8640000000000000);
      const bDate = b.applicationDeadline ? new Date(b.applicationDeadline) : new Date(8640000000000000);
      
      const aClosed = aDate < now;
      const bClosed = bDate < now;
      
      // 1. Closed topics at the end
      if (aClosed && !bClosed) return 1;
      if (!aClosed && bClosed) return -1;
      
      // 2. Both closed: sort by most recently closed first (descending)
      if (aClosed && bClosed) {
        return bDate.getTime() - aDate.getTime();
      }
      
      // 3. Both open: sort by match score
      if (a.matchScore !== b.matchScore) {
        return b.matchScore - a.matchScore;
      }
      
      // 4. Match score same: sort by closest deadline
      return aDate.getTime() - bDate.getTime();
    }), [profile, topics]);
  const upcomingDeadlines = useMemo(() => [...topics]
    .filter((topic) => topic.applicationDeadline && new Date(topic.applicationDeadline).getTime() >= currentTime.getTime())
    .sort((a, b) => new Date(a.applicationDeadline).getTime() - new Date(b.applicationDeadline).getTime())
    .slice(0, 3), [currentTime, topics]);
  const recentTopics = useMemo(() => [...topics]
    .sort((a, b) => (dateFromValue(b.createdAt)?.getTime() ?? 0) - (dateFromValue(a.createdAt)?.getTime() ?? 0))
    .slice(0, 3), [topics]);

  const userName = profile.name?.split(" ")[0] || auth.currentUser?.displayName?.split(" ")[0] || auth.currentUser?.email?.split("@")[0] || "Student";
  const greeting = currentTime.getHours() < 12 ? "Good morning" : currentTime.getHours() < 18 ? "Good afternoon" : "Good evening";
  const formattedDate = currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const formattedTime = currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const matchedTopicCount = recommendedTopics.filter((topic) => topic.matchScore > 0).length;

  const handleRemoveSkill = async (skillToRemove: string) => {
    const user = auth.currentUser;
    if (!user || !profile.skills) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        skills: profile.skills.filter((s) => s !== skillToRemove)
      });
    } catch (error) {
      console.error("Failed to remove skill:", error);
    }
  };

  const handleAddSkill = async (event: React.FormEvent) => {
    event.preventDefault();
    const user = auth.currentUser;
    const skill = skillInput.trim();
    if (!user || !skill) return;
    if (profile.skills?.some((existingSkill) => existingSkill.toLocaleLowerCase() === skill.toLocaleLowerCase())) {
      setSkillError("This skill is already in your profile.");
      return;
    }

    setSavingSkill(true);
    setSkillError("");
    try {
      await updateDoc(doc(db, "users", user.uid), { skills: [...(profile.skills ?? []), skill] });
      setSkillInput("");
    } catch (error) {
      console.error("Failed to add skill:", error);
      setSkillError("Could not add the skill. Please try again.");
    } finally {
      setSavingSkill(false);
    }
  };

  return <DashboardLayout role="student"><div className="mx-auto max-w-5xl px-2 sm:px-0">
    <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-[#3B82F6]"><Clock3 className="h-4 w-4" /><span>{formattedDate}</span><span className="text-slate-300 dark:text-slate-600">•</span><div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600 dark:bg-[#3B82F6]" /><span className="tabular-nums">{formattedTime}</span></div></div>
      <h1 className="text-4xl font-semibold tracking-tighter text-slate-900 dark:text-white">{greeting}, {userName}.</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Live research opportunities and profile insights from your workspace.</p>
    </div><Link to="/student/research-topics" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-[#3B82F6] dark:hover:bg-blue-500">Explore topics <ArrowUpRight className="h-4 w-4" /></Link></div>
    <div className="mb-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={FolderKanban} value={String(topics.length).padStart(2, "0")} label="Published topics" trend="Live updates" />
      <StatCard icon={Sparkles} value={String(matchedTopicCount).padStart(2, "0")} label="Matching topics" trend="Based on your profile" />
      <StatCard icon={CalendarDays} value={String(upcomingDeadlines.length).padStart(2, "0")} label="Upcoming deadlines" trend="Open for application" />
      <StatCard icon={FileText} value={String(profile.skills?.length ?? 0).padStart(2, "0")} label="Profile skills" trend="Used for matching" />
    </div>
    {loading ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div> : <>
      <div className="mb-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[#2A2A2A] dark:bg-[#181818]"><SectionHeader title="Recommended for you" description="Live published topics ranked against your profile." action={<Link to="/student/research-topics" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-[#3B82F6]">View all</Link>} /><div className="p-4">{recommendedTopics.slice(0, 3).map((topic) => <TopicRow key={topic.id} topic={topic} />)}{!recommendedTopics.length && <EmptyState message="No published research topics are available yet." />}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white dark:border-[#2A2A2A] dark:bg-[#181818]"><SectionHeader title="Upcoming deadlines" description="Published topics closing soon." /><div className="space-y-5 p-6">{upcomingDeadlines.map((topic) => <DeadlineRow key={topic.id} topic={topic} />)}{!upcomingDeadlines.length && <EmptyState message="There are no upcoming application deadlines." />}</div></section></div>
      <div className="grid gap-6 lg:grid-cols-2"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[#2A2A2A] dark:bg-[#181818]"><SectionHeader title="Latest opportunities" description="Most recently added published topics." /><div className="divide-y divide-slate-100 dark:divide-[#2A2A2A]">{recentTopics.map((topic) => <RecentTopic key={topic.id} topic={topic} />)}{!recentTopics.length && <EmptyState message="New published topics will appear here." />}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white dark:border-[#2A2A2A] dark:bg-[#181818]"><SectionHeader title="Your research profile" description="This information powers topic matching." action={<Link to="/student/profile" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-[#3B82F6]">Edit profile</Link>} /><div className="space-y-5 p-6 text-sm"><ProfileField label="Department" value={profile.department || "Not added"} /><ProfileField label="CGPA" value={profile.cgpa || "Not added"} /><ProfileField label="Research interests" value={profile.researchInterests || "Add interests in your profile"} /><div><p className="text-xs text-slate-500 dark:text-slate-400">Skills</p><div className="mt-2 flex flex-wrap gap-2">{profile.skills?.length ? profile.skills.map((skill) => <span key={skill} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{skill}<button type="button" onClick={() => handleRemoveSkill(skill)} className="rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-500/40"><X className="h-3 w-3" /></button></span>) : <span className="text-sm text-slate-500 dark:text-slate-400">Add skills to receive better matches.</span>}</div><form onSubmit={handleAddSkill} className="mt-4 flex gap-2"><input value={skillInput} onChange={(event) => setSkillInput(event.target.value)} placeholder="Add a skill, e.g. Python" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#121212] dark:text-white" /><button type="submit" disabled={savingSkill || !skillInput.trim()} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{savingSkill ? "Adding..." : "Add skill"}</button></form>{skillError && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{skillError}</p>}</div></div></section></div>
    </>}</div></DashboardLayout>;
}

function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) { return <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-[#2A2A2A]"><div><h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p></div>{action}</div>; }
function TopicRow({ topic }: { topic: RecommendedTopic }) { return <Link to={`/student/research-topics/${topic.id}`} className="flex items-center justify-between rounded-xl p-4 transition-colors hover:bg-slate-50 dark:hover:bg-[#222222]"><div className="flex min-w-0 items-center gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-[#3B82F6]/10 dark:text-[#3B82F6]"><BookOpen className="h-4 w-4" /></div><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-medium text-slate-900 dark:text-white">{topic.title}</p>{isNewlyPublishedTopic(topic) && <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">NEW</span>}</div><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{topic.supervisorName || "Unknown supervisor"} · {topic.requiredSkills?.join(" · ") || topic.category}</p></div></div><div className="ml-4 shrink-0 text-right"><p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{topic.matchScore}%</p><p className="mt-0.5 text-[10px] text-slate-400">match</p></div></Link>; }
function DeadlineRow({ topic }: { topic: ResearchTopic }) { return <div><div className="flex items-center justify-between gap-4"><p className="truncate text-sm font-medium text-slate-900 dark:text-white">{topic.title}</p><CalendarDays className="h-4 w-4 shrink-0 text-blue-600 dark:text-[#3B82F6]" /></div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Apply by {formatDeadline(topic.applicationDeadline)}</p></div>; }
function RecentTopic({ topic }: { topic: ResearchTopic }) { return <Link to={`/student/research-topics/${topic.id}`} className="flex items-center gap-4 px-6 py-5 transition-colors hover:bg-slate-50 dark:hover:bg-[#222222]"><div className="h-2.5 w-2.5 rounded-full bg-blue-500 dark:bg-[#3B82F6]" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900 dark:text-white">{topic.title}</p><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{topic.category} · {topic.supervisorName || "Unknown supervisor"}</p></div><span className="text-xs text-slate-400">{formatDeadline(topic.applicationDeadline)}</span></Link>; }
function ProfileField({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 font-medium text-slate-900 dark:text-white">{value}</p></div>; }
function EmptyState({ message }: { message: string }) { return <p className="px-2 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{message}</p>; }
function StatCard({ icon: Icon, value, label, trend }: { icon: typeof FolderKanban; value: string; label: string; trend: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-[#2A2A2A] dark:bg-[#181818]"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-slate-400" /><span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{trend}</span></div><p className="mt-4 text-3xl font-semibold tracking-tighter text-slate-900 dark:text-white">{value}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{label}</p></div>; }
