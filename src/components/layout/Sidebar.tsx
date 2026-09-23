import { useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  FlaskConical,
  X,
  SquarePen,
  SquareLibrary,
  Users,
  UserRoundPlus,
  UserCircle,
  FolderKanban,
  ShieldCheck,
} from "lucide-react";
import { auth } from "../../firebase/auth";
import { signOut } from "firebase/auth";

interface SidebarProps {
  role: "student" | "teacher" | "admin";
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

type SidebarLabelPhase = "closed" | "opening" | "open" | "closing";

function SidebarLabel({
  text,
  isCollapsed,
  className = "",
}: {
  text: string;
  isCollapsed: boolean;
  className?: string;
}) {
  const characters = Array.from(text);

  return (
    <span aria-hidden={isCollapsed} className={`dashboard-sidebar-label ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {characters.map((character, index) => (
          <span
            key={`${character}-${index}`}
            className="dashboard-sidebar-label-char"
            style={{
              transitionDelay: `${(isCollapsed ? characters.length - index - 1 : index) * 8}ms`,
            }}
          >
            {character}
          </span>
        ))}
      </span>
    </span>
  );
}

export function Sidebar({ role, isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [labelPhase, setLabelPhase] = useState<SidebarLabelPhase>(isCollapsed ? "closed" : "open");
  const previousCollapsed = useRef(isCollapsed);

  useLayoutEffect(() => {
    if (previousCollapsed.current === isCollapsed) {
      return;
    }
    previousCollapsed.current = isCollapsed;

    setLabelPhase(isCollapsed ? "closing" : "opening");

    const timeout = window.setTimeout(
      () => setLabelPhase(isCollapsed ? "closed" : "open"),
      isCollapsed ? 260 : 420,
    );

    return () => window.clearTimeout(timeout);
  }, [isCollapsed]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const links =
    role === "student"
      ? [
          { name: "Dashboard", path: "/student/dashboard", icon: LayoutDashboard },
          { name: "Research Topics", path: "/student/research-topics", icon: BookOpen },
          { name: "My Research Groups", path: "/student/my-groups", icon: Users },
        ]
      : role === "teacher"
      ? [
          { name: "Dashboard", path: "/teacher/dashboard", icon: LayoutDashboard },
          { name: "Create Research Topic", path: "/teacher/topics/create", icon: SquarePen },
          { name: "My Research Topics", path: "/teacher/topics", icon: SquareLibrary },
          { name: "Research Group", path: "/teacher/research-groups", icon: Users },
          { name: "Team Requests", path: "/teacher/requests", icon: UserRoundPlus }
        ]
      : [
          { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
          { name: "User Management", path: "/admin/users", icon: Users },
          { name: "Research Topics", path: "/admin/topics", icon: BookOpen },
          { name: "Research Groups", path: "/admin/groups", icon: FolderKanban },
          { name: "Admin Profile", path: "/admin/profile", icon: UserCircle },
        ];

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`dashboard-sidebar-backdrop fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        data-sidebar-collapsed={isCollapsed}
        data-sidebar-label-phase={labelPhase}
        className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/80 bg-white dark:border-[#2A2A2A] dark:bg-[#121212] ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="dashboard-sidebar-header flex h-20 items-center justify-between border-b border-slate-100 dark:border-slate-800/50">
          <button onClick={onToggleCollapse} className="dashboard-sidebar-brand flex items-center outline-none transition-opacity hover:opacity-80">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              <FlaskConical className="h-5 w-5" />
            </div>
            <SidebarLabel
              text="ThesisCrew"
              isCollapsed={isCollapsed}
              className="text-xl font-bold tracking-tight text-slate-900 dark:text-white"
            />
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="dashboard-sidebar-collapse-toggle absolute right-0 top-1/2 z-10 hidden h-7 w-7 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition-colors hover:bg-slate-50 hover:text-indigo-600 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-300 dark:hover:bg-[#222222] dark:hover:text-indigo-400 lg:flex"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {!isCollapsed && (
            <button
              onClick={onClose}
              className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="dashboard-sidebar-nav flex-1 space-y-2 overflow-x-hidden px-3 py-6">
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;

            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={onClose}
                title={isCollapsed ? link.name : undefined}
                className={`dashboard-sidebar-link group flex items-center rounded-xl text-sm font-semibold transition-colors duration-200 ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 shadow-[0_0_8px_rgba(0,0,0,0.15)] dark:shadow-[0_0_8px_rgba(0,0,0,0.35)]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-white"
                }`}
              >
                <Icon
                  className={`dashboard-sidebar-icon h-5 w-5 shrink-0 transition-colors ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                  }`}
                />
                <SidebarLabel text={link.name} isCollapsed={isCollapsed} />
              </Link>
            );
          })}
        </nav>

        <div className="dashboard-sidebar-footer space-y-2 border-t border-slate-100 dark:border-slate-800/80">
          {role === "admin" && !isCollapsed && (
            <div className="flex items-center gap-2 px-4 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Admin Mode</span>
            </div>
          )}
          {role === "admin" && isCollapsed && (
             <div className="flex justify-center py-1" title="Admin Mode">
               <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
             </div>
          )}

          <Link
            to={role === "student" ? "/student/profile" : role === "admin" ? "/admin/profile" : "/teacher/dashboard"}
            onClick={onClose}
            title={isCollapsed ? "Edit profile" : undefined}
            className="dashboard-sidebar-action flex items-center rounded-xl text-sm font-semibold text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
          >
            <UserCircle className="dashboard-sidebar-icon h-5 w-5 shrink-0 text-slate-400 transition-colors" />
            <SidebarLabel text="Edit profile" isCollapsed={isCollapsed} />
          </Link>

          <button
            onClick={handleLogout}
            title={isCollapsed ? "Log out" : undefined}
            className="dashboard-sidebar-action flex items-center rounded-xl text-sm font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <LogOut className="dashboard-sidebar-icon h-5 w-5 shrink-0 text-slate-400 transition-colors" />
            <SidebarLabel text="Log out" isCollapsed={isCollapsed} />
          </button>
        </div>
      </aside>
    </>
  );
}
