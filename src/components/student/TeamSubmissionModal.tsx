import { useState, useEffect } from "react";
import { Loader2, Search, Users, X, UserPlus, CheckCircle2 } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { type ResearchTopic } from "@/firebase/researchTopics";
import { submitGroupJoinRequest, type TeamMemberInfo } from "@/firebase/teamFormation";
import { calculateSkillMatch } from "@/utils/skillMatching";

interface TeamSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: ResearchTopic;
  leaderId: string;
  leaderProfile: any;
  aiMatchAnalysis?: any;
  onSuccess: () => void;
}

export function TeamSubmissionModal({ isOpen, onClose, topic, leaderId, leaderProfile, aiMatchAnalysis, onSuccess }: TeamSubmissionModalProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMemberInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchBy, setSearchBy] = useState<"studentId" | "email">("studentId");
  
  const [allStudents, setAllStudents] = useState<TeamMemberInfo[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  
  const [requestMessage, setRequestMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const q = query(collection(db, "users"), where("role", "==", "student"));
        const snapshot = await getDocs(q);
        const students: TeamMemberInfo[] = [];
        snapshot.forEach((doc) => {
          if (doc.id !== leaderId) { // Exclude leader
            const data = doc.data();
            students.push({
              name: data.name || "Unknown Name",
              studentId: data.studentId || "",
              uid: doc.id,
              email: data.email || "",
              skills: data.skills || [],
            });
          }
        });
        setAllStudents(students);
      } catch (err) {
        console.error("Error fetching students:", err);
      } finally {
        setLoadingStudents(false);
      }
    };
    
    fetchStudents();
  }, [isOpen, leaderId]);

  if (!isOpen) return null;

  const suggestions = searchQuery.trim() === "" 
    ? [] 
    : allStudents.filter((student) => {
        const term = searchQuery.toLowerCase();
        const fieldVal = searchBy === "email" ? student.email : student.studentId;
        if (!fieldVal) return false;
        
        // Match includes
        if (!fieldVal.toLowerCase().includes(term)) return false;
        
        // Exclude already added
        if (teamMembers.some((m) => m.studentId === student.studentId)) return false;
        
        return true;
      }).slice(0, 5); // Limit to 5 suggestions

  const addMember = (student: TeamMemberInfo) => {
    if (teamMembers.length + 1 >= topic.maxTeamSize) {
      setError(`Team size cannot exceed ${topic.maxTeamSize} members.`);
      return;
    }
    setTeamMembers([...teamMembers, student]);
    setSearchQuery("");
  };

  const removeMember = (id: string) => {
    setTeamMembers(teamMembers.filter((m) => m.studentId !== id));
  };

  const handleSubmit = async () => {
    if (teamMembers.length === 0) {
      setError("Please add at least one team member.");
      return;
    }
    
    setSubmitting(true);
    setError("");
    
    try {
      await submitGroupJoinRequest(topic, leaderId, leaderProfile, teamMembers, requestMessage, aiMatchAnalysis);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-[#181818]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-[#181818]/80">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Form a Team</h2>
            <p className="text-xs text-slate-500">Apply for "{topic.title}"</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Search Section */}
          <div className="mb-8 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-900 dark:text-white">Add Team Members</label>
              <span className="text-xs font-medium text-slate-500">
                {teamMembers.length + 1}/{topic.maxTeamSize} added
              </span>
            </div>

            {teamMembers.length + 1 < topic.maxTeamSize ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#121212]">
                <div className="flex flex-col sm:flex-row gap-3 relative">
                  <select
                    value={searchBy}
                    onChange={(e) => {
                      setSearchBy(e.target.value as "studentId" | "email");
                      setSearchQuery("");
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-[#181818] dark:text-white"
                  >
                    <option value="studentId">Student ID</option>
                    <option value="email">Email Address</option>
                  </select>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder={loadingStudents ? "Loading students..." : `Search by ${searchBy === 'email' ? 'email' : 'student ID'}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={loadingStudents}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-[#181818] dark:text-white disabled:opacity-70"
                    />
                    {loadingStudents && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Suggestions Dropdown */}
                {searchQuery.trim() !== "" && (
                  <div className="mt-2 flex flex-col gap-2">
                    {suggestions.length > 0 ? (
                      suggestions.map((student) => (
                        <div key={student.studentId} className="flex items-center justify-between rounded-lg border border-indigo-100 bg-white p-3 shadow-sm dark:border-indigo-500/20 dark:bg-[#181818]">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{student.name}</p>
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                                {calculateSkillMatch(student.skills || [], topic.requiredSkills).score}% match
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">ID: {student.studentId} | {student.email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addMember(student)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Add
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-[#181818]">
                        No students found matching "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500" />
                <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">Team is full!</p>
              </div>
            )}
          </div>

          {/* Members List */}
          <div className="mb-8 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-500/20 dark:bg-indigo-500/5">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{leaderProfile.name || "You"}</p>
                <p className="text-xs text-slate-500">Team Leader</p>
              </div>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
                Leader
              </span>
            </div>

            {teamMembers.map((member) => (
              <div key={member.studentId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#121212]">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{member.name}</p>
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                      {calculateSkillMatch(member.skills || [], topic.requiredSkills).score}% match
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">ID: {member.studentId} | {member.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeMember(member.studentId)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

            {teamMembers.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 py-6 text-center dark:border-slate-700">
                <Users className="mx-auto h-6 w-6 text-slate-400" />
                <p className="mt-1 text-xs text-slate-500">Search to add team members</p>
              </div>
            )}
          </div>

          {/* Message */}
          <div className="mb-8">
            <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">
              Message to supervisor <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              maxLength={400}
              rows={3}
              placeholder="Briefly explain why your team is interested in this topic..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-[#121212] dark:text-white"
            />
            <p className="mt-1 text-right text-[11px] text-slate-500">{requestMessage.length}/400</p>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-[#121212]">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || teamMembers.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
