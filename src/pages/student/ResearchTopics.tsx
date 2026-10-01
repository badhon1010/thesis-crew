import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronDown, Filter, Search, SlidersHorizontal } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";
import { type ResearchTopic } from "@/firebase/researchTopics";
import { getQuickScoresAll } from "@/lib/ai";
import { isNewlyPublishedTopic } from "@/utils/topicStatus";

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
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [sortBy, setSortBy] = useState("bestMatch");

  const mapCategories = (rawCategory: string): string[] => {
    const text = rawCategory.toLowerCase();
    const matchedCategories: string[] = [];
    
    if (/\b(ai|artificial intelligence)\b/.test(text)) matchedCategories.push("Artificial Intelligence (AI)");
    if (/\b(ml|machine learning)\b/.test(text)) matchedCategories.push("Machine Learning (ML)");
    if (/\b(cybersecurity|network defence|network defense|cyber security)\b/.test(text)) matchedCategories.push("Cybersecurity & Network Defense");
    if (/\b(nlp|natural language processing)\b/.test(text)) matchedCategories.push("Natural Language Processing (NLP)");
    if (/\b(iot|internet of things)\b/.test(text)) matchedCategories.push("Internet of Things (IoT)");
    if (/\b(hci|human computer interaction|human-computer interaction)\b/.test(text)) matchedCategories.push("Human-Computer Interaction (HCI)");
    if (/\b(se|software engineering)\b/.test(text)) matchedCategories.push("Software Engineering");
    if (/\b(data science|data analytics|big data)\b/.test(text)) matchedCategories.push("Data Science");
    if (/\b(bioinformatics)\b/.test(text)) matchedCategories.push("Bioinformatics");
    if (/\b(blockchain|web3)\b/.test(text)) matchedCategories.push("Blockchain");
    if (/\b(computer vision|cv|image processing)\b/.test(text)) matchedCategories.push("Computer Vision");
    
    if (matchedCategories.length === 0) {
      matchedCategories.push(rawCategory.trim().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '));
    }
    
    return matchedCategories;
  };

  const categoriesSet = new Set<string>();
  topics.forEach(t => mapCategories(t.category).forEach(c => categoriesSet.add(c)));
  const sortedCategories = Array.from(categoriesSet).sort((a, b) => a.localeCompare(b));
  const categories = ["All Categories", ...sortedCategories];

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

  const filteredTopics = topics.filter((topic) => {
    const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          topic.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          topic.description.toLowerCase().includes(searchTerm.toLowerCase());
    const mappedCats = mapCategories(topic.category);
    const matchesCategory = categoryFilter === "All Categories" || mappedCats.includes(categoryFilter);
    
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
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
    
    // 3. Sorting logic for open topics
    if (sortBy === "bestMatch") {
      const aMatchVal = getMatchScore(a);
      const bMatchVal = getMatchScore(b);
      const aMatch = typeof aMatchVal === 'number' ? aMatchVal : 0;
      const bMatch = typeof bMatchVal === 'number' ? bMatchVal : 0;
      
      if (aMatch !== bMatch) {
        return bMatch - aMatch;
      }
      return aDate.getTime() - bDate.getTime(); // fallback to deadline
    } 
    else if (sortBy === "deadline") {
      return aDate.getTime() - bDate.getTime();
    }
    else if (sortBy === "newest") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aVal = (a.createdAt as any)?.seconds ? (a.createdAt as any).seconds * 1000 : a.createdAt;
      const aCreated = aVal ? new Date(aVal as string | number).getTime() : 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bVal = (b.createdAt as any)?.seconds ? (b.createdAt as any).seconds * 1000 : b.createdAt;
      const bCreated = bVal ? new Date(bVal as string | number).getTime() : 0;
      return bCreated - aCreated;
    }
    
    return 0;
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

          <div className="relative group">
            <Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-12 w-full sm:w-[220px] cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white/50 pl-11 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none backdrop-blur-sm transition-all hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-[#2A2A2A] dark:bg-[#181818]/50 dark:text-slate-200 dark:hover:bg-[#181818] dark:focus:border-indigo-500 dark:focus:bg-[#181818]"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative group">
            <SlidersHorizontal className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-12 w-full sm:w-[180px] cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white/50 pl-11 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none backdrop-blur-sm transition-all hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-[#2A2A2A] dark:bg-[#181818]/50 dark:text-slate-200 dark:hover:bg-[#181818] dark:focus:border-indigo-500 dark:focus:bg-[#181818]"
            >
              <option value="bestMatch">Best match</option>
              <option value="newest">Newest first</option>
              <option value="deadline">Closing soon</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
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
