import { X, User, GraduationCap, Award, BookOpen, Code } from "lucide-react";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firestore";

interface StudentProfile {
  name: string;
  studentId?: string;
  department?: string;
  cgpa?: string;
  researchInterests?: string;
  skills?: string[];
  email?: string;
}

interface StudentProfileModalProps {
  isOpen: boolean;
  studentId: string;
  onClose: () => void;
}

export function StudentProfileModal({
  isOpen,
  studentId,
  onClose,
}: StudentProfileModalProps) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && studentId) {
      const fetchProfile = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, "users", studentId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as StudentProfile);
          }
        } catch (error) {
          console.error("Failed to load student profile:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all dark:border dark:border-[#2A2A2A] dark:bg-[#121212]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-[#2A2A2A]">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Student Profile
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#1A1A1A] dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading profile...
            </div>
          ) : !profile ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Profile not found.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Student Info */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                    {profile.name || "N/A"}
                  </h4>
                  {profile.email && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {profile.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Basic Details Grid */}
              <div className="grid gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-[#2A2A2A] dark:bg-[#181818] sm:grid-cols-2">
                <DetailItem
                  icon={GraduationCap}
                  label="Student ID"
                  value={profile.studentId || "Not provided"}
                />
                <DetailItem
                  icon={BookOpen}
                  label="Department"
                  value={profile.department || "Not provided"}
                />
                <DetailItem
                  icon={Award}
                  label="CGPA"
                  value={profile.cgpa || "Not provided"}
                />
              </div>

              {/* Research Interests */}
              {profile.researchInterests && (
                <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <h5 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Research Interests
                  </h5>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {profile.researchInterests}
                  </p>
                </div>
              )}

              {/* Technical Skills */}
              {profile.skills && profile.skills.length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Code className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Technical Skills
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, index) => (
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
