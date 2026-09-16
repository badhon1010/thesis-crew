import { useState, useEffect, useRef } from "react";
import { 
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, 
  doc, updateDoc, arrayUnion, deleteDoc 
} from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { Send, User as UserIcon, Edit2, Trash2, X, Check, MoreVertical, Trash, History, Plus } from "lucide-react";

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: "teacher" | "student";
  createdAt: any;
  isEdited?: boolean;
  editHistory?: { text: string; timestamp: string }[];
}

interface Conversation {
  id: string;
  name: string;
  createdAt: any;
  hiddenBy: string[];
}

export interface ChatMember {
  id: string;
  name: string;
  role: "teacher" | "student";
}

interface GroupChatProps {
  groupId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: "teacher" | "student";
  members?: ChatMember[];
}

export function GroupChat({ groupId, currentUserId, currentUserName, currentUserRole, members = [] }: GroupChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newConversationName, setNewConversationName] = useState("");
  const [createError, setCreateError] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isUnsendModalOpen, setIsUnsendModalOpen] = useState(false);
  const [messageToUnsend, setMessageToUnsend] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to conversations
  useEffect(() => {
    const q = query(
      collection(db, "researchGroups", groupId, "conversations"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        let convos = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Conversation[];

        // Filter out conversations hidden by the current user
        convos = convos.filter(c => !(c.hiddenBy || []).includes(currentUserId));

        setConversations(convos);
        // Set active conversation if none selected or current is hidden
        setActiveConversationId((prev) => {
          if (!prev || !convos.find(c => c.id === prev)) {
            return convos.length > 0 ? convos[0].id : null;
          }
          return prev;
        });
        setLoadingConversations(false);
      },
      (error) => {
        console.error("Error fetching conversations:", error);
        setLoadingConversations(false);
      }
    );

    return () => unsubscribe();
  }, [groupId, currentUserId]);

  // Subscribe to messages of active conversation
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const q = query(
      collection(db, "researchGroups", groupId, "conversations", activeConversationId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];
        setMessages(msgs);
        setLoadingMessages(false);
      },
      (error) => {
        console.error("Error fetching messages:", error);
        setLoadingMessages(false);
      }
    );

    return () => unsubscribe();
  }, [groupId, activeConversationId]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversationId) return;

    const messageText = newMessage.trim();
    setNewMessage(""); // Optimistic clear

    try {
      await addDoc(collection(db, "researchGroups", groupId, "conversations", activeConversationId, "messages"), {
        text: messageText,
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: currentUserRole,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "researchGroups", groupId, "conversations", activeConversationId), {
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageText); // Restore if failed
    }
  };

  const handleUnsendMessage = async () => {
    if (!messageToUnsend || !activeConversationId) return;
    try {
      await deleteDoc(doc(db, "researchGroups", groupId, "conversations", activeConversationId, "messages", messageToUnsend));
      setIsUnsendModalOpen(false);
      setMessageToUnsend(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleEditSubmit = async (messageId: string) => {
    if (!editContent.trim() || !activeConversationId) return;
    
    const originalMsg = messages.find((m) => m.id === messageId);
    if (!originalMsg || originalMsg.text === editContent.trim()) {
      setEditingMessageId(null);
      return;
    }

    try {
      await updateDoc(doc(db, "researchGroups", groupId, "conversations", activeConversationId, "messages", messageId), {
        text: editContent.trim(),
        isEdited: true,
        editHistory: [...(originalMsg.editHistory || []), {
          text: originalMsg.text,
          timestamp: new Date().toISOString()
        }]
      });
      setEditingMessageId(null);
      setEditContent("");
    } catch (error) {
      console.error("Error updating message:", error);
    }
  };

  const handleCreateConversation = async () => {
    const trimmedName = newConversationName.trim();
    if (!trimmedName) return;

    const isDuplicate = conversations.some(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      setCreateError("A group with this name already exists.");
      return;
    }

    setCreateError("");
    try {
      const newRef = await addDoc(collection(db, "researchGroups", groupId, "conversations"), {
        name: trimmedName,
        createdAt: serverTimestamp(),
        hiddenBy: []
      });
      setActiveConversationId(newRef.id);
      setIsCreateModalOpen(false);
      setNewConversationName("");
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const handleHideConversation = async () => {
    if (!activeConversationId) return;
    setIsMenuOpen(false);
    try {
      await updateDoc(doc(db, "researchGroups", groupId, "conversations", activeConversationId), {
        hiddenBy: arrayUnion(currentUserId)
      });
      setIsLeaveModalOpen(false);
    } catch (error) {
      console.error("Error hiding conversation:", error);
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeConversationId) return;
    setIsMenuOpen(false);
    try {
      await deleteDoc(doc(db, "researchGroups", groupId, "conversations", activeConversationId));
      setIsDeleteModalOpen(false);
      setActiveConversationId(null);
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== "function") return "Sending...";
    try {
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(date);
    } catch (e) {
      return "";
    }
  };

  return (
    <>
      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setIsCreateModalOpen(false); setCreateError(""); }} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-[#181818] border border-slate-200 dark:border-[#2A2A2A]">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Create New Group</h3>
            <input
              type="text"
              autoFocus
              value={newConversationName}
              onChange={(e) => { setNewConversationName(e.target.value); setCreateError(""); }}
              placeholder="e.g. Backend Architecture"
              className={`w-full rounded-xl border ${createError ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'} bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-1 dark:bg-[#0F0F0F] dark:text-white`}
            />
            {createError && <p className="mt-2 text-xs text-red-500">{createError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setIsCreateModalOpen(false); setCreateError(""); }}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateConversation}
                disabled={!newConversationName.trim() || !!createError}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsLeaveModalOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-[#181818] border border-slate-200 dark:border-[#2A2A2A]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
              <Trash className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-900 dark:text-white mb-2">Leave Group?</h3>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
              This will remove this group from your view. Students will then be able to delete it.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#333] dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleHideConversation}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-[#181818] border border-slate-200 dark:border-[#2A2A2A]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
              <Trash className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Group?</h3>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
              This will permanently delete this group from everywhere for all members. This cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#333] dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConversation}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsend Message Modal */}
      {isUnsendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsUnsendModalOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-[#181818] border border-slate-200 dark:border-[#2A2A2A]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
              <Trash className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-900 dark:text-white mb-2">Unsend Message?</h3>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
              This message will be permanently deleted for everyone in this conversation.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setIsUnsendModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#333] dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleUnsendMessage}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Unsend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {isMembersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMembersModalOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-[#181818] border border-slate-200 dark:border-[#2A2A2A]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Group Members</h3>
              <button 
                onClick={() => setIsMembersModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
              {members.length === 0 ? (
                <p className="text-center text-sm text-slate-500">No members found.</p>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-[#333] dark:bg-[#222]">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                      member.role === "teacher" 
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" 
                        : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                    }`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{member.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex h-[600px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
        {/* Sidebar */}
        <div className="flex w-64 flex-col border-r border-slate-200 bg-slate-50/50 dark:border-[#2A2A2A] dark:bg-[#0F0F0F]/50">
          <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-[#2A2A2A]">
            <h3 className="font-semibold text-slate-900 dark:text-white">Groups</h3>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="New Group"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3">
            {loadingConversations ? (
              <div className="flex items-center justify-center p-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"></div>
              </div>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-500">No groups available.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      activeConversationId === conv.id
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400"
                        : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="truncate">{conv.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-[#2A2A2A]">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {conversations.find(c => c.id === activeConversationId)?.name || "Discussion"}
              </h2>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMembersModalOpen(true)}
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                title="View Group Members"
              >
                <UserIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Members</span>
              </button>
              
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
                </span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Live</span>
              </div>

              {activeConversationId && (
                (currentUserRole === "teacher" || 
                (currentUserRole === "student" && (conversations.find(c => c.id === activeConversationId)?.hiddenBy?.length || 0) > 0)) && (
                  <div className="relative">
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>

                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-[#2A2A2A] dark:bg-[#181818]">
                          {currentUserRole === "teacher" && (
                            <>
                              <button
                                onClick={() => { setIsMenuOpen(false); setIsLeaveModalOpen(true); }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                              >
                                <Trash className="h-4 w-4" />
                                Leave Group
                              </button>
                              <button
                                onClick={() => { setIsMenuOpen(false); setIsDeleteModalOpen(true); }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                              >
                                <Trash className="h-4 w-4" />
                                Delete Group
                              </button>
                            </>
                          )}
                          {currentUserRole === "student" && (conversations.find(c => c.id === activeConversationId)?.hiddenBy?.length || 0) > 0 && (
                            <button
                              onClick={() => { setIsMenuOpen(false); setIsDeleteModalOpen(true); }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                              <Trash className="h-4 w-4" />
                              Delete Group
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 relative">
            {viewingHistoryId && (
              <div 
                className="fixed inset-0 z-0" 
                onClick={() => setViewingHistoryId(null)}
              />
            )}
            
            {!activeConversationId ? (
              <div className="flex h-full items-center justify-center text-slate-500">
                Select a group to start chatting
              </div>
            ) : loadingMessages ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <UserIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">No messages yet</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Be the first to start the conversation in this group!
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, index) => {
                  const isMine = msg.senderId === currentUserId;
                  const showAvatar = index === 0 || messages[index - 1]?.senderId !== msg.senderId;
                  const displayName = msg.senderName || "User";

                  return (
                    <div key={msg.id} className={`flex gap-3 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                      {/* Avatar */}
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${showAvatar ? (msg.senderRole === "teacher" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300") : "bg-transparent"}`}>
                        {showAvatar && (
                          <span className="text-xs font-bold">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Message Body */}
                      <div className={`flex max-w-[75%] flex-col ${isMine ? "items-end" : "items-start"}`}>
                        {showAvatar && (
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {displayName}
                            </span>
                            {msg.senderRole === "teacher" && (
                              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                Supervisor
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className={`flex items-end gap-2 group ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                          <div
                            className={`relative rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                              isMine
                                ? "rounded-tr-sm bg-indigo-600 text-white"
                                : "rounded-tl-sm bg-slate-100 text-slate-900 dark:bg-[#222222] dark:text-slate-100"
                            }`}
                          >
                            {editingMessageId === msg.id ? (
                              <div className="flex flex-col gap-2 min-w-[200px]">
                                <textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full resize-none rounded bg-black/10 p-2 outline-none placeholder:text-inherit focus:bg-black/20 dark:bg-black/20 dark:focus:bg-black/40"
                                  rows={2}
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingMessageId(null)}
                                    className="flex items-center gap-1 rounded bg-black/10 px-2 py-1 text-[10px] font-medium transition-colors hover:bg-black/20 dark:bg-black/20 dark:hover:bg-black/40"
                                  >
                                    <X className="h-3 w-3" /> Cancel
                                  </button>
                                  <button
                                    onClick={() => handleEditSubmit(msg.id)}
                                    className="flex items-center gap-1 rounded bg-emerald-500 px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-emerald-400"
                                  >
                                    <Check className="h-3 w-3" /> Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                {msg.isEdited && (
                                  <div className="mt-1 flex items-center justify-between">
                                    <button
                                      onClick={() => setViewingHistoryId(viewingHistoryId === msg.id ? null : msg.id)}
                                      className={`flex items-center gap-1 text-[9px] hover:underline ${
                                        isMine ? "text-indigo-200" : "text-slate-500"
                                      }`}
                                    >
                                      <History className="h-2.5 w-2.5" />
                                      (edited)
                                    </button>
                                  </div>
                                )}

                                {viewingHistoryId === msg.id && msg.editHistory && msg.editHistory.length > 0 && (
                                  <div className={`mt-2 rounded p-2 text-[11px] shadow-inner ${
                                    isMine ? "bg-indigo-700/30 text-indigo-100" : "bg-slate-200/50 dark:bg-black/20 text-slate-600 dark:text-slate-400"
                                  }`}>
                                    <div className="mb-1 font-semibold">Edit History:</div>
                                    <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
                                      {msg.editHistory.map((history, i) => (
                                        <div key={i} className="border-l-2 pl-2 border-current opacity-75">
                                          <div className="mb-0.5 line-through">{history.text}</div>
                                          <div className="text-[9px] opacity-60">
                                            {new Date(history.timestamp).toLocaleString()}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Action Buttons for my messages */}
                          {isMine && editingMessageId !== msg.id && (
                            <div className="hidden flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:flex group-hover:opacity-100">
                              <button
                                onClick={() => {
                                  setEditingMessageId(msg.id);
                                  setEditContent(msg.text);
                                }}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                                title="Edit message"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setMessageToUnsend(msg.id);
                                  setIsUnsendModalOpen(true);
                                }}
                                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                title="Unsend message"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <span className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-[#2A2A2A] dark:bg-[#0F0F0F]">
            {activeConversationId && (conversations.find(c => c.id === activeConversationId)?.hiddenBy?.length || 0) > 0 ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm font-medium text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                The supervisor has left this group, so you can no longer send messages here.
              </div>
            ) : (
              <>
                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e as any);
                        }
                      }}
                      placeholder={activeConversationId ? "Type your message..." : "Select a group..."}
                      disabled={!activeConversationId}
                      className="max-h-32 min-h-[44px] w-full resize-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 dark:border-[#333] dark:bg-[#181818] dark:text-white dark:focus:border-indigo-500"
                      rows={1}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || !activeConversationId}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
                <p className="mt-2 text-center text-[10px] text-slate-500 dark:text-slate-400">
                  Press Enter to send, Shift + Enter for new line
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
