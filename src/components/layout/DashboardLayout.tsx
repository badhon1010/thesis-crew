import { type ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "../common/ThemeToggle";
import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { StudentNotifications } from "../common/StudentNotifications";
import { AIChatWidget } from "../common/AIChatWidget";

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
              to={role === "student" ? "/student/profile" : role === "admin" ? "/admin/profile" : "/teacher/dashboard"}
              title="My Profile"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-blue-500/30 bg-blue-50 transition-colors hover:bg-blue-100 dark:border-[#3B82F6]/30 dark:bg-[#3B82F6]/10 dark:hover:bg-[#3B82F6]/20"
            >
              <span className="text-sm font-semibold text-blue-600 dark:text-[#3B82F6]">
                {role === "admin" ? "A" : "U"}
              </span>
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
