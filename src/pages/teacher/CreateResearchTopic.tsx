import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Send, Calendar, Edit, X, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { createResearchTopic, getTeacherResearchTopics, updateResearchTopic, deleteResearchTopic, type ResearchTopicInput, type ResearchTopic } from "@/firebase/researchTopics";
import { notifyStudentsOfNewTopic } from "@/firebase/notifications";
import { auth } from "@/firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db } from "@/firebase/firestore";

export default function CreateTopic() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastConfig, setToastConfig] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [drafts, setDrafts] = useState<ResearchTopic[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);

  const fetchDrafts = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const allTopics = await getTeacherResearchTopics(currentUser.uid);
      setDrafts(allTopics.filter(t => t.status === "draft"));
    } catch (error) {
      console.error("Failed to fetch drafts:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const allTopics = await getTeacherResearchTopics(user.uid);
          setDrafts(allTopics.filter(t => t.status === "draft"));
        } catch (error) {
          console.error("Failed to fetch drafts:", error);
        }
      } else {
        setDrafts([]);
      }
    });
    return () => unsubscribe();
  }, []);

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

  const handleEditDraft = (draft: ResearchTopic) => {
    setEditingDraftId(draft.id);
    setFormData({
      title: draft.title || "",
      category: draft.category || "General",
      description: draft.description || "",
      requiredSkills: (draft.requiredSkills || []).join(", "),
      maxTeamSize: draft.maxTeamSize || 4,
      applicationDeadline: draft.applicationDeadline || "",
      researchObjectives: draft.researchObjectives || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingDraftId(null);
    setFormData({
      title: "",
      category: "",
      description: "",
      requiredSkills: "",
      maxTeamSize: 4,
      applicationDeadline: "",
      researchObjectives: "",
    });
  };


  const handleDeleteDraft = async () => {
    if (!draftToDelete) return;
    try {
      await deleteResearchTopic(draftToDelete);
      setToastConfig({ message: "Draft deleted successfully!", type: "success" });
      if (editingDraftId === draftToDelete) {
        cancelEdit();
      }
      fetchDrafts();
    } catch (error) {
      console.error("Error deleting draft:", error);
      setToastConfig({ message: "Failed to delete draft.", type: "error" });
    } finally {
      setDraftToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent, status: "draft" | "published") => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      setToastConfig({ message: "Title and Description are required!", type: "error" });
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setToastConfig({ message: "You must be logged in to create a topic.", type: "error" });
      return;
    }

    setIsSubmitting(true);

    try {
      const allExisting = await getTeacherResearchTopics(currentUser.uid);
      const duplicateTopic = allExisting.find(t => 
        t.title.trim().toLowerCase() === formData.title.trim().toLowerCase() &&
        t.id !== editingDraftId
      );
      
      if (duplicateTopic) {
        if (duplicateTopic.status === "draft") {
          setToastConfig({ message: "This topic has already been saved as a draft. Please check your drafts.", type: "error" });
        } else {
          setToastConfig({ message: "A published topic with this title already exists.", type: "error" });
        }
        setIsSubmitting(false);
        return;
      }

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const realName = userDoc.exists() && userDoc.data().name 
        ? userDoc.data().name 
        : currentUser.displayName || "Supervisor";

      const newTopic: Partial<ResearchTopicInput> = {
        title: formData.title,
        category: formData.category || "General",
        description: formData.description,
        requiredSkills: formData.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        maxTeamSize: Number(formData.maxTeamSize),
        applicationDeadline: formData.applicationDeadline,
        researchObjectives: formData.researchObjectives,
        
        supervisorId: currentUser.uid, 
        supervisorName: realName,
        status,
      };

      let topicId = editingDraftId;
      if (editingDraftId) {
        await updateResearchTopic(editingDraftId, newTopic);
      } else {
        topicId = await createResearchTopic(newTopic as ResearchTopicInput);
      }

      if (status === "published") {
        try {
          await notifyStudentsOfNewTopic(topicId!, newTopic.title!, newTopic.supervisorName!);
        } catch (notificationError) {
          console.error("Topic published but notifications could not be created:", notificationError);
        }
        setToastConfig({ message: "Topic published successfully!", type: "success" });
        setTimeout(() => navigate("/teacher/dashboard"), 1500);
      } else {
        setToastConfig({ message: "Draft saved successfully!", type: "success" });
        setFormData({
          title: "",
          category: "",
          description: "",
          requiredSkills: "",
          maxTeamSize: 4,
          applicationDeadline: "",
          researchObjectives: "",
        });
        setEditingDraftId(null);
        fetchDrafts();
      }
    } catch (error) {
      console.error("Error creating topic:", error);
      setToastConfig({ message: "Failed to create topic. Please try again.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToastClose = () => {
    setToastConfig(null);
  };

  return (
    <DashboardLayout role="teacher">
      {toastConfig && (
        <ToastAlert
          message={toastConfig.message}
          type={toastConfig.type}
          onClose={handleToastClose}
          duration={3000}
        />
      )}

      <div className="mx-auto max-w-6xl px-2 sm:px-4">
        {/* Header */}
        <div className="mb-10">
          <button 
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
          <br />
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-600 dark:bg-indigo-400" />
            Topic Creation
          </div>
          
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {editingDraftId ? "Edit Draft" : "Publish New Research"}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Define the problem statement, requirements, and deadline for students.
          </p>
        </div>

        {/* Form */}
        <form className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-[#2A2A2A] dark:bg-[#121212]">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Project Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., AI-Based Fall Detection System"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Max Team Size</label>
              <select
                name="maxTeamSize"
                value={formData.maxTeamSize}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white"
              >
                {[1, 2, 3, 4, 5].map((num) => (
                  <option key={num} value={num}>
                    {num} Members
                  </option>
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
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden"
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
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse justify-end gap-4 border-t border-slate-100 pt-8 sm:flex-row dark:border-[#2A2A2A]">
            {editingDraftId && (
              <button
                type="button"
                onClick={cancelEdit}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-300 dark:hover:bg-[#2A2A2A]"
              >
                <X className="h-4 w-4" /> Cancel Edit
              </button>
            )}

            <button
              type="button"
              onClick={(e) => handleSubmit(e, "draft")}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-300 dark:hover:bg-[#2A2A2A]"
            >
              <Save className="h-4 w-4" /> {editingDraftId ? "Update Draft" : "Save Draft"}
            </button>

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

        {/* Drafts Section */}
        {drafts.length > 0 && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-[#2A2A2A] dark:bg-[#121212]">
            <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">Saved Drafts</h2>
            <div className="space-y-4">
              {drafts.map((draft) => (
                <div key={draft.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-[#2A2A2A]">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{draft.title}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{draft.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleEditDraft(draft)}
                      disabled={editingDraftId === draft.id}
                      className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 dark:border-[#333] dark:bg-[#181818] dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:text-indigo-400"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>

                    <button
                      onClick={() => setDraftToDelete(draft.id)}
                      className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:border-red-500/30 dark:bg-[#181818] dark:text-red-400 dark:hover:bg-red-500/10"
                      title="Delete Draft"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        {draftToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-black/50">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#2A2A2A] dark:bg-[#121212]">
              <div className="mb-4 flex items-center gap-3 text-red-600 dark:text-red-400">
                <Trash2 className="h-6 w-6" />
                <h3 className="text-xl font-bold">Delete Draft</h3>
              </div>
              <p className="mb-6 text-slate-600 dark:text-slate-400">
                Are you sure you want to delete this draft? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDraftToDelete(null)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-[#181818] dark:text-slate-300 dark:hover:bg-[#222]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteDraft}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
