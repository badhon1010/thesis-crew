import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  collection, query, where, onSnapshot, orderBy, 
  addDoc, serverTimestamp, doc, updateDoc, deleteDoc
} from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { auth } from "@/firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { Send, Loader2, MessageSquare, Edit2, Trash2, X } from "lucide-react";

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
}

export default function StudentMessages() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetUserId = searchParams.get("userId");
  const targetUserName = searchParams.get("name") || "Peer";
  
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
      if (targetUserId && targetUserId !== currentUserId) {
        const existingRoom = rooms.find(r => r.participants.includes(targetUserId));
        if (existingRoom) {
          setActiveChatId(existingRoom.id);
        } else {
          // We need to create a new room for them, but we'll do it lazily when they send the first message
          // For now, we'll set a temporary active state.
          setActiveChatId("new_" + targetUserId);
        }
      } else if (!activeChatId && rooms.length > 0) {
        setActiveChatId(rooms[0].id);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserId, targetUserId, activeChatId]);

  // 2. Fetch Peer Profiles dynamically to ensure we always have their real names
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId || !activeChatId) return;

    const messageText = newMessage.trim();
    setNewMessage("");
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
          lastMessage: messageText
        });
        roomId = newRoomRef.id;
        setActiveChatId(roomId);
        
        // Clear the URL param so it doesn't try to recreate
        navigate("/student/messages", { replace: true });
      } else {
        await updateDoc(doc(db, "directMessages", roomId), {
          updatedAt: serverTimestamp(),
          lastMessage: messageText
        });
      }

      await addDoc(collection(db, "directMessages", roomId, "messages"), {
        text: messageText,
        senderId: currentUserId,
        senderName: currentUserName,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error sending message:", err);
      setNewMessage(messageText); // restore on error
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

  const activeRoom = chatRooms.find(r => r.id === activeChatId);
  
  // Determine peer name for the active chat
  let activePeerName = "Chat";
  if (activeChatId?.startsWith("new_")) {
    activePeerName = peerProfiles[targetUserId || ""]?.name || targetUserName;
  } else if (activeRoom) {
    const peerId = activeRoom.participants.find(id => id !== currentUserId);
    if (peerId) {
      activePeerName = peerProfiles[peerId]?.name || activeRoom.participantNames[peerId] || "Peer";
    }
  }

  return (
    <DashboardLayout role="student">
      <div className="mx-auto max-w-6xl px-4 pt-2 pb-8 flex flex-col h-[calc(100vh-80px)]">
        <div className="mb-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Messages</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Direct messages with your peers</p>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
          
          {/* Sidebar / Inbox List */}
          <div className="w-1/3 border-r border-slate-200 dark:border-[#2A2A2A] bg-slate-50/50 dark:bg-[#121212] flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-[#2A2A2A]">
              <h2 className="font-semibold text-slate-900 dark:text-white">Conversations</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : chatRooms.length === 0 && !activeChatId?.startsWith("new_") ? (
                <div className="p-8 text-center text-slate-500">
                  <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-20" />
                  <p className="text-sm">No messages yet.</p>
                  <p className="text-xs mt-1">Find peers and start chatting!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-[#2A2A2A]">
                  {chatRooms.map(room => {
                    const peerId = room.participants.find(id => id !== currentUserId);
                    const peerName = peerId ? (peerProfiles[peerId]?.name || room.participantNames[peerId] || "Peer") : "Unknown";
                    const isActive = room.id === activeChatId;
                    
                    return (
                      <button
                        key={room.id}
                        onClick={() => setActiveChatId(room.id)}
                        className={`w-full text-left p-4 transition hover:bg-slate-100 dark:hover:bg-[#222222] ${
                          isActive ? "bg-indigo-50 dark:bg-indigo-500/10" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {peerName.charAt(0)}
                          </div>
                          <div className="overflow-hidden">
                            <h3 className={`truncate text-sm font-semibold ${isActive ? "text-indigo-700 dark:text-indigo-300" : "text-slate-900 dark:text-white"}`}>
                              {peerName}
                            </h3>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {room.lastMessage || "No messages yet"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {activeChatId?.startsWith("new_") && (
                    <div className="w-full text-left p-4 bg-indigo-50 dark:bg-indigo-500/10">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-200">
                          {(peerProfiles[targetUserId || ""]?.name || targetUserName).charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="truncate text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                            {peerProfiles[targetUserId || ""]?.name || targetUserName}
                          </h3>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Active Chat Area */}
          <div className="flex-1 flex flex-col bg-white dark:bg-[#181818]">
            {activeChatId ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-[#2A2A2A]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                    {activePeerName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900 dark:text-white">{activePeerName}</h2>
                  </div>
                </div>

                {/* Messages View */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 && !activeChatId.startsWith("new_") ? (
                    <div className="flex h-full items-center justify-center text-slate-500">
                      No messages yet. Say hi!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === currentUserId;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
                          <div className="flex flex-col gap-1 max-w-[70%]">
                            <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                              {/* Message bubble */}
                              <div className={`relative rounded-2xl px-4 py-2 text-sm shadow-sm transition-shadow group-hover:shadow ${
                                isMe 
                                  ? "bg-indigo-600 text-white rounded-tr-sm" 
                                  : "bg-slate-100 text-slate-900 dark:bg-[#2A2A2A] dark:text-white rounded-tl-sm"
                              }`}>
                                {editingMessageId === msg.id ? (
                                  <form onSubmit={(e) => handleUpdateMessage(e, msg.id)} className="flex items-center gap-2">
                                    <input 
                                      type="text" 
                                      autoFocus
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      className="rounded bg-indigo-700/50 px-2 py-1 text-white outline-none focus:ring-2 focus:ring-white/20"
                                    />
                                    <button type="button" onClick={() => setEditingMessageId(null)} className="text-white/70 hover:text-white">
                                      <X className="h-4 w-4" />
                                    </button>
                                  </form>
                                ) : (
                                  <p className="whitespace-pre-wrap">{msg.text}</p>
                                )}
                              </div>
                              
                              {/* Action Buttons (visible on hover) */}
                              {isMe && editingMessageId !== msg.id && (
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                  <button onClick={() => { setEditingMessageId(msg.id); setEditContent(msg.text); }} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-[#222222] dark:hover:text-indigo-400" title="Edit">
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => setDeleteMessageId(msg.id)} className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400" title="Delete">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            {/* Timestamp & Edited status */}
                            <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 ${isMe ? "justify-end" : "justify-start"}`}>
                              {msg.createdAt && <span>{formatTime(msg.createdAt)}</span>}
                              {msg.isEdited && <span>• Edited</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t border-slate-200 p-4 dark:border-[#2A2A2A]">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white dark:focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-slate-500">
                <div className="text-center">
                  <MessageSquare className="mx-auto mb-3 h-12 w-12 opacity-20" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      <ConfirmModal
        isOpen={!!deleteMessageId}
        onClose={() => setDeleteMessageId(null)}
        onConfirm={confirmDeleteMessage}
        title="Delete Message"
        description="Are you sure you want to delete this message?"
        confirmText="Yes, delete it"
        isLoading={isDeleting}
      />
    </DashboardLayout>
  );
}
