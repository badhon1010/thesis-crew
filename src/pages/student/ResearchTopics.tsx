import { useState, useEffect } from "react";
import { BookOpen, Filter, Search, SlidersHorizontal } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getPublishedResearchTopics, type ResearchTopic } from "@/firebase/researchTopics";

export default function StudentResearchTopics() {
  const [topics, setTopics] = useState<ResearchTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadTopics() {
      try {
        // ফায়ারবেস থেকে শুধু published টপিকগুলো নিয়ে আসবে
        const data = await getPublishedResearchTopics();
        setTopics(data);
      } catch (error) {
        console.error("Failed to load topics:", error);
      } finally {
        setLoading(false);
      }
    }
    loadTopics();
  }, []);

  const filteredTopics = topics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout role="student">
      <div className="mx-auto max-w-5xl px-2 sm:px-0">
        
        {/* হেডার সেকশন */}
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

        {/* সার্চ এবং ফিল্টার */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search research topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 dark:border-[#1e2433] dark:bg-[#111622] dark:text-white dark:focus:border-indigo-500"
            />
          </div>

          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium transition hover:bg-slate-50 dark:border-[#1e2433] dark:bg-[#111622] dark:text-white dark:hover:bg-[#1a2133]">
            <Filter className="h-4 w-4 text-slate-400" />
            Category
          </button>

          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium transition hover:bg-slate-50 dark:border-[#1e2433] dark:bg-[#111622] dark:text-white dark:hover:bg-[#1a2133]">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            Best match
          </button>
        </div>

        {/* টপিকস লিস্ট */}
        <div className="grid gap-5 lg:grid-cols-2">
          {loading ? (
            <div className="col-span-2 p-12 text-center text-sm text-slate-500">Loading research topics...</div>
          ) : filteredTopics.length === 0 ? (
            <div className="col-span-2 p-12 text-center text-sm text-slate-500">No published topics found matching your search.</div>
          ) : (
            filteredTopics.map((topic) => (
              <article
                key={topic.id}
                className="group rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-indigo-200 dark:border-[#1e2433] dark:bg-[#111622] dark:hover:border-slate-700"
              >
                <div className="flex items-start justify-between gap-5">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900 dark:text-white">{topic.title}</h2>
                      {/* ডাটাবেজ থেকে আসা আসল টিচারের নাম */}
                      <p className="mt-1 text-xs text-slate-500">Supervised by {topic.supervisorName || "Unknown Supervisor"}</p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-right dark:bg-emerald-950/30">
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">92%</p>
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

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-[#1e2433]">
                  <p className="text-xs font-medium text-slate-400">Deadline · {topic.applicationDeadline || "Not set"}</p>
                  <button className="text-sm font-medium text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                    View details →
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}