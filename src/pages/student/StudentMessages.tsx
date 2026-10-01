import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { 
  collection, query, where, onSnapshot, orderBy, 
  addDoc, serverTimestamp, doc, updateDoc, deleteDoc, arrayRemove
} from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { auth } from "@/firebase/auth";
import { rtdb } from "@/firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { StudentProfileModal } from "@/components/common/StudentProfileModal";
import { UserAvatar } from "@/components/common/UserAvatar";
import { 
  Send, Loader2, MessageSquare, Edit2, Trash2, X,
  Search, Sparkles, User, Users, CheckCheck, ArrowLeft
} from "lucide-react";

interface DirectMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: any;
  isEdited?: boolean;
}

interface ChatRoom {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage?: string;
  updatedAt?: any;
  unreadBy?: string[];
}

const QUICK_STARTERS = [
  "👋 Hi! Are you looking for thesis teammates?",
  "Saw your post on Find Peers! Would love to connect.",
  "Interested in collaborating on your research topic."
];

export default function StudentMessages() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetUserId = searchParams.get("userId");
  const targetUserName = searchParams.get("name") || "Peer";
  
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [peerProfiles, setPeerProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const currentUserId = currentUser?.uid;

  // 0. Fetch Current User Profile
  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = onSnapshot(doc(db, "users", currentUserId), (snap) => {
      if (snap.exists()) {
        setUserProfile(snap.data());
      }
    });
    return () => unsubscribe();
  }, [currentUserId]);

  const currentUserName = userProfile?.name || currentUser?.displayName || "Student";

  // 1. Fetch Chat Rooms
  useEffect(() => {
    if (!currentUserId) return;

    const q = query(
      collection(db, "directMessages"),
      where("participants", "array-contains", currentUserId)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const rooms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatRoom[];
      
      // Sort by updatedAt descending
      rooms.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis?.() || 0;
        const timeB = b.updatedAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setChatRooms(rooms);
      
      // If we came from a "Message Author" link, find or create that chat room
      if (targetUserId && targetUserId !== currentUserId && !activeChatId) {
        const existingRoom = rooms.find(r => r.participants.includes(targetUserId));
        if (existingRoom) {
          setActiveChatId(existingRoom.id);
        } else {
          setActiveChatId("new_" + targetUserId);
        }
      } else if (!activeChatId && rooms.length > 0) {
        setActiveChatId(rooms[0].id);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserId, targetUserId, activeChatId]);

  // Mark as read when active chat changes
  useEffect(() => {
    if (!currentUserId || !activeChatId) return;
    const currentRoom = chatRooms.find(r => r.id === activeChatId);
    if (currentRoom && currentRoom.unreadBy?.includes(currentUserId)) {
      updateDoc(doc(db, "directMessages", activeChatId), {
        unreadBy: arrayRemove(currentUserId)
      }).catch(console.error);
    }
  }, [activeChatId, chatRooms, currentUserId]);

  // 1.5 Listen for RTDB online status of all peers
  useEffect(() => {
    if (!currentUserId || chatRooms.length === 0) return;
    const peerIds = [...new Set(chatRooms.flatMap(r => r.participants.filter(id => id !== currentUserId)))];
    if (targetUserId && !peerIds.includes(targetUserId)) {
      peerIds.push(targetUserId);
    }

    const unsubscribes = peerIds.map(id => {
      const statusRef = ref(rtdb, `/status/${id}`);
      return onValue(statusRef, (snapshot) => {
        const val = snapshot.val();
        setOnlineStatuses(prev => ({
          ...prev,
          [id]: val?.state === "online"
        }));
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [chatRooms, currentUserId, targetUserId]);

  // 2. Fetch Peer Profiles dynamically to ensure we always have their real names and details
  useEffect(() => {
    if (chatRooms.length === 0 || !currentUserId) return;
    
    const peerIds = [...new Set(chatRooms.flatMap(r => r.participants.filter(id => id !== currentUserId)))];
    if (targetUserId && !peerIds.includes(targetUserId)) {
      peerIds.push(targetUserId);
    }
    
    const unsubscribes = peerIds.map(id => 
      onSnapshot(doc(db, "users", id), (snap) => {
        if (snap.exists()) {
          setPeerProfiles(prev => ({ ...prev, [id]: snap.data() }));
        }
      })
    );
    
    return () => unsubscribes.forEach(unsub => unsub());
  }, [chatRooms, currentUserId, targetUserId]);

  // 3. Fetch Messages for Active Chat
  useEffect(() => {
    if (!activeChatId || activeChatId.startsWith("new_")) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "directMessages", activeChatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DirectMessage[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  // 4. Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? newMessage).trim();
    if (!text || !currentUserId || !activeChatId) return;

    if (!textToSend) {
      setNewMessage("");
    }
    setSending(true);

    try {
      let roomId = activeChatId;

      // If it's a new conversation, create the room document first
      if (roomId.startsWith("new_")) {
        const targetId = roomId.replace("new_", "");
        const newRoomRef = await addDoc(collection(db, "directMessages"), {
          participants: [currentUserId, targetId],
          participantNames: {
            [currentUserId]: currentUserName,
            [targetId]: targetUserName
          },
          updatedAt: serverTimestamp(),
          lastMessage: text,
          unreadBy: [targetId]
        });
        roomId = newRoomRef.id;
        setActiveChatId(roomId);
        
        // Clear the URL param so it doesn't try to recreate
        navigate("/student/messages", { replace: true });
      } else {
        const activeRoom = chatRooms.find(r => r.id === roomId);
        const otherParticipants = activeRoom ? activeRoom.participants.filter(id => id !== currentUserId) : [];
        await updateDoc(doc(db, "directMessages", roomId), {
          updatedAt: serverTimestamp(),
          lastMessage: text,
          unreadBy: otherParticipants
        });
      }

      await addDoc(collection(db, "directMessages", roomId, "messages"), {
        text,
        senderId: currentUserId,
        senderName: currentUserName,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error sending message:", err);
      if (!textToSend) {
        setNewMessage(text);
      }
    } finally {
      setSending(false);
    }
  };

  const confirmDeleteMessage = async () => {
    if (!deleteMessageId || !activeChatId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "directMessages", activeChatId, "messages", deleteMessageId));
    } catch (err) {
      console.error("Error deleting message:", err);
    } finally {
      setIsDeleting(false);
      setDeleteMessageId(null);
    }
  };

  const handleUpdateMessage = async (e: React.FormEvent, msgId: string) => {
    e.preventDefault();
    if (!editContent.trim()) return;
    try {
      await updateDoc(doc(db, "directMessages", activeChatId as string, "messages", msgId), {
        text: editContent.trim(),
        isEdited: true
      });
      setEditingMessageId(null);
      setEditContent("");
    } catch (err) {
      console.error("Error updating message:", err);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatSidebarTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getMessageDateKey = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toDateString();
  };

  const formatMessageDateHeader = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) return "Today";
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const handleDeleteConversation = async () => {
    if (!deleteConversationId) return;
    setIsDeletingConversation(true);
    try {
      await deleteDoc(doc(db, "directMessages", deleteConversationId));
      setDeleteConversationId(null);
      if (activeChatId === deleteConversationId) {
        setActiveChatId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingConversation(false);
    }
  };

  const activeRoom = chatRooms.find(r => r.id === activeChatId);
  
  // Determine peer details for the active chat
  let activePeerId: string | null = null;
  let activePeerName = "Chat";
  if (activeChatId?.startsWith("new_")) {
    activePeerId = targetUserId;
    activePeerName = peerProfiles[targetUserId || ""]?.name || targetUserName;
  } else if (activeRoom) {
    const pId = activeRoom.participants.find(id => id !== currentUserId);
    if (pId) {
      activePeerId = pId;
      activePeerName = peerProfiles[pId]?.name || activeRoom.participantNames[pId] || "Peer";
    }
  }
  const activePeer = activePeerId ? peerProfiles[activePeerId] : null;

  // Filter conversations by search term
  const filteredChatRooms = chatRooms.filter(room => {
    const peerId = room.participants.find(id => id !== currentUserId);
    const peer = peerId ? peerProfiles[peerId] : null;
    const name = peer?.name || (peerId ? room.participantNames[peerId] : "") || "Peer";
    const dept = peer?.department || "";
    const lastMsg = room.lastMessage || "";
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      name.toLowerCase().includes(q) ||
      dept.toLowerCase().includes(q) ||
      lastMsg.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout role="student">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 pt-2 pb-6 flex flex-col h-[calc(100vh-80px)]">
        
        {/* Page Top Header */}
        <div className="mb-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20 shrink-0">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Messages</h1>
                <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20">
                  {chatRooms.length} {chatRooms.length === 1 ? "conversation" : "conversations"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Direct messages & research discussions with your peers
              </p>
            </div>
          </div>

          <Link
            to="/student/find-peers"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#252525] dark:hover:bg-[#2e2e2e] text-slate-700 dark:text-slate-200 px-3.5 py-2 text-xs font-semibold transition border border-slate-200/80 dark:border-[#333333] shadow-2xs w-fit"
          >
            <Users className="h-4 w-4 text-indigo-500" />
            <span>Find More Peers</span>
          </Link>
        </div>

        {/* Main Messenger Box */}
        <div className="flex flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
          
          {/* Left Column: Sidebar / Inbox List */}
          <div className={`w-full lg:w-80 xl:w-96 border-r border-slate-200 dark:border-[#2A2A2A] bg-slate-50/60 dark:bg-[#141414] flex flex-col ${
            activeChatId ? "hidden lg:flex" : "flex"
          }`}>
            
            {/* Search Header */}
            <div className="p-3.5 border-b border-slate-200 dark:border-[#2A2A2A] space-y-2.5 bg-white/40 dark:bg-[#161616]/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Chats ({filteredChatRooms.length})
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, department, or message..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-[#2A2A2A] dark:bg-[#1B1B1B] dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#222222]">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mb-2" />
                  <span className="text-xs">Loading conversations...</span>
                </div>
              ) : chatRooms.length === 0 && !activeChatId?.startsWith("new_") ? (
                <div className="p-8 text-center text-slate-500">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No messages yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">
                    Search for peers in the Find Peers directory to start collaborating!
                  </p>
                  <Link
                    to="/student/find-peers"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-semibold transition"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Find Peers</span>
                  </Link>
                </div>
              ) : filteredChatRooms.length === 0 && !activeChatId?.startsWith("new_") ? (
                <div className="p-6 text-center text-slate-500">
                  <p className="text-xs">No conversations matching "{searchQuery}"</p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-2 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <>
                  {/* New conversation slot if initiated from outside */}
                  {activeChatId?.startsWith("new_") && (
                    <div className="w-full text-left p-3.5 bg-indigo-50/90 dark:bg-indigo-500/15 border-l-4 border-indigo-600">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <UserAvatar 
                            userId={targetUserId || ""} 
                            name={peerProfiles[targetUserId || ""]?.name || targetUserName} 
                            photoURL={peerProfiles[targetUserId || ""]?.photoURL}
                            className="h-10 w-10 text-sm shadow-2xs"
                          />
                          {onlineStatuses[targetUserId || ""] && (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-[#181818]" />
                          )}
                        </div>
                        <div className="overflow-hidden min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="truncate text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                              {peerProfiles[targetUserId || ""]?.name || targetUserName}
                            </h3>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.2 rounded">
                              New
                            </span>
                          </div>
                          <p className="truncate text-xs text-indigo-600/70 dark:text-indigo-300/70 mt-0.5">
                            Starting conversation...
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Regular conversation items */}
                  {filteredChatRooms.map(room => {
                    const peerId = room.participants.find(id => id !== currentUserId);
                    const peer = peerId ? peerProfiles[peerId] : null;
                    const peerName = peer?.name || (peerId ? room.participantNames[peerId] : "") || "Peer";
                    const isActive = room.id === activeChatId;
                    
                    return (
                      <button
                        key={room.id}
                        onClick={() => {
                          setActiveChatId(room.id);
                          if (targetUserId) {
                            searchParams.delete("userId");
                            searchParams.delete("name");
                            navigate({ search: searchParams.toString() }, { replace: true });
                          }
                        }}
                        className={`group relative flex w-full items-center gap-3 p-3.5 text-left transition-all ${
                          isActive 
                            ? "bg-indigo-50/80 dark:bg-indigo-500/10 border-l-4 border-indigo-600 pl-3 shadow-2xs" 
                            : "hover:bg-slate-100/70 dark:hover:bg-[#1E1E1E] border-l-4 border-transparent"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <UserAvatar 
                            userId={peerId} 
                            name={peerName} 
                            photoURL={peer?.photoURL}
                            className="h-10 w-10 text-sm shadow-2xs"
                          />
                          {peerId && onlineStatuses[peerId] && (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-[#141414]" />
                          )}
                        </div>

                        <div className="overflow-hidden min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className={`truncate text-sm font-semibold ${
                              isActive ? "text-indigo-700 dark:text-indigo-300" : 
                              (room.unreadBy?.includes(currentUserId) ? "text-slate-900 dark:text-white font-bold" : "text-slate-900 dark:text-white")
                            }`}>
                              {peerName}
                            </h3>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {room.unreadBy?.includes(currentUserId) && !isActive && (
                                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                              )}
                              {room.updatedAt && (
                                <span className={`text-[10px] font-medium ${room.unreadBy?.includes(currentUserId) && !isActive ? "text-rose-500 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
                                  {formatSidebarTime(room.updatedAt)}
                                </span>
                              )}
                            </div>
                          </div>

                          {peer?.department && (
                            <span className={`inline-block truncate text-[11px] font-medium ${room.unreadBy?.includes(currentUserId) && !isActive ? "text-rose-500/80" : "text-indigo-600/80 dark:text-indigo-400/80"}`}>
                              {peer.department}
                            </span>
                          )}

                          <p className={`truncate text-xs mt-0.5 ${
                            isActive ? "text-slate-600 dark:text-slate-300 font-medium" : 
                            (room.unreadBy?.includes(currentUserId) ? "text-slate-900 dark:text-white font-semibold" : "text-slate-500 dark:text-slate-400")
                          }`}>
                            {room.lastMessage || "No messages yet"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Right Column: Active Chat Area */}
          <div className={`flex-1 flex flex-col bg-white dark:bg-[#181818] ${
            !activeChatId ? "hidden lg:flex" : "flex"
          }`}>
            {activeChatId ? (
              <>
                {/* Chat Top Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-[#2A2A2A] bg-white/50 dark:bg-[#181818]/50 backdrop-blur-xs shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => setActiveChatId(null)}
                      className="lg:hidden -ml-1 p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#252525] transition"
                      title="Back to conversations"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>

                    <div 
                      className="relative shrink-0 cursor-pointer" 
                      onClick={() => activePeerId && setSelectedProfileId(activePeerId)}
                      title="View student profile"
                    >
                      <UserAvatar 
                        userId={activePeerId || undefined}
                        name={activePeerName} 
                        photoURL={activePeer?.photoURL}
                        className="h-10 w-10 text-sm shadow-2xs hover:opacity-90 transition"
                      />
                      {activePeerId && onlineStatuses[activePeerId] && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-[#181818]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 
                          onClick={() => activePeerId && setSelectedProfileId(activePeerId)}
                          className="font-semibold text-slate-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        >
                          {activePeerName}
                        </h2>
                        {activePeer?.batch && (
                          <span className="hidden sm:inline-block rounded-md bg-slate-100 dark:bg-[#252525] px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                            Batch {activePeer.batch}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {activePeer?.department || activePeer?.university || "Student Peer"}
                      </p>
                    </div>
                  </div>

                  {activePeerId && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedProfileId(activePeerId)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-600 transition dark:border-[#2E2E2E] dark:bg-[#202020] dark:text-slate-200 dark:hover:bg-[#282828] dark:hover:text-indigo-400 shadow-2xs"
                      >
                        <User className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="hidden sm:inline">View Profile</span>
                      </button>
                      <button
                        onClick={() => activeChatId && setDeleteConversationId(activeChatId)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 shadow-2xs"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Messages View */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-[#151515]/30">
                  {messages.length === 0 && !activeChatId.startsWith("new_") ? (
                    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                      <UserAvatar
                        userId={activePeerId || undefined}
                        name={activePeerName}
                        photoURL={activePeer?.photoURL}
                        className="h-16 w-16 text-lg mb-3 shadow-md ring-4 ring-indigo-50 dark:ring-indigo-950/40"
                      />
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                        Start a conversation with {activePeerName}
                      </h3>
                      <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                        {activePeer?.department ? `${activePeer.department} • ` : ""}Send a friendly message to kickstart your research collaboration!
                      </p>

                      {/* Quick starter chips */}
                      <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-md">
                        {QUICK_STARTERS.map((starter, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSendMessage(starter)}
                            className="rounded-full border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-[#2E2E2E] dark:bg-[#202020] dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300 transition-all text-left shadow-2xs"
                          >
                            {starter}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.senderId === currentUserId;
                      const currentDateKey = getMessageDateKey(msg.createdAt);
                      const prevDateKey = idx > 0 ? getMessageDateKey(messages[idx - 1].createdAt) : null;
                      const showDateDivider = currentDateKey && currentDateKey !== prevDateKey;

                      return (
                        <div key={msg.id} className="space-y-3">
                          {/* Calendar date separator */}
                          {showDateDivider && (
                            <div className="flex items-center justify-center my-3">
                              <span className="rounded-full bg-slate-100 dark:bg-[#242424] border border-slate-200/80 dark:border-[#2F2F2F] px-3 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 shadow-2xs">
                                {formatMessageDateHeader(msg.createdAt)}
                              </span>
                            </div>
                          )}

                          <div className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
                            <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-[70%]">
                              <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                {/* Message bubble */}
                                <div className={`relative rounded-2xl px-4 py-2.5 text-sm transition-all shadow-2xs ${
                                  isMe 
                                    ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-xs" 
                                    : "bg-white text-slate-900 dark:bg-[#242424] dark:text-slate-100 rounded-tl-xs border border-slate-200/70 dark:border-[#2D2D2D]"
                                }`}>
                                  {editingMessageId === msg.id ? (
                                    <form onSubmit={(e) => handleUpdateMessage(e, msg.id)} className="flex items-center gap-2">
                                      <input 
                                        type="text" 
                                        autoFocus
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="rounded-lg bg-indigo-800/80 px-2.5 py-1 text-sm text-white outline-none ring-2 ring-white/30"
                                      />
                                      <button type="button" onClick={() => setEditingMessageId(null)} className="text-white/80 hover:text-white transition">
                                        <X className="h-4 w-4" />
                                      </button>
                                    </form>
                                  ) : (
                                    <p className="whitespace-pre-wrap leading-relaxed text-[13.5px]">{msg.text}</p>
                                  )}
                                </div>
                                
                                {/* Action Buttons (visible on hover) */}
                                {isMe && editingMessageId !== msg.id && (
                                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                    <button 
                                      onClick={() => { setEditingMessageId(msg.id); setEditContent(msg.text); }} 
                                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-[#252525] dark:hover:text-indigo-400 transition" 
                                      title="Edit"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => setDeleteMessageId(msg.id)} 
                                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition" 
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              
                              {/* Timestamp & status */}
                              <div className={`flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 ${isMe ? "justify-end" : "justify-start"}`}>
                                {msg.createdAt && <span>{formatTime(msg.createdAt)}</span>}
                                {msg.isEdited && <span>• (edited)</span>}
                                {isMe && <CheckCheck className="h-3 w-3 text-indigo-400 dark:text-indigo-300 ml-0.5" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Box */}
                <div className="border-t border-slate-200 p-3 sm:p-4 dark:border-[#2A2A2A] bg-white dark:bg-[#181818] shrink-0">
                  <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={`Message ${activePeerName}...`}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/15 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white dark:focus:border-indigo-500 dark:focus:bg-[#121212]"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 active:scale-95 disabled:opacity-40 disabled:hover:bg-indigo-600 shadow-sm shadow-indigo-600/20"
                      title="Send message"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              /* Empty state when no conversation is selected on desktop */
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-radial from-transparent to-slate-50/50 dark:to-[#141414]/50">
                <div className="relative mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shadow-inner">
                    <MessageSquare className="h-8 w-8" />
                  </div>
                  <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white shadow">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Your Peer Inbox</h3>
                <p className="mt-1 max-w-sm text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Select a conversation from the sidebar to chat, or connect with fellow researchers to team up for your thesis.
                </p>
                <Link
                  to="/student/find-peers"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-xs font-semibold transition shadow-md shadow-indigo-600/20"
                >
                  <Users className="h-4 w-4" />
                  <span>Browse Peer Listings</span>
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Message Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteMessageId}
        onClose={() => setDeleteMessageId(null)}
        onConfirm={confirmDeleteMessage}
        title="Delete Message"
        description="Are you sure you want to delete this message? This action cannot be undone."
        confirmText="Yes, delete it"
        isLoading={isDeleting}
      />

      {/* Conversation Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConversationId}
        onClose={() => setDeleteConversationId(null)}
        onConfirm={handleDeleteConversation}
        title="Delete Conversation"
        description="Are you sure you want to delete this conversation? This will permanently remove the chat history for both participants."
        confirmText="Delete Conversation"
        isLoading={isDeletingConversation}
      />

      {/* Student Profile Modal */}
      {selectedProfileId && (
        <StudentProfileModal
          isOpen={!!selectedProfileId}
          studentId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
          hideCgpa={true}
        />
      )}
    </DashboardLayout>
  );
}

