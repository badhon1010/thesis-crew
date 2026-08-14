import { type ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "../common/ThemeToggle";
import { Menu } from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardLayoutProps {
  children: ReactNode;
  role: "student" | "teacher";
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-900 selection:bg-indigo-500 selection:text-white dark:bg-[#070b19] dark:text-slate-100">
      {/* পপ-আপ সাইডবার কম্পোনেন্ট */}
      <Sidebar
        role={role}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* মেইন কনটেন্ট এরিয়া */}
      <div className="lg:pl-72 transition-all duration-300">
        
        {/* গ্লাস-ইফেক্ট হেডার */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-xl dark:border-slate-800/60 dark:bg-[#070b19]/80 lg:justify-end">
          
          {/* মোবাইল স্ক্রিনের জন্য মেনু টগল বাটন */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            {/* প্রোফাইল আইকনটিকে div থেকে Link এ পরিবর্তন করা হয়েছে */}
            <Link 
              to={role === "student" ? "/student/profile" : "/teacher/dashboard"}
              title="My Profile"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-50 transition-colors hover:bg-indigo-100 dark:border-indigo-500/35 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20"
            >
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                U
              </span>
            </Link>

          </div>
        </header>

        {/* আসল পেজের কনটেন্ট */}
        <main className="p-6 lg:p-10">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}