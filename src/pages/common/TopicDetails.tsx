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
  Send,
  X,
  FileText,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import {
  getResearchTopicById,
  type ResearchTopic,
} from "@/firebase/researchTopics";
import {
  createApplication,
  getStudentApplicationForTopic,
  type Application,
} from "@/firebase/applications";

function checkIsDeadlinePassed(deadlineStr: string | undefined | null): boolean {
  if (!deadlineStr) return false;
  const deadlineDate = new Date(deadlineStr);
  if (isNaN(deadlineDate.getTime())) return false;
  // Set deadline to end of that specified day (23:59:59.999)
  deadlineDate.setHours(23, 59, 59, 999);
  return new Date() > deadlineDate;
}

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

  // Student auth & application states
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [studentProfile, setStudentProfile] = useState<{
    name: string;
    email: string;
    studentId: string;
  }>({ name: "", email: "", studentId: "" });
  
  const [existingApp, setExistingApp] = useState<Application | null>(null);
  const [checkingAppStatus, setCheckingAppStatus] = useState(false);

  // Modal & form states
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [motivation, setMotivation] = useState("");
  const [submittingApp, setSubmittingApp] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

  // Fetch topic details
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

  // Auth observer and existing application check for student
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user && !isTeacher && id) {
        setCheckingAppStatus(true);
        try {
          // Fetch student Firestore profile
          const userDocSnap = await getDoc(doc(db, "users", user.uid));
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setStudentProfile({
              name: userData.name || user.displayName || "Student",
              email: userData.email || user.email || "",
              studentId: userData.studentId || "",
            });
          } else {
            setStudentProfile({
              name: user.displayName || user.email?.split("@")[0] || "Student",
              email: user.email || "",
              studentId: "",
            });
          }

          // Check if student already applied
          const app = await getStudentApplicationForTopic(user.uid, id);
          setExistingApp(app);
        } catch (err) {
          console.error("Error checking student application status:", err);
        } finally {
          setCheckingAppStatus(false);
        }
      }
    });

    return () => unsubscribe();
  }, [id, isTeacher]);

  const deadlinePassed = checkIsDeadlinePassed(topic?.applicationDeadline);

  const handleOpenApplyModal = () => {
    if (!currentUser) {
      showToast("error", "You must be logged in as a student to apply.");
      return;
    }
    if (topic?.status !== "published") {
      showToast("error", "This research topic is not currently open for applications.");
      return;
    }
    if (deadlinePassed) {
      showToast("error", "The application deadline has passed.");
      return;
    }
    if (existingApp && existingApp.status === "pending") {
      showToast("error", "You have already applied to this topic.");
      return;
    }

    setModalError(null);
    setMotivation("");
    setIsApplyModalOpen(true);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!currentUser) {
      setModalError("You must be logged in to apply.");
      return;
    }
    if (!topic) {
      setModalError("Topic details missing.");
      return;
    }
    if (topic.status !== "published") {
      setModalError("This research topic is not currently open for applications.");
      return;
    }
    if (checkIsDeadlinePassed(topic.applicationDeadline)) {
      setModalError("The application deadline has passed.");
      return;
    }
    if (!motivation.trim()) {
      setModalError("Please write a short motivation or statement of purpose.");
      return;
    }

    setSubmittingApp(true);

    try {
      // Re-verify existing application before submitting to prevent duplicates
      const latestApp = await getStudentApplicationForTopic(currentUser.uid, topic.id);
      if (latestApp && latestApp.status === "pending") {
        setModalError("You have already applied to this topic.");
        setExistingApp(latestApp);
        setSubmittingApp(false);
        return;
      }

      await createApplication({
        studentId: studentProfile.studentId || "N/A",
        studentName: studentProfile.name || currentUser.displayName || "Student",
        studentEmail: studentProfile.email || currentUser.email || "",
        studentUid: currentUser.uid,
        topicId: topic.id,
        topicTitle: topic.title,
        supervisorId: topic.supervisorId || "",
        supervisorName: topic.supervisorName || "Supervisor",
        motivation: motivation.trim(),
        status: "pending",
      });

      // Reload application state
      const updatedApp = await getStudentApplicationForTopic(currentUser.uid, topic.id);
      setExistingApp(updatedApp || {
        id: "temp",
        studentId: studentProfile.studentId,
        studentName: studentProfile.name,
        studentEmail: studentProfile.email,
        studentUid: currentUser.uid,
        topicId: topic.id,
        topicTitle: topic.title,
        supervisorId: topic.supervisorId,
        supervisorName: topic.supervisorName,
        motivation: motivation.trim(),
        status: "pending",
      });

      setIsApplyModalOpen(false);
      showToast("success", "Application submitted successfully.");
    } catch (err: any) {
      console.error("Failed to submit application:", err);
      setModalError(err.message || "Failed to submit application. Please try again.");
    } finally {
      setSubmittingApp(false);
    }
  };

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
      <ToastAlert
        show={toast.show}
        type={toast.type}
        message={toast.message}
        duration={3500}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />

      <div className="mx-auto max-w-4xl px-2 sm:px-0">
        
        {/* Back Link & Header Actions */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate(backPath)}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Topics
          </button>

          {/* Role Actions */}
          {isTeacher ? (
            <Link
              to={`/teacher/topics/edit/${topic.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 dark:border dark:border-indigo-500/50 dark:shadow-[0_0_20px_rgba(79,70,229,0.3)]"
            >
              <Edit className="h-4 w-4" /> Edit Topic
            </Link>
          ) : (
            <div>
              {checkingAppStatus ? (
                <button
                  disabled
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-400 dark:bg-[#2A2A2A] dark:text-slate-500"
                >
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking status...
                </button>
              ) : existingApp && existingApp.status === "pending" ? (
                <button
                  type="button"
                  onClick={() => showToast("success", "Your application is currently pending review.")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 transition-all hover:bg-amber-100/60 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25 cursor-pointer"
                >
                  <Clock3 className="h-4 w-4" /> Application Pending
                </button>
              ) : deadlinePassed ? (
                <button
                  disabled
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-400 opacity-80 cursor-not-allowed"
                >
                  Application Deadline Passed
                </button>
              ) : topic.status !== "published" ? (
                <button
                  disabled
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-400 opacity-80 cursor-not-allowed"
                >
                  Topic Not Published
                </button>
              ) : (
                <button
                  onClick={handleOpenApplyModal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 active:scale-95 dark:border dark:border-indigo-500/50 dark:shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                >
                  <Send className="h-4 w-4" /> Apply to Join
                </button>
              )}
            </div>
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

      {/* Application Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-[#2A2A2A] dark:bg-[#121212] sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-[#2A2A2A]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Apply to Research Topic</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Submit your application to the supervisor.</p>
                </div>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-[#222222] dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="mt-6 space-y-4">
              {/* Read-Only Info Fields */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Research Topic</label>
                <input
                  type="text"
                  readOnly
                  value={topic.title}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-200 cursor-not-allowed"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Applicant Name</label>
                  <input
                    type="text"
                    readOnly
                    value={studentProfile.name || currentUser?.displayName || "Student"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-200 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Student ID</label>
                  <input
                    type="text"
                    readOnly
                    value={studentProfile.studentId || "Not specified in profile"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-200 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Email Address</label>
                <input
                  type="text"
                  readOnly
                  value={studentProfile.email || currentUser?.email || ""}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-200 cursor-not-allowed"
                />
              </div>

              {/* Statement of Purpose / Motivation */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Motivation / Statement of Purpose <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="Explain why you are interested in this topic, your relevant skills, and your academic goals..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-[#2A2A2A]">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-300 dark:hover:bg-[#222222]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApp}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 disabled:opacity-50 dark:border dark:border-indigo-500/50"
                >
                  {submittingApp ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Submit Application
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
