import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  doc, 
  updateDoc, 
  increment 
} from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { UserAvatar } from "@/components/common/UserAvatar";
import { 
  MessageCircle, 
  Reply, 
  Trash2, 
  Send, 
  Loader2, 
  X, 
  Sparkles, 
  CornerDownRight 
} from "lucide-react";

export interface PeerComment {
  id: string;
  authorId: string;
  authorName: string;
  authorDepartment?: string;
  authorPhotoURL?: string;
  content: string;
  createdAt: any;
  parentId?: string | null;
  replyToName?: string;
}

interface PeerPostCommentsProps {
  postId: string;
  postAuthorId: string;
  currentUser: {
    uid: string;
    name: string;
    department?: string;
    photoURL?: string;
  } | null;
  onViewProfile?: (studentId: string) => void;
  compact?: boolean;
}

export function PeerPostComments({
  postId,
  postAuthorId,
  currentUser,
  onViewProfile,
  compact = false,
}: PeerPostCommentsProps) {
  const [comments, setComments] = useState<PeerComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Replying state
  const [replyingToComment, setReplyingToComment] = useState<PeerComment | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Deleting state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);

    const q = query(
      collection(db, "peerRequests", postId, "comments"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as PeerComment[];
      setComments(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching comments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId]);

  const formatCommentTime = (timestamp: any) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentUser || isSubmitting) return;

    const text = newCommentText.trim();
    setIsSubmitting(true);
    setNewCommentText("");

    try {
      await addDoc(collection(db, "peerRequests", postId, "comments"), {
        authorId: currentUser.uid,
        authorName: currentUser.name || "Student",
        authorDepartment: currentUser.department || "Student",
        authorPhotoURL: currentUser.photoURL || "",
        content: text,
        createdAt: serverTimestamp(),
        parentId: null,
      });

      // Update post comments count
      await updateDoc(doc(db, "peerRequests", postId), {
        commentsCount: increment(1),
      });
    } catch (err) {
      console.error("Failed to add comment:", err);
      setNewCommentText(text); // restore on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (parentComment: PeerComment) => {
    if (!replyText.trim() || !currentUser || isSubmittingReply) return;

    const text = replyText.trim();
    setIsSubmittingReply(true);

    try {
      await addDoc(collection(db, "peerRequests", postId, "comments"), {
        authorId: currentUser.uid,
        authorName: currentUser.name || "Student",
        authorDepartment: currentUser.department || "Student",
        authorPhotoURL: currentUser.photoURL || "",
        content: text,
        createdAt: serverTimestamp(),
        parentId: parentComment.id,
        replyToName: parentComment.authorName,
      });

      // Update post comments count
      await updateDoc(doc(db, "peerRequests", postId), {
        commentsCount: increment(1),
      });

      setReplyText("");
      setReplyingToComment(null);
    } catch (err) {
      console.error("Failed to add reply:", err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (deletingId) return;
    setDeletingId(commentId);

    try {
      await deleteDoc(doc(db, "peerRequests", postId, "comments", commentId));

      // Decrement post comments count
      await updateDoc(doc(db, "peerRequests", postId), {
        commentsCount: increment(-1),
      });
    } catch (err) {
      console.error("Failed to delete comment:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Group top-level comments and nested replies
  const rootComments = comments.filter((c) => !c.parentId);
  const repliesByParentId: Record<string, PeerComment[]> = {};
  comments.forEach((c) => {
    if (c.parentId) {
      if (!repliesByParentId[c.parentId]) {
        repliesByParentId[c.parentId] = [];
      }
      repliesByParentId[c.parentId].push(c);
    }
  });

  return (
    <div className={`space-y-4 ${compact ? "pt-2" : "pt-4"}`} onClick={(e) => e.stopPropagation()}>
      
      {/* Header title & count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Discussion & Q&A ({comments.length})
          </h4>
        </div>
        <span className="text-[11px] text-slate-400">Ask questions or discuss collaboration</span>
      </div>

      {/* New Top-Level Comment Input */}
      <form onSubmit={handleAddComment} className="flex gap-2.5 items-start">
        <UserAvatar
          userId={currentUser?.uid || ""}
          name={currentUser?.name || "Student"}
          photoURL={currentUser?.photoURL}
          className="h-8 w-8 sm:h-9 sm:w-9 text-xs shrink-0 mt-0.5"
        />
        <div className="flex-1 relative">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Write a public comment or question for the author..."
            rows={2}
            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs sm:text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-[#2A2A2A] dark:bg-[#161616] dark:text-white dark:focus:border-indigo-500 resize-none font-normal"
          />
          <div className="flex justify-end mt-1.5">
            <button
              type="submit"
              disabled={!newCommentText.trim() || isSubmitting || !currentUser}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-indigo-500 disabled:opacity-40"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>Comment</span>
            </button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="flex items-center justify-center py-6 text-slate-400 text-xs">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600 mr-2" />
          <span>Loading comments...</span>
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center dark:border-[#2A2A2A] bg-slate-50/50 dark:bg-[#161616]/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No comments yet. Have a question or want to collaborate? Start the conversation!
          </p>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {rootComments.map((root) => {
            const isRootAuthor = root.authorId === postAuthorId;
            const isMe = root.authorId === currentUser?.uid;
            const replies = repliesByParentId[root.id] || [];
            const isReplyingThis = replyingToComment?.id === root.id;

            return (
              <div 
                key={root.id} 
                className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 sm:p-3.5 dark:border-[#2A2A2A] dark:bg-[#171717] transition-all"
              >
                {/* Root Comment Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      className="cursor-pointer hover:opacity-90 shrink-0"
                      onClick={() => onViewProfile?.(root.authorId)}
                      title="View Profile"
                    >
                      <UserAvatar
                        userId={root.authorId}
                        name={root.authorName}
                        photoURL={root.authorPhotoURL}
                        className="h-8 w-8 text-xs shadow-2xs"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span 
                          onClick={() => onViewProfile?.(root.authorId)}
                          className="font-semibold text-xs sm:text-[13px] text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        >
                          {root.authorName}
                        </span>
                        
                        {isRootAuthor && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                            <Sparkles className="h-2.5 w-2.5" />
                            Author
                          </span>
                        )}

                        {isMe && (
                          <span className="rounded bg-slate-200/80 dark:bg-[#282828] px-1 py-0.2 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                            You
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400">• {formatCommentTime(root.createdAt)}</span>
                      </div>
                      
                      {root.authorDepartment && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.2">
                          {root.authorDepartment}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for root comment */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (isReplyingThis) {
                          setReplyingToComment(null);
                          setReplyText("");
                        } else {
                          setReplyingToComment(root);
                          setReplyText("");
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-200/60 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-[#262626] dark:hover:text-indigo-400 transition"
                    >
                      <Reply className="h-3 w-3" />
                      <span>Reply</span>
                    </button>

                    {isMe && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(root.id)}
                        disabled={deletingId === root.id}
                        className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition"
                        title="Delete comment"
                      >
                        {deletingId === root.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Root Comment Content */}
                <div className="mt-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed pl-10 pr-2 whitespace-pre-wrap">
                  {root.content}
                </div>

                {/* Nested Replies Section */}
                {replies.length > 0 && (
                  <div className="mt-3.5 space-y-2.5 ml-4 sm:ml-8 pl-3 border-l-2 border-indigo-200/70 dark:border-indigo-900/50">
                    {replies.map((reply) => {
                      const isReplyAuthor = reply.authorId === postAuthorId;
                      const isReplyMe = reply.authorId === currentUser?.uid;

                      return (
                        <div 
                          key={reply.id} 
                          className="rounded-lg bg-white/70 dark:bg-[#1F1F1F]/80 p-2.5 sm:p-3 border border-slate-200/50 dark:border-[#2C2C2C] shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div 
                                className="cursor-pointer hover:opacity-90 shrink-0"
                                onClick={() => onViewProfile?.(reply.authorId)}
                                title="View Profile"
                              >
                                <UserAvatar
                                  userId={reply.authorId}
                                  name={reply.authorName}
                                  photoURL={reply.authorPhotoURL}
                                  className="h-6 w-6 sm:h-7 sm:w-7 text-[10px]"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span 
                                    onClick={() => onViewProfile?.(reply.authorId)}
                                    className="font-semibold text-xs text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                                  >
                                    {reply.authorName}
                                  </span>

                                  {isReplyAuthor && (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 dark:text-indigo-300">
                                      Author
                                    </span>
                                  )}

                                  {isReplyMe && (
                                    <span className="rounded bg-slate-200/80 dark:bg-[#282828] px-1 py-0.2 text-[9px] font-semibold text-slate-600 dark:text-slate-400">
                                      You
                                    </span>
                                  )}

                                  <span className="text-[10px] text-slate-400">• {formatCommentTime(reply.createdAt)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Reply Action: Delete if owner */}
                            {isReplyMe && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(reply.id)}
                                disabled={deletingId === reply.id}
                                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition"
                                title="Delete reply"
                              >
                                {deletingId === reply.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Reply Body */}
                          <div className="mt-1.5 text-xs text-slate-700 dark:text-slate-200 leading-relaxed pl-8 pr-1 whitespace-pre-wrap">
                            {reply.replyToName && (
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400 mr-1.5">
                                @{reply.replyToName}
                              </span>
                            )}
                            {reply.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Inline Reply Box for this Comment */}
                {isReplyingThis && (
                  <div className="mt-3 ml-4 sm:ml-8 pl-3 border-l-2 border-indigo-500">
                    <div className="rounded-xl border border-indigo-200/80 bg-white p-3 dark:border-indigo-900/40 dark:bg-[#1D1D1D] shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <CornerDownRight className="h-3 w-3" />
                          Replying to @{root.authorName}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToComment(null);
                            setReplyText("");
                          }}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <textarea
                        autoFocus
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Write your reply to ${root.authorName}...`}
                        rows={2}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-white resize-none"
                      />

                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToComment(null);
                            setReplyText("");
                          }}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#252525]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!replyText.trim() || isSubmittingReply}
                          onClick={() => handleAddReply(root)}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-500 disabled:opacity-40 transition"
                        >
                          {isSubmittingReply ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
