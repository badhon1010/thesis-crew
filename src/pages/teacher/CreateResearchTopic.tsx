import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Send, Calendar } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createResearchTopic, type ResearchTopicInput } from "@/firebase/researchTopics";
import { auth } from "@/firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firestore";

export default function CreateTopic() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    requiredSkills: "",
    maxTeamSize: 4,
    applicationDeadline: "",
    researchObjectives: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent, status: "draft" | "published") => {
    e.preventDefault();
    if (!formData.title || !formData.description) return alert("Title and Description are required!");

    const currentUser = auth.currentUser;
    if (!currentUser) {
      return alert("You must be logged in to create a topic.");
    }

    setIsSubmitting(true);

    try {
      // users কালেকশন থেকে আসল নাম নিয়ে আসা
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const realName = userDoc.exists() && userDoc.data().name 
        ? userDoc.data().name 
        : currentUser.displayName || "Supervisor";

      const newTopic: ResearchTopicInput = {
        title: formData.title,
        category: formData.category || "General",
        description: formData.description,
        requiredSkills: formData.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        maxTeamSize: Number(formData.maxTeamSize),
        applicationDeadline: formData.applicationDeadline,
        researchObjectives: formData.researchObjectives,
        
        supervisorId: currentUser.uid, 
        supervisorName: realName, // ডাটাবেজে আসল নাম সেভ হবে
        status,
      };

      await createResearchTopic(newTopic);
      navigate("/teacher/dashboard"); 
    } catch (error) {
      console.error("Error creating topic:", error);
      alert("Failed to create topic. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout role="teacher">
      <div className="mx-auto max-w-4xl px-2 sm:px-0">
        
        {/* হেডার */}
        <div className="mb-10">
          <button 
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
          
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-600 dark:bg-indigo-400" />
            Topic Creation
          </div>
          
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Publish New Research
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Define the problem statement, requirements, and deadline for students.
          </p>
        </div>

        {/* ফর্ম - স্ক্রিনশটের মত ডার্ক ম্যাট কার্ড */}
        <form className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-[#1e2433] dark:bg-[#111622]">
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Project Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., AI-Based Fall Detection System"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white dark:placeholder:text-slate-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Category / Domain</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g., Artificial Intelligence"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Required Skills</label>
              <input
                type="text"
                name="requiredSkills"
                value={formData.requiredSkills}
                onChange={handleChange}
                placeholder="e.g., Python, Machine Learning"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Max Team Size</label>
              <select
                name="maxTeamSize"
                value={formData.maxTeamSize}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white"
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num} Members</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">
                Application Deadline
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="applicationDeadline"
                  value={formData.applicationDeadline}
                  onChange={handleChange}
                  onClick={(e) => {
                    try {
                      (e.target as HTMLInputElement).showPicker();
                    } catch (error) {
                      console.error(error);
                    }
                  }}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <Calendar className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Project Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                placeholder="Briefly describe the research problem and goals..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white dark:placeholder:text-slate-500"
                required
              />
            </div>
          </div>

          {/* অ্যাকশন বাটনস */}
          <div className="flex flex-col-reverse justify-end gap-4 border-t border-slate-100 pt-8 sm:flex-row dark:border-[#1e2433]">
            <button
              type="button"
              onClick={(e) => handleSubmit(e, "draft")}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-slate-300 dark:hover:bg-[#1a2133]"
            >
              <Save className="h-4 w-4" /> Save Draft
            </button>

            {/* স্ক্রিনশটের মত গ্লোয়িং বাটন */}
            <button
              type="button"
              onClick={(e) => handleSubmit(e, "published")}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-50 dark:border dark:border-indigo-500/50 dark:shadow-[0_0_20px_rgba(79,70,229,0.3)]"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Publish Topic
            </button>
          </div>

        </form>
      </div>
    </DashboardLayout>
  );
}