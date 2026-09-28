import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  MessageSquare, 
  Clock, 
  Send, 
  Loader2, 
  X, 
  Edit, 
  Trash2,
  GraduationCap,
  Laptop,
  Sparkles,
  BookOpen,
  Check,
  FileText,
  Plus,
  User
} from "lucide-react";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { StudentProfileModal } from "@/components/common/StudentProfileModal";
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";
import { UserAvatar } from "@/components/common/UserAvatar";

interface StudentProfile {
  name?: string;
  email?: string;
  department?: string;
  photoURL?: string;
}

interface PeerPost {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorDepartment: string;
  title: string;
  content: string;
  skills: string[];
  createdAt: any;
  targetPhase?: string;
  membersNeeded?: string;
  domain?: string;
  workMode?: string;
  commitment?: string;
}

const FYDP_PHASES = [
  "FYDP I",
  "FYDP II",
  "FYDP III",
  "Thesis / Capstone",
  "Independent Research",
];

const MEMBER_OPTIONS = [
  "1 Member",
  "2 Members",
  "3 Members",
  "4+ Members",
];

const DOMAIN_OPTIONS = [
  "Artificial Intelligence & Machine Learning",
  "Computer Vision & Deep Learning",
  "Natural Language Processing (NLP) / LLMs",
  "Web & Mobile App Development",
  "Data Science & Big Data",
  "Cybersecurity & Privacy",
  "Internet of Things (IoT) & Robotics",
  "Cloud & Distributed Systems",
  "Bioinformatics & Health Tech",
  "Blockchain & Cryptography",
  "Software Engineering & System Design",
  "Other / Interdisciplinary",
];

const WORK_MODES = [
  "Hybrid",
  "On-Campus",
  "Remote",
];

const COMMITMENT_OPTIONS = [
  "Flexible (~5-10 hrs/wk)",
  "Moderate (~10-15 hrs/wk)",
  "Dedicated (~15-20+ hrs/wk)",
];

const SUGGESTED_SKILLS = [
  "Python", "PyTorch", "TensorFlow", "React", "Node.js", 
  "TypeScript", "Next.js", "FastAPI", "Tailwind CSS", "Data Analysis", 
  "Docker", "Figma", "LaTeX", "SQL", "OpenCV", "NLP"
];

