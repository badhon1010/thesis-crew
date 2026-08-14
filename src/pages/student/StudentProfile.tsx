import { useState, useEffect } from "react";
import { Loader2, Save, UserCircle, X, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { auth } from "@/firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface UserProfile {
  name: string;
  studentId: string;
  department: string;
  cgpa: string;
  researchInterests: string;
  skills: string[];
}

export default function StudentProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [userUid, setUserUid] = useState<string | null>(null);

  const [formData, setFormData] = useState<UserProfile>({
    name: "",
    studentId: "",
    department: "",
    cgpa: "",
    researchInterests: "",
    skills: [],
  });

  // ফায়ারবেস থেকে কারেন্ট ইউজারের ডাটা ফেচ করা
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserUid(user.uid);
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFormData({
              name: data.name || user.displayName || "",
              studentId: data.studentId || "",
              department: data.department || "",
              cgpa: data.cgpa || "",
              researchInterests: data.researchInterests || "",
              skills: data.skills || [],
            });
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // স্কিল অ্যাড করা (Enter চাপলে বা Add বাটনে ক্লিক করলে)
  const handleAddSkill = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    e?.preventDefault(); // ফর্ম সাবমিট হওয়া ঠেকানোর জন্য
    
    const trimmedSkill = skillInput.trim();
    if (trimmedSkill && !formData.skills.includes(trimmedSkill)) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, trimmedSkill],
      }));
      setSkillInput("");
    }
  };

  // স্কিল রিমুভ করা
  const removeSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }));
  };

  // প্রোফাইল আপডেট করা
  const handleSaveProfile = async () => {
    if (!userUid) return alert("You must be logged in!");
    setSaving(true);
    
    try {
      const docRef = doc(db, "users", userUid);
      await updateDoc(docRef, {
        name: formData.name,
        studentId: formData.studentId,
        department: formData.department,
        cgpa: formData.cgpa,
        researchInterests: formData.researchInterests,
        skills: formData.skills,
      });
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student">
      <div className="mx-auto max-w-4xl px-2 sm:px-0">
        
        {/* হেডার */}
        <div className="mb-10 flex items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <UserCircle className="h-12 w-12" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              My Profile
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Manage your personal information and update your skills to find the best research matches.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* বেসিক ইনফরমেশন কার্ড */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-[#1e2433] dark:bg-[#111622]">
            <h2 className="mb-6 text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-4 dark:border-[#1e2433]">
              Basic Information
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Student ID</label>
                <input
                  type="text"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">CGPA</label>
                <input
                  type="text"
                  name="cgpa"
                  value={formData.cgpa}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          </section>

          {/* রিসার্চ ও স্কিলস কার্ড */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-[#1e2433] dark:bg-[#111622]">
            <h2 className="mb-6 text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-4 dark:border-[#1e2433]">
              Research & Skills
            </h2>
            <div className="grid gap-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Research Interests</label>
                <input
                  type="text"
                  name="researchInterests"
                  value={formData.researchInterests}
                  onChange={handleChange}
                  placeholder="e.g., Artificial Intelligence, IoT, Web Development"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Technical Skills</label>
                
                {/* স্কিল অ্যাড করার ফিল্ড */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    placeholder="Type a skill and press Enter..."
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-[#1e2433] dark:text-slate-300 dark:hover:bg-[#2a3143]"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                {/* স্কিল ব্যাজ দেখানোর জায়গা */}
                {formData.skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-[#1e2433] dark:bg-[#0b0f19]">
                    {formData.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="rounded-full p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-500/40"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* সেভ বাটন */}
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-50 dark:border dark:border-indigo-500/50 dark:shadow-[0_0_20px_rgba(79,70,229,0.3)]"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Save Profile Changes
            </button>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}