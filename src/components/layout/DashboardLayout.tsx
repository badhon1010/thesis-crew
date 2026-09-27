import { type ReactNode, useState, useEffect } from "react";
import { auth } from "@/firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getFirestore, onSnapshot } from "firebase/firestore";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "../common/ThemeToggle";
import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { StudentNotifications } from "../common/StudentNotifications";
import { AIChatWidget } from "../common/AIChatWidget";
import { UserAvatar } from "../common/UserAvatar";

interface DashboardLayoutProps {
  children: ReactNode;
  role: "student" | "teacher" | "admin";
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebarCollapsed") === "true";
    }
    return false;
  });
  
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestore();
    let unsubscribeDoc: (() => void) | undefined;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = undefined;
      }
      
      if (user) {
        // Fallback to auth photoURL initially
        setPhotoURL(user.photoURL);
        
        // Listen to Firestore for updates (handles large Base64 images)
        unsubscribeDoc = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists() && docSnap.data().photoURL) {
            setPhotoURL(docSnap.data().photoURL);
          }
        });
      } else {
        setPhotoURL(null);
      }
    });
    
    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem("sidebarCollapsed", String(newState));
      return newState;
    });
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-900 selection:bg-blue-500 selection:text-white dark:bg-[#000000] dark:text-slate-100">
      {/* Popup sidebar component */}
      <Sidebar
        role={role}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Main content area */}
      <div className="dashboard-main" data-sidebar-collapsed={isCollapsed}>
        
        {/* Glass effect header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-xl dark:border-[#2A2A2A]/60 dark:bg-[#121212]/80 lg:justify-end">
          
          {/* Mobile screen toggle button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 dark:border-[#2A2A2A] dark:text-slate-300 dark:hover:bg-[#181818] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            {role !== "admin" && <StudentNotifications role={role} />}
            
            {/* Profile Icon */}
            <Link 
              to={role === "student" ? "/student/profile" : role === "admin" ? "/admin/profile" : "/teacher/profile"}
              title="My Profile"
              className="flex items-center justify-center transition-colors cursor-pointer"
            >
              <UserAvatar 
                userId={auth.currentUser?.uid || ""} 
                name={auth.currentUser?.displayName || (role === "admin" ? "Admin" : "User")} 
                photoURL={photoURL || undefined}
                className="h-10 w-10 text-sm ring-2 ring-blue-500/30"
              />
            </Link>

          </div>
        </header>

        {/* Actual page content */}
        <main className="p-6 lg:p-10">
          <div
            className="dashboard-page-content mx-auto w-full max-w-[1600px]"
            data-sidebar-collapsed={isCollapsed}
          >
            {children}
          </div>
        </main>
      </div>
      
      {/* Global AI Chat Widget */}
      <AIChatWidget />
    </div>
  );
}