export default function StudentFindPeers() {
  const [posts, setPosts] = useState<PeerPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  
  // Create Post Form States
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [targetPhase, setTargetPhase] = useState("FYDP I");
  const [membersNeeded, setMembersNeeded] = useState("1 Member");
  const [domain, setDomain] = useState("Artificial Intelligence & Machine Learning");
  const [workMode, setWorkMode] = useState("Hybrid");
  const [commitment, setCommitment] = useState("Moderate (~10-15 hrs/wk)");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [postSkills, setPostSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [postFilter, setPostFilter] = useState<"all" | "my">("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  
  // Alerts and Modals
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingPost, setViewingPost] = useState<PeerPost | null>(null);
  const [editingPost, setEditingPost] = useState<PeerPost | null>(null);
  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setStudentProfile(docSnap.data() as StudentProfile);
          } else {
            setStudentProfile({
              name: user.displayName || "Student",
              email: user.email || "",
            });
          }
        } catch (err) {
          console.error("Failed to load user profile:", err);
        }
      } else {
        setStudentProfile(null);
      }
    });

    const q = query(collection(db, "peerRequests"), orderBy("createdAt", "desc"));
    const unsubscribePosts = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PeerPost));
      setPosts(fetchedPosts);
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch peer posts:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribePosts();
    };
  }, []);

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newSkill = skillInput.trim();
      if (newSkill) {
        const skillsToAdd = newSkill.split(',').map(s => s.trim()).filter(s => s && !postSkills.includes(s));
        if (skillsToAdd.length > 0) {
          setPostSkills([...postSkills, ...skillsToAdd]);
        }
        setSkillInput("");
      }
    }
  };

  const toggleSuggestedSkill = (skill: string) => {
    if (postSkills.includes(skill)) {
      setPostSkills(postSkills.filter(s => s !== skill));
    } else {
      setPostSkills([...postSkills, skill]);
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setPostSkills(postSkills.filter(s => s !== skillToRemove));
  };

  const handleAutoGenerateTitle = () => {
    const generated = `Looking for ${membersNeeded} for ${targetPhase} (${domain})`;
    setPostTitle(generated);
  };

  const handleInsertTemplateOutline = () => {
    const templateText = 
`• Project Objective: 
• Current Progress & Tools: 
• Teammate's Role & Responsibilities: 
• Preferred Background & Interest: `;

    if (!postContent.trim()) {
      setPostContent(templateText);
    } else {
      setPostContent(prev => prev + "\n\n" + templateText);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !studentProfile) {
      setToast({ type: "error", message: "You must be signed in to post." });
      return;
    }
    
    const finalTitle = postTitle.trim() || `Looking for ${membersNeeded} for ${targetPhase} (${domain})`;
    if (!postContent.trim()) {
      setToast({ type: "error", message: "Please provide a description of your project and requirements." });
      return;
    }

    const finalSkills = [...postSkills];
    const pendingSkill = skillInput.trim();
    if (pendingSkill) {
      const pendingToAdd = pendingSkill.split(',').map(s => s.trim()).filter(s => s && !finalSkills.includes(s));
      finalSkills.push(...pendingToAdd);
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "peerRequests"), {
        authorId: auth.currentUser.uid,
        authorName: studentProfile.name || auth.currentUser.displayName || "Anonymous Student",
        authorEmail: studentProfile.email || auth.currentUser.email || "",
        authorDepartment: studentProfile.department || "Unknown Department",
        title: finalTitle,
        content: postContent.trim(),
        skills: finalSkills,
        targetPhase,
        membersNeeded,
        domain,
        workMode,
        commitment,
        createdAt: serverTimestamp(),
      });
      
      setToast({ type: "success", message: "Peer recruitment post published successfully!" });
      setPostTitle("");
      setPostContent("");
      setPostSkills([]);
      setSkillInput("");
      setIsCreatingPost(false);
    } catch (error) {
      console.error("Error creating post:", error);
      setToast({ type: "error", message: "Failed to create post. Try again later." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return "Just now";
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };

  const confirmDeletePost = async () => {
    if (!deletePostId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "peerRequests", deletePostId));
      setToast({ type: "success", message: "Post deleted successfully!" });
    } catch (err) {
      console.error("Failed to delete post:", err);
      setToast({ type: "error", message: "Failed to delete post." });
    } finally {
      setIsDeleting(false);
      setDeletePostId(null);
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    
    if (!editingPost.title.trim() || !editingPost.content.trim()) {
      setToast({ type: "error", message: "Title and description are required." });
      return;
    }

    const finalSkills = [...(editingPost.skills || [])];
    const editSkillInputElem = document.getElementById('editSkillInput') as HTMLInputElement;
    if (editSkillInputElem) {
      const pendingSkill = editSkillInputElem.value.trim();
      if (pendingSkill) {
        const pendingToAdd = pendingSkill.split(',').map(s => s.trim()).filter(s => s && !finalSkills.includes(s));
        finalSkills.push(...pendingToAdd);
      }
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "peerRequests", editingPost.id), {
        title: editingPost.title.trim(),
        content: editingPost.content.trim(),
        skills: finalSkills,
        targetPhase: editingPost.targetPhase || "FYDP I",
        membersNeeded: editingPost.membersNeeded || "1 Member",
        domain: editingPost.domain || "Other / Interdisciplinary",
        workMode: editingPost.workMode || "Hybrid",
        commitment: editingPost.commitment || "Moderate (~10-15 hrs/wk)",
      });
      setToast({ type: "success", message: "Post updated successfully!" });
      setEditingPost(null);
    } catch (err) {
      console.error("Error updating post:", err);
      setToast({ type: "error", message: "Failed to update post." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (post.domain && post.domain.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.targetPhase && post.targetPhase.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.skills && post.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())));
    
    if (postFilter === "my" && post.authorId !== auth.currentUser?.uid) {
      return false;
    }

    if (phaseFilter !== "all") {
      if (phaseFilter === "Other") {
        if (post.targetPhase && ["FYDP I", "FYDP II", "FYDP III"].includes(post.targetPhase)) {
          return false;
        }
      } else {
        if (post.targetPhase !== phaseFilter) {
          return false;
        }
      }
    }

    return matchesSearch;
  });

  return (
    <DashboardLayout role="student">
      <div className="mx-auto max-w-6xl px-2 sm:px-4 pb-12">
        {toast && <ToastAlert type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
        
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
            <Users className="h-3.5 w-3.5" />
            <span>Peer Recruitment & Collaboration</span>
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Find Research & Thesis Peers
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Looking for members for FYDP I, II, III or thesis research? Select your criteria using our structured template or explore open requests from peers.
          </p>
        </div>

        <div className="grid gap-8">
          {/* Create Post Section: Template-Based Redesign */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818] overflow-hidden transition-all">
            {!isCreatingPost ? (
              <div 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-[#1c1c1c] transition-colors"
                onClick={() => setIsCreatingPost(true)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <UserAvatar 
                    userId={auth.currentUser?.uid} 
                    name={studentProfile?.name} 
                    photoURL={studentProfile?.photoURL}
                    className="h-11 w-11 text-base shadow-sm ring-2 ring-indigo-500/20"
                  />
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                      Need teammates for FYDP I, II, III or Research?
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Click to use the quick template: select members count, phase, domain, and skills.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCreatingPost(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Team Post</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitPost} className="p-5 sm:p-7 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-[#2A2A2A]">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="h-4 w-4" />
                      <span>Post Template</span>
                    </div>
                    <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                      Recruitment Post Builder
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Choose your project details by clicking the options below to quickly attract matching teammates.
                    </p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setIsCreatingPost(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 1. Target Phase Selection */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    <GraduationCap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Which Project / FYDP Phase are you recruiting for? <span className="text-rose-500">*</span></span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {FYDP_PHASES.map((phase) => {
                      const isSelected = targetPhase === phase;
                      return (
                        <button
                          key={phase}
                          type="button"
                          onClick={() => setTargetPhase(phase)}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300 ring-2 ring-indigo-500/20"
                              : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-slate-300 dark:hover:bg-[#1a1a1a]"
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                          <span className="truncate">{phase}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Template Dropdowns: Members Needed & Research Domain */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* How Many Members? */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>How many members needed? <span className="text-rose-500">*</span></span>
                    </label>
                    <select
                      value={membersNeeded}
                      onChange={(e) => setMembersNeeded(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
                    >
                      {MEMBER_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt} needed
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Research Field / Domain */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Research Domain / Field <span className="text-rose-500">*</span></span>
                    </label>
                    <select
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
                    >
                      {DOMAIN_OPTIONS.map((dom) => (
                        <option key={dom} value={dom}>
                          {dom}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Work Mode & Weekly Commitment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Work Mode */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      <Laptop className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Collaboration Mode</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {WORK_MODES.map((mode) => {
                        const isSelected = workMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setWorkMode(mode)}
                            className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-50/80 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
                                : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-slate-400"
                            }`}
                          >
                            {mode}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Weekly Commitment */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Expected Time Commitment</span>
                    </label>
                    <select
                      value={commitment}
                      onChange={(e) => setCommitment(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
                    >
                      {COMMITMENT_OPTIONS.map((com) => (
                        <option key={com} value={com}>
                          {com}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Post Title (With Auto-generate shortcut) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Post Title <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateTitle}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                      title="Generate a clear title from the selected template options"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Auto-generate from template</span>
                    </button>
                  </div>
                  <input 
                    type="text" 
                    placeholder={`e.g. Looking for ${membersNeeded} for ${targetPhase} (${domain})`}
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
                    required
                  />
                </div>

                {/* 5. Required Skills Section (Kept & Enhanced with 1-click popular suggestions) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Required Skills & Technologies
                    </label>
                    <span className="text-[11px] text-slate-400">Type & press Enter, or click suggested chips</span>
                  </div>

                  {/* Selected skills pills */}
                  {postSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {postSkills.map(skill => (
                        <span 
                          key={skill} 
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-500/20"
                        >
                          {skill}
                          <button 
                            type="button" 
                            onClick={() => removeSkill(skill)} 
                            className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Skill text input */}
                  <input 
                    type="text" 
                    placeholder="Type a skill and press Enter (e.g. FastApi, Docker, OpenCV)..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
                  />

                  {/* Quick-click suggested skills */}
                  <div className="mt-2.5">
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">
                      Click to quickly add/remove skills:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTED_SKILLS.map(skill => {
                        const isAdded = postSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleSuggestedSkill(skill)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                              isAdded
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#222222] dark:text-slate-300 dark:hover:bg-[#2c2c2c]"
                            }`}
                          >
                            {isAdded ? `✓ ${skill}` : `+ ${skill}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 6. Description Box (With template outline injection) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Project Description & Requirements <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleInsertTemplateOutline}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Insert template outline</span>
                    </button>
                  </div>
                  <textarea 
                    placeholder="Describe your project, current progress, specific responsibilities for the teammate, and what kind of commitment or background you are expecting..."
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={5}
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white font-normal"
                    required
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#2A2A2A]">
                  <button 
                    type="button"
                    onClick={() => setIsCreatingPost(false)}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#222222] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span>Publish Recruitment Post</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Main Tabs (Explore vs My Requests) */}
              <div className="flex h-10 items-center space-x-1 rounded-xl border border-slate-200 bg-slate-50/50 p-1 dark:border-[#2A2A2A] dark:bg-[#181818] self-start">
                <button
                  onClick={() => setPostFilter("all")}
                  className={`flex h-full items-center justify-center rounded-lg px-4 whitespace-nowrap text-[13px] font-semibold transition-all ${
                    postFilter === "all" 
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-[#282828] dark:text-indigo-400" 
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Explore All ({posts.length})
                </button>
                <button
                  onClick={() => setPostFilter("my")}
                  className={`flex h-full items-center justify-center rounded-lg px-4 whitespace-nowrap text-[13px] font-semibold transition-all ${
                    postFilter === "my" 
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-[#282828] dark:text-indigo-400" 
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  My Requests ({posts.filter(p => p.authorId === auth.currentUser?.uid).length})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title, skills, domain, FYDP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Quick FYDP Stage Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="font-semibold text-slate-400 dark:text-slate-500 shrink-0">Phase:</span>
              {[
                { id: "all", label: "All Phases" },
                { id: "FYDP I", label: "FYDP I" },
                { id: "FYDP II", label: "FYDP II" },
                { id: "FYDP III", label: "FYDP III" },
                { id: "Other", label: "Thesis / Other" }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setPhaseFilter(item.id)}
                  className={`rounded-full px-3 py-1 font-medium transition-all shrink-0 ${
                    phaseFilter === item.id
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#222222] dark:text-slate-400 dark:hover:bg-[#2c2c2c]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Posts Feed */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
              <Users className="mx-auto mb-3 h-10 w-10 text-slate-400 opacity-50" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No peer requests found</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {searchTerm || phaseFilter !== "all" 
                  ? "No posts match your filters. Try clearing your search." 
                  : "Be the first to post using the template above and connect with teammates!"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map(post => {
                const isMyPost = post.authorId === auth.currentUser?.uid;
                
                return (
                  <article 
                    key={post.id} 
                    className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md cursor-pointer dark:border-[#2A2A2A] dark:bg-[#181818]"
                    onClick={() => setViewingPost(post)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudentProfileId(post.authorId);
                          }}
                          title="View Author Profile"
                        >
                          <UserAvatar 
                            userId={post.authorId} 
                            name={post.authorName || "Unknown Student"} 
                            className="h-10 w-10 text-sm shadow-2xs"
                          />
                        </div>
                        <div>
                          <p 
                            className="font-semibold text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudentProfileId(post.authorId);
                            }}
                            title="View Author Profile"
                          >
                            <span>{post.authorName || "Unknown Student"}</span>
                            {isMyPost && <span className="ml-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">You</span>}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>{post.authorDepartment}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(post.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {isMyPost && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => setEditingPost({ ...post, skills: post.skills || [] })}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                            title="Edit Post"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => setDeletePostId(post.id)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition dark:hover:bg-slate-800 dark:hover:text-red-400"
                            title="Delete Post"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Template Badges Row */}
                    {(post.targetPhase || post.membersNeeded || post.domain || post.workMode) && (
                      <div className="mt-3.5 flex flex-wrap gap-2 items-center">
                        {post.targetPhase && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40">
                            <GraduationCap className="h-3.5 w-3.5" />
                            {post.targetPhase}
                          </span>
                        )}
                        {post.membersNeeded && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/40">
                            <Users className="h-3.5 w-3.5" />
                            {post.membersNeeded} needed
                          </span>
                        )}
                        {post.domain && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-100 dark:border-amber-800/40">
                            <BookOpen className="h-3.5 w-3.5" />
                            {post.domain}
                          </span>
                        )}
                        {post.workMode && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border border-sky-100 dark:border-sky-800/40">
                            <Laptop className="h-3.5 w-3.5" />
                            {post.workMode}
                          </span>
                        )}
                        {post.commitment && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <Clock className="h-3 w-3" />
                            {post.commitment}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Title & Description */}
                    <div className="mt-3.5">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                        {post.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap line-clamp-3">
                        {post.content}
                      </p>
                    </div>
                    
                    {/* Skills */}
                    {post.skills && post.skills.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {post.skills.map((skill, i) => (
                          <span key={i} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-[#222222] dark:text-slate-300">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Actions */}
                    {!isMyPost && (
                      <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-end gap-2 dark:border-[#2A2A2A]" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudentProfileId(post.authorId);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-600 transition dark:border-[#2E2E2E] dark:bg-[#202020] dark:text-slate-200 dark:hover:bg-[#282828] dark:hover:text-indigo-400 shadow-2xs"
                        >
                          <User className="h-4 w-4 text-indigo-500" />
                          <span>View Profile</span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/student/messages?userId=${post.authorId}&name=${encodeURIComponent(post.authorName || "Peer")}`;
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-xs sm:text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Message Author
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* View Post Modal */}
      {viewingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" onClick={() => setViewingPost(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-7 shadow-2xl dark:bg-[#181818] dark:border dark:border-[#2A2A2A] my-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white pr-4">{viewingPost.title}</h2>
              <button onClick={() => setViewingPost(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Author info */}
            <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-[#2A2A2A]">
               <div className="flex items-center gap-3">
                 <div
                   className="cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                   onClick={() => setSelectedStudentProfileId(viewingPost.authorId)}
                   title="View Author Profile"
                 >
                   <UserAvatar 
                     userId={viewingPost.authorId} 
                     name={viewingPost.authorName || "Unknown Student"} 
                     className="h-11 w-11 text-base shadow-2xs"
                   />
                 </div>
                 <div>
                   <p 
                     className="font-semibold text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                     onClick={() => setSelectedStudentProfileId(viewingPost.authorId)}
                     title="View Author Profile"
                   >
                     {viewingPost.authorName}
                   </p>
                   <p className="text-xs text-slate-500">{viewingPost.authorDepartment} • {formatTimeAgo(viewingPost.createdAt)}</p>
                 </div>
               </div>

               <button
                 type="button"
                 onClick={() => setSelectedStudentProfileId(viewingPost.authorId)}
                 className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-600 transition dark:border-[#2E2E2E] dark:bg-[#202020] dark:text-slate-200 dark:hover:bg-[#282828] dark:hover:text-indigo-400 shadow-2xs"
               >
                 <User className="h-3.5 w-3.5 text-indigo-500" />
                 <span>View Profile</span>
               </button>
            </div>

            {/* Template Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 mb-5 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-100 dark:border-[#242424]">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Target Phase</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{viewingPost.targetPhase || "Not specified"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Members Needed</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{viewingPost.membersNeeded || "Not specified"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Work Mode</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{viewingPost.workMode || "Hybrid"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Commitment</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{viewingPost.commitment || "Flexible"}</p>
              </div>
              {viewingPost.domain && (
                <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Research Domain</p>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">{viewingPost.domain}</p>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Description & Expectations</h4>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300 bg-white dark:bg-[#181818]">{viewingPost.content}</p>
            </div>

            {/* Skills */}
            {viewingPost.skills && viewingPost.skills.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Required Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {viewingPost.skills.map(s => (
                    <span key={s} className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Footer action */}
            {viewingPost.authorId !== auth.currentUser?.uid && (
              <div className="pt-4 border-t border-slate-100 dark:border-[#2A2A2A] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentProfileId(viewingPost.authorId)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-600 transition dark:border-[#2E2E2E] dark:bg-[#202020] dark:text-slate-200 dark:hover:bg-[#282828] dark:hover:text-indigo-400 shadow-2xs"
                >
                  <User className="h-4 w-4 text-indigo-500" />
                  <span>View Profile</span>
                </button>
                <button 
                  onClick={() => {
                    window.location.href = `/student/messages?userId=${viewingPost.authorId}&name=${encodeURIComponent(viewingPost.authorName || "Peer")}`;
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Message Author</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Post Modal with Template Options */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-7 shadow-2xl dark:bg-[#181818] dark:border dark:border-[#2A2A2A] my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-[#2A2A2A]">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Recruitment Post</h2>
              <button onClick={() => setEditingPost(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdatePost} className="space-y-4">
              {/* Target Phase */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">FYDP / Project Phase</label>
                <select
                  value={editingPost.targetPhase || "FYDP I"}
                  onChange={(e) => setEditingPost({ ...editingPost, targetPhase: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
                >
                  {FYDP_PHASES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Members Needed & Domain */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Members Needed</label>
                  <select
                    value={editingPost.membersNeeded || "1 Member"}
                    onChange={(e) => setEditingPost({ ...editingPost, membersNeeded: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
                  >
                    {MEMBER_OPTIONS.map(m => (
                      <option key={m} value={m}>{m} needed</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Research Domain</label>
                  <select
                    value={editingPost.domain || "Other / Interdisciplinary"}
                    onChange={(e) => setEditingPost({ ...editingPost, domain: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
                  >
                    {DOMAIN_OPTIONS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Work Mode & Commitment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Work Mode</label>
                  <select
                    value={editingPost.workMode || "Hybrid"}
                    onChange={(e) => setEditingPost({ ...editingPost, workMode: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
                  >
                    {WORK_MODES.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Commitment</label>
                  <select
                    value={editingPost.commitment || "Moderate (~10-15 hrs/wk)"}
                    onChange={(e) => setEditingPost({ ...editingPost, commitment: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
                  >
                    {COMMITMENT_OPTIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
                <input 
                  type="text" 
                  value={editingPost.title}
                  onChange={(e) => setEditingPost({...editingPost, title: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                <textarea 
                  value={editingPost.content}
                  onChange={(e) => setEditingPost({...editingPost, content: e.target.value})}
                  rows={5}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
                  required
                />
              </div>

              {/* Skills */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Skills (Press Enter to add)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(editingPost.skills || []).map(skill => (
                    <span key={skill} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      {skill}
                      <button 
                        type="button" 
                        onClick={() => setEditingPost({...editingPost, skills: editingPost.skills.filter(s => s !== skill)})} 
                        className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <input 
                  id="editSkillInput"
                  type="text" 
                  placeholder="e.g. React, Python, Data Analysis..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) {
                        const skillsToAdd = val.split(',').map(s => s.trim()).filter(s => s && !editingPost.skills.includes(s));
                        if (skillsToAdd.length > 0) {
                          setEditingPost({...editingPost, skills: [...editingPost.skills, ...skillsToAdd]});
                        }
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
                />
              </div>

              <div className="flex justify-end pt-4 gap-2 border-t border-slate-100 dark:border-[#2A2A2A] mt-6">
                <button 
                  type="button" 
                  onClick={() => setEditingPost(null)} 
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#222222] transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletePostId}
        onClose={() => setDeletePostId(null)}
        onConfirm={confirmDeletePost}
        title="Delete Post"
        description="Are you sure you want to delete this recruitment post? This action cannot be undone."
        confirmText="Yes, delete"
        isLoading={isDeleting}
      />

      {/* Author Profile Modal */}
      {selectedStudentProfileId && (
        <StudentProfileModal
          isOpen={!!selectedStudentProfileId}
          studentId={selectedStudentProfileId}
          onClose={() => setSelectedStudentProfileId(null)}
          hideCgpa={true}
        />
      )}
    </DashboardLayout>
  );
}
