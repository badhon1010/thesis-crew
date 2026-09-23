import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock3, FileText, FolderKanban, Loader2, Sparkles, X } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, query, updateDoc, where, type Unsubscribe } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";
import type { ResearchTopic } from "@/firebase/researchTopics";
import { calculateSkillMatch } from "@/utils/skillMatching";
import { isNewlyPublishedTopic } from "@/utils/topicStatus";
import { generateTopRecommendations, type AIRecommendationResult } from "@/lib/ai";

interface StudentProfile { name?: string; department?: string; cgpa?: string; researchInterests?: string; skills?: string[]; }
interface RecommendedTopic extends ResearchTopic { matchScore: number; }
export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'deadline' | 'task' | 'meeting' | 'milestone';
}

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
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendationResult[] | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState("");

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

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];
    topics.forEach((topic) => {
      if (topic.applicationDeadline) {
        const d = new Date(topic.applicationDeadline);
        if (!isNaN(d.getTime())) {
          events.push({
            id: topic.id,
            title: topic.title,
            date: d,
            type: 'deadline',
          });
        }
      }
    });
    return events;
  }, [topics]);

  const recentTopics = useMemo(() => [...topics]
    .sort((a, b) => (dateFromValue(b.createdAt)?.getTime() ?? 0) - (dateFromValue(a.createdAt)?.getTime() ?? 0))
    .slice(0, 4), [topics]);

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

  const handleGenerateAI = async () => {
    if (recommendedTopics.length === 0) {
      setAiError("No topics available to analyze.");
      return;
    }
    
    setIsGeneratingAI(true);
    setAiError("");
    try {
      // Send top 5 locally matched topics to AI to save tokens and time
      const topTopics = recommendedTopics.slice(0, 5);
      const results = await generateTopRecommendations(profile, topTopics);
      setAiRecommendations(results);
    } catch (err: any) {
      console.error(err);
      setAiError("Failed to generate AI recommendations. Please try again later.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return <DashboardLayout role="student"><div className="mx-auto max-w-6xl px-2 sm:px-4">
    <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-[#3B82F6]"><Clock3 className="h-4 w-4" /><span>{formattedDate}</span><span className="text-slate-300 dark:text-slate-600">•</span><div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600 dark:bg-[#3B82F6]" /><span className="tabular-nums">{formattedTime}</span></div></div>
      <h1 className="text-4xl font-semibold tracking-tighter text-slate-900 dark:text-white">{greeting}, {userName}.</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Live research opportunities and profile insights from your workspace.</p>
    </div></div>
    <div className="mb-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={FolderKanban} value={String(topics.length).padStart(2, "0")} label="Published topics" trend="Live updates" />
      <StatCard icon={Sparkles} value={String(matchedTopicCount).padStart(2, "0")} label="Matching topics" trend="Based on your profile" />
      <StatCard icon={CalendarDays} value={String(upcomingDeadlines.length).padStart(2, "0")} label="Upcoming deadlines" trend="Open for application" />
      <StatCard icon={FileText} value={String(profile.skills?.length ?? 0).padStart(2, "0")} label="Profile skills" trend="Used for matching" />
    </div>
    {loading ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div> : <>
      <div className="mb-6 grid gap-6 items-start xl:grid-cols-[1.5fr_1fr]">
        <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[#2A2A2A] dark:bg-[#181818]">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-[#2A2A2A]">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Recommended for you</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Live published topics ranked against your profile.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleGenerateAI}
                disabled={isGeneratingAI || recommendedTopics.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
              >
                {isGeneratingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Ask AI
              </button>
              <Link to="/student/research-topics" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-[#3B82F6]">View all</Link>
            </div>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto">
            {aiError && (
              <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                {aiError}
              </div>
            )}
            
            {aiRecommendations ? (
              <div className="space-y-4">
                {aiRecommendations.map((aiRec) => {
                  const topic = recommendedTopics.find(t => t.id === aiRec.topicId);
                  if (!topic) return null;
                  return (
                    <div key={aiRec.topicId} className="group overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 dark:border-indigo-500/30 dark:from-indigo-950/40 dark:to-[#121212]">
                      <TopicRow topic={topic} />
                      <div className="border-t border-indigo-100/60 bg-white/60 px-4 py-3 backdrop-blur-sm transition-colors group-hover:bg-indigo-50/50 dark:border-indigo-500/20 dark:bg-black/20 dark:group-hover:bg-indigo-900/30">
                        <div className="flex items-start gap-2">
                          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                          <div>
                            <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">
                              AI Analysis ({aiRec.matchPercentage}% match)
                            </p>
                            <p className="mt-1 text-xs text-indigo-800 dark:text-indigo-200">
                              {aiRec.rationale}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {recommendedTopics.slice(0, 3).map((topic) => <TopicRow key={topic.id} topic={topic} />)}
                {!recommendedTopics.length && <EmptyState message="No published research topics are available yet." />}
              </div>
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white dark:border-[#2A2A2A] dark:bg-[#181818]">
          <div className="p-4 sm:p-6">
            <MiniCalendar events={calendarEvents} />
          </div>
        </section>
      </div>
      <div className="grid gap-6 items-start lg:grid-cols-2"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[#2A2A2A] dark:bg-[#181818]"><SectionHeader title="Latest opportunities" description="Most recently added published topics." /><div className="divide-y divide-slate-100 dark:divide-[#2A2A2A]">{recentTopics.map((topic) => <RecentTopic key={topic.id} topic={topic} />)}{!recentTopics.length && <EmptyState message="New published topics will appear here." />}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white dark:border-[#2A2A2A] dark:bg-[#181818]"><SectionHeader title="Your research profile" description="This information powers topic matching." action={<Link to="/student/profile" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-[#3B82F6]">Edit profile</Link>} /><div className="space-y-5 p-6 text-sm"><ProfileField label="Department" value={profile.department || "Not added"} /><ProfileField label="CGPA" value={profile.cgpa || "Not added"} /><ProfileField label="Research interests" value={profile.researchInterests || "Add interests in your profile"} /><div><p className="text-xs text-slate-500 dark:text-slate-400">Skills</p><div className="mt-2 flex flex-wrap gap-2">{profile.skills?.length ? profile.skills.map((skill) => <span key={skill} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{skill}<button type="button" onClick={() => handleRemoveSkill(skill)} className="rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-500/40"><X className="h-3 w-3" /></button></span>) : <span className="text-sm text-slate-500 dark:text-slate-400">Add skills to receive better matches.</span>}</div><form onSubmit={handleAddSkill} className="mt-4 flex gap-2"><input value={skillInput} onChange={(event) => setSkillInput(event.target.value)} placeholder="Add a skill, e.g. Python" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#121212] dark:text-white" /><button type="submit" disabled={savingSkill || !skillInput.trim()} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{savingSkill ? "Adding..." : "Add skill"}</button></form>{skillError && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{skillError}</p>}</div></div></section></div>
    </>}</div></DashboardLayout>;
}

function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) { return <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-[#2A2A2A]"><div><h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p></div>{action}</div>; }
function TopicRow({ topic }: { topic: RecommendedTopic }) { 
  const now = new Date();
  const topicDate = topic.applicationDeadline ? new Date(topic.applicationDeadline) : new Date(8640000000000000);
  const isClosed = topicDate < now;
  const isClosingSoon = !isClosed && (topicDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000);

  return (
    <Link to={`/student/research-topics/${topic.id}`} className="group flex items-center justify-between rounded-xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md hover:ring-1 hover:ring-slate-200 dark:hover:bg-[#222222] dark:hover:ring-[#333]">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100 dark:bg-[#3B82F6]/10 dark:text-[#3B82F6] dark:group-hover:bg-[#3B82F6]/20">
          <BookOpen className="h-5 w-5 transition-transform group-hover:scale-110" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-semibold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">{topic.title}</p>
            {isNewlyPublishedTopic(topic) && !isClosed && <span className="shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">NEW</span>}
            {topic.applicationDeadline && isClosed && <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30">Closed</span>}
            {topic.applicationDeadline && isClosingSoon && <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">Closing soon</span>}
          </div>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{topic.supervisorName || "Unknown supervisor"} · {topic.requiredSkills?.join(" · ") || topic.category}</p>
          {topic.applicationDeadline && (
            <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">
              Deadline: {formatDeadline(topic.applicationDeadline)}
            </p>
          )}
        </div>
      </div>
      <div className="ml-4 shrink-0 text-right">
        <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{topic.matchScore}%</p>
        <p className="mt-0.5 text-xs text-slate-400">match</p>
      </div>
    </Link>
  ); 
}
function RecentTopic({ topic }: { topic: ResearchTopic }) { return <Link to={`/student/research-topics/${topic.id}`} className="group flex items-center gap-4 px-6 py-5 transition-all duration-300 hover:bg-slate-50 hover:pl-8 dark:hover:bg-[#222222]"><div className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500 transition-transform group-hover:scale-150 dark:bg-[#3B82F6]" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">{topic.title}</p><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{topic.category} · {topic.supervisorName || "Unknown supervisor"}</p></div><span className="text-xs text-slate-400 transition-colors group-hover:text-slate-900 dark:group-hover:text-white">{formatDeadline(topic.applicationDeadline)}</span></Link>; }
function ProfileField({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 font-medium text-slate-900 dark:text-white">{value}</p></div>; }
function EmptyState({ message }: { message: string }) { return <p className="px-2 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{message}</p>; }
function StatCard({ icon: Icon, value, label, trend }: { icon: typeof FolderKanban; value: string; label: string; trend: string }) { return <div className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5 dark:border-[#2A2A2A] dark:bg-[#181818] dark:hover:border-[#3B82F6]/50"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-slate-400 transition-transform group-hover:scale-110 group-hover:text-blue-500 dark:group-hover:text-[#3B82F6]" /><span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{trend}</span></div><p className="mt-4 text-3xl font-semibold tracking-tighter text-slate-900 dark:text-white">{value}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{label}</p></div>; }

function MiniCalendar({ events }: { events: CalendarEvent[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const eventMap = useMemo(() => {
    const dates = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
      const d = event.date;
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!dates.has(key)) dates.set(key, []);
        dates.get(key)!.push(event);
      }
    });
    return dates;
  }, [events]);

  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="min-h-[60px]" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = eventMap.get(dateStr) || [];
    
    const isToday = todayDate.getTime() === cellDate.getTime();
    const isPast = cellDate.getTime() < todayDate.getTime();

    days.push(
      <div 
        key={day} 
        className={`min-h-[60px] p-1 flex flex-col rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-[#222222] overflow-hidden ${isToday ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''}`}
      >
        <span className={`mx-auto text-xs font-medium flex items-center justify-center ${isToday ? 'h-5 w-5 rounded-full bg-blue-600 text-white shadow-sm' : isPast ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
          {day}
        </span>
        <div className="mt-0.5 flex flex-col gap-0.5 overflow-y-auto">
          {dayEvents.map((event, idx) => {
            const isEventPast = event.date.getTime() < todayDate.getTime();
            return (
              <Link
                key={`${event.id}-${idx}`}
                to={`/student/research-topics/${event.id}`}
                title={event.title}
                className={`truncate rounded px-1 py-0.5 text-[9px] font-medium leading-tight transition-colors ${
                  isEventPast 
                    ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30'
                }`}
              >
                {event.title}
              </Link>
            )
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="flex items-center gap-3">
          { (currentDate.getMonth() !== todayDate.getMonth() || currentDate.getFullYear() !== todayDate.getFullYear()) && (
            <button onClick={goToToday} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#181818] dark:text-slate-300 dark:hover:bg-[#222222] transition-colors">
              Today
            </button>
          )}
          <div className="flex rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#181818]">
            <button onClick={prevMonth} className="rounded-l-lg p-1.5 text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-[#222222] transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="w-px bg-slate-200 dark:bg-slate-700" />
            <button onClick={nextMonth} className="rounded-r-lg p-1.5 text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-[#222222] transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div>
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-2 gap-x-1">
          {days}
        </div>
      </div>
    </div>
  );
}
