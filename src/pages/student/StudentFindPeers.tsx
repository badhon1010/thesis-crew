import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  MessageSquare, 
  Clock, 
  Send, 
  Loader2, 
  X,
  Eye,
  Edit,
  Trash2
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
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";

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
}

export default function StudentFindPeers() {
  const [posts, setPosts] = useState<PeerPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [postSkills, setPostSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [postFilter, setPostFilter] = useState<"all" | "my">("all");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  
  const [viewingPost, setViewingPost] = useState<PeerPost | null>(null);
  const [editingPost, setEditingPost] = useState<PeerPost | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setStudentProfile(docSnap.data() as StudentProfile);
          } else {
            // Fallback to auth details
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

  const removeSkill = (skillToRemove: string) => {
    setPostSkills(postSkills.filter(s => s !== skillToRemove));
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !studentProfile) {
      setToast({ type: "error", message: "You must be signed in to post." });
      return;
    }
    
    if (!postTitle.trim() || !postContent.trim()) {
      setToast({ type: "error", message: "Title and description are required." });
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
        title: postTitle.trim(),
        content: postContent.trim(),
        skills: finalSkills,
        createdAt: serverTimestamp(),
      });
      
      setToast({ type: "success", message: "Post created successfully!" });
      setPostTitle("");
      setPostContent("");
      setPostSkills([]);
      setSkillInput("");
      setPostSkills([]);
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

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteDoc(doc(db, "peerRequests", postId));
      setToast({ type: "success", message: "Post deleted successfully!" });
    } catch (err) {
      console.error("Failed to delete post:", err);
      setToast({ type: "error", message: "Failed to delete post." });
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    
    if (!editingPost.title.trim() || !editingPost.content.trim()) {
      setToast({ type: "error", message: "Title and description are required." });
      return;
    }

    let finalSkills = [...(editingPost.skills || [])];
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
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (post.skills && post.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())));
    
    if (postFilter === "my") {
      return matchesSearch && post.authorId === auth.currentUser?.uid;
    }
    return matchesSearch;
  });

  return (
    <DashboardLayout role="student">
      <div className="mx-auto max-w-6xl px-2 sm:px-4 pb-12">
        {toast && <ToastAlert type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
        
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Collaborate & Build
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tighter text-slate-900 dark:text-white">
            Find Research Peers
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Looking for teammates to work on a project or thesis? Post your requirements here and connect with students across the university.
          </p>
        </div>

        <div className="grid gap-8">
          {/* Create Post Section */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818] overflow-hidden">
            {!isCreatingPost ? (
              <div 
                className="flex items-center gap-4 p-4 sm:p-6 cursor-text"
                onClick={() => setIsCreatingPost(true)}
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold dark:bg-indigo-500/20 dark:text-indigo-300">
                  {studentProfile?.name?.charAt(0) || "S"}
                </div>
                <div className="flex-1 rounded-full bg-slate-100 px-4 py-3 text-sm text-slate-500 hover:bg-slate-200 transition-colors dark:bg-[#222222] dark:text-slate-400 dark:hover:bg-slate-800">
                  What kind of teammate are you looking for?
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitPost} className="p-4 sm:p-6 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create a Post</h2>
                  <button 
                    type="button" 
                    onClick={() => setIsCreatingPost(false)}
                    className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div>
                  <input 
                    type="text" 
                    placeholder="E.g., Looking for 1 ML Engineer for Final Year Thesis"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white dark:focus:border-indigo-500"
                    required
                    autoFocus
                  />
                </div>
                
                <div>
                  <textarea 
                    placeholder="Describe your project, what you have done so far, and what exactly you need from a new teammate..."
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={4}
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white dark:focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Required Skills (Press Enter to add)</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {postSkills.map(skill => (
                      <span key={skill} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                        {skill}
                        <button type="button" onClick={() => removeSkill(skill)} className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input 
                    type="text" 
                    placeholder="e.g. React, Python, Data Analysis..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white dark:focus:border-indigo-500"
                  />
                </div>
                
                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-[#2A2A2A]">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Post Request
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Search and Feed */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-4">
            <div className="flex h-10 items-center space-x-1 rounded-xl border border-slate-200 bg-slate-50/50 p-1 dark:border-[#2A2A2A] dark:bg-[#181818]">
              <button
                onClick={() => setPostFilter("all")}
                className={`flex h-full items-center justify-center rounded-lg px-4 whitespace-nowrap text-[13px] font-semibold transition-all ${
                  postFilter === "all" 
                    ? "bg-white text-indigo-700 shadow-sm dark:bg-[#282828] dark:text-indigo-400" 
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Explore
              </button>
              <button
                onClick={() => setPostFilter("my")}
                className={`flex h-full items-center justify-center rounded-lg px-4 whitespace-nowrap text-[13px] font-semibold transition-all ${
                  postFilter === "my" 
                    ? "bg-white text-indigo-700 shadow-sm dark:bg-[#282828] dark:text-indigo-400" 
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                My Requests
              </button>
            </div>
            
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search posts or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:focus:border-indigo-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
              <Users className="mx-auto mb-3 h-10 w-10 text-slate-400 opacity-50" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No posts found</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {searchTerm ? "No posts match your search criteria." : "Be the first to post and find a teammate!"}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredPosts.map(post => {
                const isMyPost = post.authorId === auth.currentUser?.uid;
                
                return (
                  <article 
                    key={post.id} 
                    className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md cursor-pointer dark:border-[#2A2A2A] dark:bg-[#181818]"
                    onClick={() => setViewingPost(post)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold dark:bg-slate-800 dark:text-slate-300">
                          {post.authorName?.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {post.authorName || "Unknown Student"}
                            {isMyPost && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">You</span>}
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
                            onClick={() => handleDeletePost(post.id)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition dark:hover:bg-slate-800 dark:hover:text-red-400"
                            title="Delete Post"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{post.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                        {post.content}
                      </p>
                    </div>
                    
                    {post.skills && post.skills.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {post.skills.map((skill, i) => (
                          <span key={i} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-[#222222] dark:text-slate-300">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {!isMyPost && (
                      <div className="mt-5 border-t border-slate-100 pt-4 flex justify-end dark:border-[#2A2A2A]" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/student/messages?userId=${post.authorId}&name=${encodeURIComponent(post.authorName || "Peer")}`;
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setViewingPost(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-[#181818] dark:border dark:border-[#2A2A2A]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{viewingPost.title}</h2>
              <button onClick={() => setViewingPost(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-6">
               <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold dark:bg-slate-800 dark:text-slate-300">
                 {viewingPost.authorName?.charAt(0) || "U"}
               </div>
               <div>
                 <p className="font-semibold text-slate-900 dark:text-white">{viewingPost.authorName}</p>
                 <p className="text-xs text-slate-500">{viewingPost.authorDepartment} • {formatTimeAgo(viewingPost.createdAt)}</p>
               </div>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300 mb-6">{viewingPost.content}</p>
            {viewingPost.skills && viewingPost.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {viewingPost.skills.map(s => <span key={s} className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{s}</span>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-[#181818] dark:border dark:border-[#2A2A2A] my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Post</h2>
              <button onClick={() => setEditingPost(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdatePost} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
                <input 
                  type="text" 
                  value={editingPost.title}
                  onChange={(e) => setEditingPost({...editingPost, title: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
                  required
                />
              </div>
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
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Skills (Press Enter to add)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editingPost.skills.map(skill => (
                    <span key={skill} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      {skill}
                      <button type="button" onClick={() => setEditingPost({...editingPost, skills: editingPost.skills.filter(s => s !== skill)})} className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200">
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
                />
              </div>
              <div className="flex justify-end pt-4 gap-2 border-t border-slate-100 dark:border-[#2A2A2A] mt-6">
                <button type="button" onClick={() => setEditingPost(null)} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#222222] transition">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
