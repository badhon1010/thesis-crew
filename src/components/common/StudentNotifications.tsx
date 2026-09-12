import { useEffect, useMemo, useState, useRef } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, query, updateDoc, where, type Unsubscribe } from "firebase/firestore";
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";
import type { AppNotification } from "@/firebase/notifications";

function notificationTime(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate() as Date;
  return new Date(0);
}

export function StudentNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsubscribeNotifications: Unsubscribe | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeNotifications?.();
      if (!user) { setNotifications([]); return; }
      unsubscribeNotifications = onSnapshot(query(collection(db, "notifications"), where("recipientId", "==", user.uid)), (snapshot) => {
        setNotifications(snapshot.docs
          .map((notification) => ({ id: notification.id, ...(notification.data() as Omit<AppNotification, "id">) }))
          .sort((a, b) => notificationTime(b.createdAt).getTime() - notificationTime(a.createdAt).getTime()));
      }, (error) => console.error("Failed to subscribe to notifications:", error));
    });
    return () => { unsubscribeAuth(); unsubscribeNotifications?.(); };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadNotifications = useMemo(() => notifications.filter((notification) => !notification.read), [notifications]);
  const unreadCount = unreadNotifications.length;

  const markAllRead = async () => {
    if (!unreadNotifications.length) return;
    setMarkingRead(true);
    try {
      await Promise.all(unreadNotifications.map((notification) => updateDoc(doc(db, "notifications", notification.id), { read: true })));
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    } finally {
      setMarkingRead(false);
    }
  };

  const markRead = async (notification: AppNotification) => {
    if (notification.read) return;
    try { await updateDoc(doc(db, "notifications", notification.id), { read: true }); } catch (error) { console.error("Failed to mark notification as read:", error); }
  };

  return <div className="relative" ref={dropdownRef}><button type="button" aria-label="Notifications" onClick={() => setIsOpen((open) => !open)} className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 dark:border-[#2A2A2A] dark:text-slate-300 dark:hover:bg-[#181818]"><Bell className="h-5 w-5" />{unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}</button>{isOpen && <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-[#2A2A2A] dark:bg-[#181818]"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-[#2A2A2A]"><p className="text-sm font-bold text-slate-900 dark:text-white">Notifications</p><button type="button" disabled={markingRead || unreadCount === 0} onClick={markAllRead} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 disabled:opacity-40 dark:text-indigo-400">{markingRead ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}Mark all read</button></div><div className="max-h-96 overflow-y-auto">{unreadNotifications.length ? unreadNotifications.slice(0, 8).map((notification) => <Link key={notification.id} onClick={() => { void markRead(notification); setIsOpen(false); }} to={`/student/research-topics/${notification.topicId}`} className={`block border-b border-slate-100 px-4 py-3 transition hover:bg-slate-50 dark:border-[#2A2A2A] dark:hover:bg-[#222222] bg-indigo-50/70 dark:bg-indigo-500/10`}><p className="text-sm font-semibold text-slate-900 dark:text-white">{notification.title}</p><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{notification.message}</p></Link>) : <p className="px-4 py-8 text-center text-sm text-slate-500">You are all caught up.</p>}</div></div>}</div>;
}
