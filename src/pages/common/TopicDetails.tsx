import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock3,
  Edit,
  Loader2,
  Sparkles,
  Users,
  AlertCircle,
  User,
  CheckCircle2,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getResearchTopicById, type ResearchTopic } from "@/firebase/researchTopics";

export default function TopicDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isTeacher = location.pathname.startsWith("/teacher");
  const role = isTeacher ? "teacher" : "student";
  const backPath = isTeacher ? "/teacher/topics" : "/student/research-topics";

  const [topic, setTopic] = useState<ResearchTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTopicDetails() {
      if (!id) {
        setError("Invalid Topic ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getResearchTopicById(id);
        if (data) {
          setTopic(data);
        } else {
          setError("Research topic not found.");
        }
      } catch (err) {
        console.error("Error fetching topic details:", err);
        setError("Failed to load research topic details. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchTopicDetails();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout role={role}>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading topic details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !topic) {
    return (
      <DashboardLayout role={role}>
        <div className="mx-auto max-w-3xl px-2 sm:px-0">
          <button
            onClick={() => navigate(backPath)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Research Topics
          </button>

          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center dark:border-red-500/20 dark:bg-red-500/10">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {error || "Topic Not Found"}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              The topic you are looking for does not exist or could not be loaded.
            </p>
            <Link
              to={backPath}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Topics
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={role}>
      <div className="mx-auto max-w-4xl px-2 sm:px-0">
        
        {/* Back Link & Header Actions */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate(backPath)}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Topics
          </button>

          {isTeacher && (
            <Link
              to={`/teacher/topics/edit/${topic.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 dark:border dark:border-indigo-500/50 dark:shadow-[0_0_20px_rgba(79,70,229,0.3)]"
            >
              <Edit className="h-4 w-4" /> Edit Topic
            </Link>
          )}
        </div>

        {/* Hero Card */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-[#2A2A2A] dark:bg-[#181818]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-600 dark:border-indigo-500/35 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" /> {topic.category || "General Research"}
            </span>

            {topic.status && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                  topic.status === "published"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                }`}
              >
                {topic.status}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {topic.title}
          </h1>

          {/* Quick Info Strip */}
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 dark:border-[#2A2A2A] sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">Supervisor</p>
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {topic.supervisorName || "Faculty Supervisor"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">Application Deadline</p>
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {topic.applicationDeadline
                    ? new Date(topic.applicationDeadline).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Not specified"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">Max Team Size</p>
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {topic.maxTeamSize} {topic.maxTeamSize === 1 ? "Member" : "Members"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="space-y-6">
          {/* Overview & Description Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-[#2A2A2A] dark:bg-[#181818]">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-4 dark:border-[#2A2A2A]">
              <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Project Overview
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {topic.description}
            </p>
          </section>

          {/* Research Objectives Card */}
          {topic.researchObjectives && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-[#2A2A2A] dark:bg-[#181818]">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-4 dark:border-[#2A2A2A]">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Research Objectives
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {topic.researchObjectives}
              </p>
            </section>
          )}

          {/* Required Skills Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-[#2A2A2A] dark:bg-[#181818]">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-4 dark:border-[#2A2A2A]">
              <Clock3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Required Skills & Qualifications
            </h2>
            {topic.requiredSkills && topic.requiredSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {topic.requiredSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-[#2A2A2A] dark:bg-[#222222] dark:text-slate-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No specific skills specified for this topic.</p>
            )}
          </section>
        </div>

      </div>
    </DashboardLayout>
  );
}
