import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Filter, Search, SlidersHorizontal } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";
import { type ResearchTopic } from "@/firebase/researchTopics";
import { isNewlyPublishedTopic } from "@/utils/topicStatus";
import { getQuickScoresAll } from "@/lib/ai";

interface StudentProfile {
  name?: string;
  email?: string;
  department?: string;
  cgpa?: string;
  skills?: string[];
}

export default function StudentResearchTopics() {
  const [topics, setTopics] = useState<ResearchTopic[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile>({});
  const [apiScores, setApiScores] = useState<Record<string, number>>({});
  const [teamMemberCounts, setTeamMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (topics.length > 0 && Object.keys(studentProfile).length > 0) {
      getQuickScoresAll(studentProfile, topics).then(scores => setApiScores(scores));
    }
  }, [topics, studentProfile]);

  function getMatchScore(topic: ResearchTopic): number | string {
    if (apiScores[topic.id] !== undefined) return apiScores[topic.id];
    return "...";
  }

  useEffect(() => {
    let unsubscribeProfile: Unsubscribe | undefined;
    let unsubscribeTeams: Unsubscribe | undefined;
    const unsubscribeTopics = onSnapshot(
      query(collection(db, "researchTopics"), where("status", "==", "published")),
      (snapshot) => {
        setTopics(snapshot.docs.map((topic) => ({
          id: topic.id,
          ...(topic.data() as Omit<ResearchTopic, "id">),
        })));
        setLoading(false);
      },
      (error) => {
        console.error("Failed to subscribe to research topics:", error);
        setLoading(false);
      },
    );
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile?.();
      unsubscribeTeams?.();
      if (!user) {
        setStudentProfile({});
        return;
      }
      unsubscribeProfile = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
        const profile = snapshot.data() as StudentProfile | undefined;
        setStudentProfile(profile || {});
      }, (error) => console.error("Failed to subscribe to student profile:", error));
      unsubscribeTeams = onSnapshot(collection(db, "teams"), (snapshot) => {
        setTeamMemberCounts(Object.fromEntries(snapshot.docs.map((team) => [
          team.id,
          ((team.data().memberIds as string[] | undefined) ?? []).length,
        ])));
      }, (error) => console.error("Failed to subscribe to team capacity:", error));
    });

    return () => {
      unsubscribeTopics();
      unsubscribeAuth();
      unsubscribeProfile?.();
      unsubscribeTeams?.();
    };
  }, []);

  const filteredTopics = topics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    const now = new Date();
    
    // Parse deadlines (treat no deadline as far future)
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
    
    // 3. Both open: Sort by skill match score first
    const aMatchVal = getMatchScore(a);
    const bMatchVal = getMatchScore(b);
    const aMatch = typeof aMatchVal === 'number' ? aMatchVal : 0;
    const bMatch = typeof bMatchVal === 'number' ? bMatchVal : 0;
    
    if (aMatch !== bMatch) {
      return bMatch - aMatch;
    }
    
    // 4. If scores are the same (including 0), sort by deadline (closest first)
    return aDate.getTime() - bDate.getTime();
  });

  return (
    <DashboardLayout role="student">
      <div className="mx-auto max-w-6xl px-2 sm:px-4">
        
        {/* Header Section */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Research discovery
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tighter text-slate-900 dark:text-white">
            Research Topics
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Explore research projects and find opportunities that align with your skills and interests.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search research topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:focus:border-indigo-500"
            />
          </div>

          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium transition hover:bg-slate-50 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:hover:bg-[#1a2133]">
            <Filter className="h-4 w-4 text-slate-400" />
            Category
          </button>

          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium transition hover:bg-slate-50 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:hover:bg-[#1a2133]">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            Best match
          </button>
        </div>

        {/* Research Topics List */}
        <div className="grid gap-5 lg:grid-cols-2">
          {loading ? (
            <div className="col-span-2 p-12 text-center text-sm text-slate-500">Loading research topics...</div>
          ) : filteredTopics.length === 0 ? (
            <div className="col-span-2 p-12 text-center text-sm text-slate-500">No published topics found matching your search.</div>
          ) : (
            filteredTopics.map((topic) => {
              const memberCount = teamMemberCounts[topic.id] ?? 0;
              const isFull = memberCount >= topic.maxTeamSize;
              
              const now = new Date();
              const topicDate = topic.applicationDeadline ? new Date(topic.applicationDeadline) : new Date(8640000000000000);
              const isClosed = topicDate < now;
              const isClosingSoon = !isClosed && (topicDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000);
              
              return (
              <article
                key={topic.id}
                className={`group rounded-2xl border ${isClosed ? "border-rose-100 bg-rose-50/30 opacity-75 dark:border-rose-500/10 dark:bg-rose-500/5" : "border-slate-200 bg-white hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-900/5 dark:border-[#2A2A2A] dark:bg-[#181818] dark:hover:border-indigo-500/50"} p-6 transition-all duration-300`}
              >
                <div className="flex items-start justify-between gap-5">
                  <div className="flex gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isClosed ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"}`}>
                      <BookOpen className="h-5 w-5 transition-transform group-hover:scale-110" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">{topic.title}</h2>
                        {isNewlyPublishedTopic(topic) && !isClosed && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">NEW</span>}
                        {isClosed && <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">Closed</span>}
                        {isClosingSoon && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">Closing soon</span>}
                      </div>
                      {/* Name of the actual supervisor from the database */}
                      <p className="mt-1 text-xs text-slate-500">Supervised by {topic.supervisorName || "Unknown Supervisor"}</p>
                      <p className={`mt-2 text-xs font-medium ${isFull ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>{isFull ? "Team full" : `${memberCount}/${topic.maxTeamSize} members · ${topic.maxTeamSize - memberCount} spot${topic.maxTeamSize - memberCount === 1 ? "" : "s"} left`}</p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-right dark:bg-emerald-950/30">
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {getMatchScore(topic)}{getMatchScore(topic) !== "..." ? "%" : ""}
                    </p>
                    <p className="text-[9px] font-medium text-emerald-600/70 dark:text-emerald-400/70">match</p>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3">
                  {topic.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {topic.requiredSkills?.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-[#2A2A2A]">
                  <p className="text-xs font-medium text-slate-400">Deadline · {topic.applicationDeadline || "Not set"}</p>
                  <Link to={`/student/research-topics/${topic.id}`} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-md">View details</Link>
                </div>
              </article>
            );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
