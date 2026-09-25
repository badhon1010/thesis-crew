import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  collection, query, where, onSnapshot, orderBy, 
  addDoc, serverTimestamp, doc, getDocs, updateDoc, setDoc
} from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { auth } from "@/firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Send, User as UserIcon, Loader2, ArrowLeft, MessageSquare } from "lucide-react";

interface DirectMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: any;
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const currentUserId = currentUser?.uid;
  const currentUserName = currentUser?.displayName || "Student";

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

  // 2. Fetch Messages for Active Chat
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

  // 3. Scroll to bottom
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

  const activeRoom = chatRooms.find(r => r.id === activeChatId);
  
  // Determine peer name for the active chat
  let activePeerName = "Chat";
  if (activeChatId?.startsWith("new_")) {
    activePeerName = targetUserName;
  } else if (activeRoom) {
    const peerId = activeRoom.participants.find(id => id !== currentUserId);
    if (peerId && activeRoom.participantNames[peerId]) {
      activePeerName = activeRoom.participantNames[peerId];
    }
  }

  return (
    <DashboardLayout role="student">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Messages</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Direct messages with your peers</p>
          </div>
        </div>

        <div className="flex h-[calc(100vh-200px)] min-h-[500px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
          
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
                    const peerName = peerId ? (room.participantNames[peerId] || "Peer") : "Unknown";
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
                          {targetUserName.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="truncate text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                            {targetUserName}
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
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                            isMe 
                              ? "bg-indigo-600 text-white rounded-tr-sm" 
                              : "bg-slate-100 text-slate-900 dark:bg-[#2A2A2A] dark:text-white rounded-tl-sm"
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
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
    </DashboardLayout>
  );
}
