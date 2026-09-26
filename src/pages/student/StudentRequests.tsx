import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, Loader2, FolderKanban, CheckCircle2, XCircle } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";
import type { JoinRequest } from "@/firebase/teamFormation";

export default function StudentRequests() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    let unsubscribeRequests: Unsubscribe | undefined;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeRequests?.();
      
      if (!user) {
        setRequests([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      const q = query(
        collection(db, "joinRequests"), 
        where("studentId", "==", user.uid)
      );

      unsubscribeRequests = onSnapshot(
        q,
        (snapshot) => {
          const reqs = snapshot.docs.map((doc) => ({ 
            id: doc.id, 
            ...(doc.data() as Omit<JoinRequest, "id">) 
          }));
          
          reqs.sort((a, b) => {
            const timeA = (a.createdAt as any)?.seconds || 0;
            const timeB = (b.createdAt as any)?.seconds || 0;
            return timeB - timeA;
          });
          
          setRequests(reqs);
          setLoading(false);
        },
        (error) => {
          console.error("Failed to subscribe to student requests:", error);
          setToast({ type: "error", message: "Could not load your requests." });
          setLoading(false);
        }
      );
    });

    return () => { 
      unsubscribeAuth(); 
      unsubscribeRequests?.(); 
    };
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Accepted
          </span>
        );
      case "rejected":
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <XCircle className="h-3.5 w-3.5" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <Clock3 className="h-3.5 w-3.5" />
            Pending
          </span>
        );
    }
  };

  return (
    <DashboardLayout role="student">
      <div className="mx-auto max-w-6xl px-2 sm:px-4">
        {toast && <ToastAlert type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Link to="/student/dashboard" className="mb-3 inline-flex text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              My Requests
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              View the status of your applications to research topics.
            </p>
          </div>
          <span className="w-fit rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
            {requests.length} Total Requests
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-[#2A2A2A]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                <FolderKanban className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Sent Applications</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Track your application status</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
          ) : requests.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FolderKanban className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                You haven't sent any requests yet.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Go to Research Topics to find and apply for a project.
              </p>
              <Link 
                to="/student/research-topics" 
                className="mt-6 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-500"
              >
                Browse Topics
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#2A2A2A]">
              {requests.map((request) => (
                <div key={request.id} className="p-6 transition-colors hover:bg-slate-50 dark:hover:bg-[#1f1f1f]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          {request.topicTitle}
                        </h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Type: <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{request.requestType} Application</span>
                      </p>
                      
                      {request.requestType === "group" && request.teamMembers && (
                        <div className="mt-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Team Members ({request.teamMembers.length + 1})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {/* Leader */}
                            <div className="flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/50 px-2.5 py-1 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-200 text-[9px] font-bold text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-300">
                                {request.studentName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                                {request.studentName} <span className="opacity-70">(Leader)</span>
                              </span>
                            </div>
                            
                            {/* Other Members */}
                            {request.teamMembers.map(member => (
                              <div key={member.uid} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-[#2A2A2A] dark:bg-[#181818]">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                  {member.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                  {member.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {request.message && (
                        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Your Message</p>
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{request.message}</p>
                        </div>
                      )}

                      {request.status === "rejected" && request.feedback && (
                        <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50/50 p-4 dark:border-rose-900/30 dark:bg-rose-950/20">
                          <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Feedback from Teacher</p>
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{request.feedback}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex shrink-0 items-center">
                      <Link 
                        to={`/student/research-topics/${request.projectId}`}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        View Topic →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
