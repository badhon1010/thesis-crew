import { useNavigate } from "react-router-dom";
import { Users, CheckCircle2, Calendar, TrendingUp, FileText, ArrowRight } from "lucide-react";
import type { Team } from "@/firebase/teamFormation";
import type { ResearchTopic } from "@/firebase/researchTopics";

export interface ResearchGroupWithTopic extends Team {
  topic?: ResearchTopic;
}

interface GroupCardProps {
  group: ResearchGroupWithTopic;
  role: "teacher" | "student";
}

export function GroupCard({ group, role }: GroupCardProps) {
  const navigate = useNavigate();
  
  // A consistent pseudo-random number based on the project ID string so it doesn't jump around on re-renders
  const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };
  
  const hash = hashString(group.projectId);
  const progress = (hash % 50) + 50; // 50 to 99
  const filesCount = (hash % 20) + 5; // 5 to 24
  
  // Safely parse timestamp if it exists, otherwise fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createdAtDate = group.createdAt && (group.createdAt as any).seconds
    ? new Date((group.createdAt as any).seconds * 1000) 
    : new Date();
    
  const handleCardClick = () => {
    if (role === "teacher") {
      navigate(`/teacher/research-groups/${group.projectId}`);
    } else {
      navigate(`/student/my-groups/${group.projectId}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-[#181818]"
    >
      {/* Gradient Border Wrap */}
      <div className="absolute inset-0 z-0 rounded-2xl border-2 border-slate-200 transition-colors duration-300 group-hover:border-transparent dark:border-[#2A2A2A]"></div>
      <div className="absolute inset-0 z-0 -m-[2px] rounded-[18px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
      
      {/* Card Content Wrapper */}
      <div className="relative z-10 m-[2px] flex h-[calc(100%-4px)] flex-col rounded-2xl bg-white dark:bg-[#181818]">
        {/* Header */}
        <div className="border-b border-slate-100 px-6 py-5 dark:border-[#2A2A2A]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-2.5 py-1 text-[11px] font-bold tracking-wide text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  ACTIVE
                </span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {group.memberIds.length} members
                </span>
              </div>
              <h3 className="line-clamp-2 text-lg font-bold leading-tight text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                {group.topicTitle}
              </h3>
            </div>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-50 transition-colors group-hover:bg-indigo-100 dark:bg-indigo-500/10 dark:group-hover:bg-indigo-500/20">
              <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 flex-col p-6">
          {/* Stats Grid */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            {/* Progress */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 transition-colors group-hover:border-emerald-100 group-hover:bg-emerald-50 dark:border-[#2A2A2A] dark:bg-[#0F0F0F] dark:group-hover:border-emerald-500/20 dark:group-hover:bg-emerald-500/10">
              <div className="mb-1.5 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 dark:text-slate-500 dark:group-hover:text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">Progress</span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                {progress}%
              </p>
            </div>

            {/* Files */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 transition-colors group-hover:border-violet-100 group-hover:bg-violet-50 dark:border-[#2A2A2A] dark:bg-[#0F0F0F] dark:group-hover:border-violet-500/20 dark:group-hover:bg-violet-500/10">
              <div className="mb-1.5 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-400 group-hover:text-violet-600 dark:text-slate-500 dark:group-hover:text-violet-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-violet-700 dark:group-hover:text-violet-300">Files</span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-400">
                {filesCount}
              </p>
            </div>
            
            {/* Team Size */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 transition-colors group-hover:border-indigo-100 group-hover:bg-indigo-50 dark:border-[#2A2A2A] dark:bg-[#0F0F0F] dark:group-hover:border-indigo-500/20 dark:group-hover:bg-indigo-500/10">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-indigo-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Team</span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                {group.memberIds.length}/{group.maxTeamSize}
              </p>
            </div>
          </div>

          <div className="mt-auto">
            {/* Member Avatars */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex -space-x-3">
                {Array.from({ length: Math.min(group.memberIds.length, 6) }).map((_, i) => (
                  <div
                    key={i}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-xs font-bold text-white shadow-sm ring-2 ring-transparent transition-transform hover:z-10 hover:-translate-y-1 hover:ring-indigo-200 dark:border-[#181818] dark:hover:ring-indigo-500/30"
                    style={{
                      backgroundColor: `hsl(${(i * 360) / 6}, 70%, 55%)`,
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
                {group.memberIds.length > 6 && (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-bold text-slate-600 shadow-sm dark:border-[#181818] dark:bg-slate-800 dark:text-slate-300">
                    +{group.memberIds.length - 6}
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    {createdAtDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Info */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-5 dark:border-[#2A2A2A]">
              <p className="text-xs font-medium text-slate-500 transition-colors group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400">
                Click to {role === "teacher" ? "manage group" : "view details"}
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-md dark:bg-[#2A2A2A] dark:group-hover:bg-indigo-500">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
