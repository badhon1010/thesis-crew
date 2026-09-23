import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Calendar } from "lucide-react";
import { ToastAlert } from "@/components/common/ToastAlert";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getResearchTopicById, updateResearchTopic, type ResearchTopicInput } from "@/firebase/researchTopics";

export default function EditTopic() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [toast, setToast] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  }>({
    show: false,
    type: "success",
    message: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ show: true, type, message });
  };

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    requiredSkills: "",
    maxTeamSize: 4,
    applicationDeadline: "",
    researchObjectives: "",
  });

  useEffect(() => {
    async function fetchTopic() {
      if (!id) return;
      try {
        const topic = await getResearchTopicById(id);
        if (topic) {
          setFormData({
            title: topic.title,
            category: topic.category,
            description: topic.description,
            requiredSkills: topic.requiredSkills ? topic.requiredSkills.join(", ") : "",
            maxTeamSize: topic.maxTeamSize,
            applicationDeadline: topic.applicationDeadline || "",
            researchObjectives: topic.researchObjectives || "",
          });
        } else {
          showToast("error", "Topic not found!");
          setTimeout(() => navigate("/teacher/dashboard"), 1500);
        }
      } catch (error) {
        console.error("Error fetching topic:", error);
        showToast("error", "Failed to fetch research topic details.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchTopic();
  }, [id, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent, status: "draft" | "published") => {
    e.preventDefault();
    if (!id || !formData.title || !formData.description) {
      showToast("error", "Title and Description are required!");
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedData: Partial<ResearchTopicInput> = {
        title: formData.title,
        category: formData.category || "General",
        description: formData.description,
        requiredSkills: formData.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        maxTeamSize: Number(formData.maxTeamSize),
        applicationDeadline: formData.applicationDeadline,
        researchObjectives: formData.researchObjectives,
        status,
      };

      await updateResearchTopic(id, updatedData);
      showToast("success", "Research topic updated successfully!");
      
      setTimeout(() => {
        navigate("/teacher/dashboard");
      }, 3000);
    } catch (error) {
      console.error("Error updating topic:", error);
      showToast("error", "Failed to update research topic. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout role="teacher">
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="teacher">
      <div className="mx-auto max-w-6xl px-2 sm:px-4">
        
        <ToastAlert
          show={toast.show}
          type={toast.type}
          message={toast.message}
          duration={3000}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />

        <div className="mb-10">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
          
          <div className="flex flex-col items-start gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-600 dark:bg-amber-400" />
              Edit Mode
            </div>
            
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Update Research Topic
            </h1>
          </div>
        </div>

        <form className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-[#1e2433] dark:bg-[#111622]">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Project Title</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white" required />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Category / Domain</label>
              <input type="text" name="category" value={formData.category} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Required Skills</label>
              <input type="text" name="requiredSkills" value={formData.requiredSkills} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Max Team Size</label>
              <select name="maxTeamSize" value={formData.maxTeamSize} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white">
                {[1, 2, 3, 4, 5].map(num => <option key={num} value={num}>{num} Members</option>)}
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
              <textarea name="description" value={formData.description} onChange={handleChange} rows={5} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#1e2433] dark:bg-[#0b0f19] dark:text-white" required />
            </div>
          </div>

          <div className="flex flex-col-reverse justify-end gap-4 border-t border-slate-100 pt-8 sm:flex-row dark:border-[#1e2433]">
            <button type="button" onClick={(e) => handleSubmit(e, "published")} disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-amber-500 disabled:opacity-50 dark:border dark:border-amber-500/50 dark:shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}