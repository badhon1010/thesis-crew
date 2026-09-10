import { X, User, GraduationCap, Award, BookOpen, Code, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firestore";
import type { TeamMemberInfo } from "@/firebase/teamFormation";

interface StudentProfile {
  name: string;
  studentId?: string;
  department?: string;
  cgpa?: string;
  researchInterests?: string;
  skills?: string[];
  email?: string;
}

interface GroupMemberProfileModalProps {
  isOpen: boolean;
  teamMembers: TeamMemberInfo[];
  onClose: () => void;
}

export function GroupMemberProfileModal({
  isOpen,
  teamMembers,
  onClose,
}: GroupMemberProfileModalProps) {
  const [profiles, setProfiles] = useState<Map<string, StudentProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && teamMembers.length > 0) {
      const fetchProfiles = async () => {
        setLoading(true);
        const profileMap = new Map<string, StudentProfile>();

        try {
          for (const member of teamMembers) {
            try {
              const docRef = doc(db, "users", member.studentId);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                profileMap.set(member.studentId, docSnap.data() as StudentProfile);
              } else {
                // Use the data from teamMembers if profile doesn't exist
                profileMap.set(member.studentId, {
                  name: member.name,
                  studentId: member.studentId,
                  email: member.email,
                  department: member.department,
                  cgpa: member.cgpa,
                  skills: member.skills,
                });
              }
            } catch (error) {
              console.error(`Failed to load profile for ${member.studentId}:`, error);
              // Use fallback data
              profileMap.set(member.studentId, {
                name: member.name,
                studentId: member.studentId,
                email: member.email,
                department: member.department,
                cgpa: member.cgpa,
                skills: member.skills,
              });
            }
          }
          setProfiles(profileMap);
        } catch (error) {
          console.error("Failed to load team member profiles:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchProfiles();
      // Set first member as selected by default
      if (teamMembers.length > 0) {
        setSelectedMemberId(teamMembers[0].studentId);
      }
    }
  }, [isOpen, teamMembers]);

  if (!isOpen) return null;

  const selectedProfile = selectedMemberId ? profiles.get(selectedMemberId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all dark:border dark:border-[#2A2A2A] dark:bg-[#121212]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Group Members
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {teamMembers.length} member{teamMembers.length === 1 ? "" : "s"} in this group
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#1A1A1A] dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading profiles...
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No team members found.
            </div>
          ) : (
            <div className="grid md:grid-cols-[250px_1fr]">
              {/* Member List Sidebar */}
              <div className="border-r border-slate-100 bg-slate-50 dark:border-[#2A2A2A] dark:bg-[#0F0F0F]">
                <div className="p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Team Members
                  </p>
                  <div className="space-y-2">
                    {teamMembers.map((member, index) => (
                      <button
                        key={member.studentId}
                        onClick={() => setSelectedMemberId(member.studentId)}
                        className={`w-full rounded-lg p-3 text-left transition-colors ${
                          selectedMemberId === member.studentId
                            ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-200"
                            : "hover:bg-slate-100 dark:hover:bg-[#1A1A1A]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                            {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {member.name}
                            </p>
                            {index === 0 && (
                              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                Leader
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Member Profile Details */}
              <div className="p-6">
                {selectedProfile ? (
                  <div className="space-y-6">
                    {/* Student Info */}
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <User className="h-8 w-8" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                          {selectedProfile.name || "N/A"}
                        </h4>
                        {selectedProfile.email && (
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {selectedProfile.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Basic Details Grid */}
                    <div className="grid gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-[#2A2A2A] dark:bg-[#181818] sm:grid-cols-2">
                      <DetailItem
                        icon={GraduationCap}
                        label="Student ID"
                        value={selectedProfile.studentId || "Not provided"}
                      />
                      <DetailItem
                        icon={BookOpen}
                        label="Department"
                        value={selectedProfile.department || "Not provided"}
                      />
                      <DetailItem
                        icon={Award}
                        label="CGPA"
                        value={selectedProfile.cgpa || "Not provided"}
                      />
                    </div>

                    {/* Research Interests */}
                    {selectedProfile.researchInterests && (
                      <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-[#2A2A2A] dark:bg-[#181818]">
                        <h5 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                          <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          Research Interests
                        </h5>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                          {selectedProfile.researchInterests}
                        </p>
                      </div>
                    )}

                    {/* Technical Skills */}
                    {selectedProfile.skills && selectedProfile.skills.length > 0 && (
                      <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-[#2A2A2A] dark:bg-[#181818]">
                        <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                          <Code className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          Technical Skills
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {selectedProfile.skills.map((skill, index) => (
                            <span
                              key={index}
                              className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-slate-500">
                    Select a member to view their profile.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 p-6 dark:border-[#2A2A2A]">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-6 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-[#2A2A2A] dark:text-slate-300 dark:hover:bg-[#333333]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof GraduationCap;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}
