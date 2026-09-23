import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";

export function AdminRoute() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          if (data.role === "admin" && data.accountStatus !== "suspended") {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error verifying admin role:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#fcfcfd] dark:bg-[#000000]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
