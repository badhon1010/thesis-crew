import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/90">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link to="/">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-slate-600 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-slate-600 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
            How it works
          </a>
          <a href="#research" className="text-sm text-slate-600 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
            Research
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Link
            to="/login"
            className="hidden rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:block dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Log in
          </Link>

          <Link
            to="/register"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Get started
          </Link>

          <button className="ml-1 rounded-xl p-2 text-slate-600 md:hidden dark:text-slate-300">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}