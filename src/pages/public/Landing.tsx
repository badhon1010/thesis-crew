import React from "react";
import { Link } from "react-router-dom";
import { FlaskConical, ArrowRight, ShieldCheck, Users, Sparkles, CheckCircle2, Cpu } from "lucide-react";
import { ThemeToggle } from "../../components/common/ThemeToggle";

export default function Landing() {
  // Function to handle smooth scrolling to sections
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      const offsetTop = element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-900 selection:bg-indigo-500 selection:text-white dark:bg-[#000000] dark:text-slate-100">
      
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-[#2A2A2A]/60 dark:bg-[#121212]/80">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          
          {/* Logo (Original Indigo & Violet) */}
          <div className="flex items-center gap-3 transition-transform duration-300 hover:scale-105">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
              <FlaskConical className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              ThesisCrew
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex">
            <a href="#features" onClick={(e) => handleScroll(e, "features")} className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">Features</a>
            <a href="#workflow" onClick={(e) => handleScroll(e, "workflow")} className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">Workflow</a>
            <a href="#about" onClick={(e) => handleScroll(e, "about")} className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">About</a>
          </nav>

          {/* Theme Toggle and Authentication Buttons (Original Indigo)*/}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              to="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#181818] dark:hover:text-white"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 dark:hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-36">
        {/* Animated Background Glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/4 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-indigo-600/10 blur-[120px] duration-[4000ms] dark:bg-indigo-600/15" />

        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <span className="inline-flex animate-fade-in-up items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-600 shadow-inner dark:border-indigo-500/35 dark:bg-indigo-500/10 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" /> University Thesis & Research Management System
          </span>

          <h1 className="mt-8 text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:text-7xl">
            Accelerate your academic research with <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400">intelligent collaboration.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400 sm:text-xl">
            A centralized platform connecting ambitious students with expert supervisors to publish, manage, and execute high-impact research projects.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 text-sm font-semibold text-white shadow-xl shadow-indigo-600/30 transition-all hover:-translate-y-1 hover:bg-indigo-500 sm:w-auto dark:hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
            >
              Explore Research Topics <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              state={{ role: "teacher" }}
              className="flex h-13 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-8 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-1 hover:bg-slate-50 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-slate-300 dark:hover:bg-[#181818] dark:hover:text-white sm:w-auto"
            >
              Supervisor Login
            </Link>
          </div>

          {/* Statistics */}
          <div className="mt-20 flex flex-wrap justify-center gap-12 border-t border-slate-200/80 pt-12 dark:border-[#2A2A2A] sm:gap-24">
            <div className="transition-transform hover:scale-105">
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">100%</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Secure Cloud Sync</p>
            </div>
            <div className="transition-transform hover:scale-105">
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">Real-time</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Supervisor Review</p>
            </div>
            <div className="transition-transform hover:scale-105">
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">Smart</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Team Allocation</p>
            </div>
            <div className="transition-transform hover:scale-105">
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">UIU CSE</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Academic Standard</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="scroll-mt-20 border-t border-slate-200/80 bg-slate-50/50 py-24 dark:border-[#2A2A2A] dark:bg-[#0A0A0A]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Core Capabilities</h2>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Everything needed for a successful thesis lifecycle.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-[#2A2A2A] dark:bg-[#181818] dark:hover:border-indigo-500/50 dark:hover:shadow-[0_8px_30px_rgba(79,70,229,0.1)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-transform group-hover:scale-110 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-white">Smart Team Matching</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Form balanced research groups by evaluating individual technical skill sets, CGPA thresholds, and academic interests.
              </p>
            </div>

            <div className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-[#2A2A2A] dark:bg-[#181818] dark:hover:border-indigo-500/50 dark:hover:shadow-[0_8px_30px_rgba(79,70,229,0.1)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-transform group-hover:scale-110 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-white">Verified Supervisor Topics</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Browse through structured research proposals published directly by faculty members with predefined objectives.
              </p>
            </div>

            <div className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-[#2A2A2A] dark:bg-[#181818] dark:hover:border-indigo-500/50 dark:hover:shadow-[0_8px_30px_rgba(79,70,229,0.1)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-transform group-hover:scale-110 dark:bg-indigo-500/10 dark:text-indigo-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-white">Role-Based Security</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Strict segregation between student and supervisor accounts powered by Firebase Authentication and Firestore rules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="scroll-mt-20 border-t border-slate-200/80 py-24 dark:border-[#2A2A2A] dark:bg-[#000000]">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Streamlined Workflow</span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                How ThesisCrew connects researchers.
              </h2>
              <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-400">
                Our platform removes administrative friction from academic research management, letting students and supervisors focus purely on innovation.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "Supervisors publish structured research topics with skill requirements.",
                  "AI-Powered Matchmaking analyzes student skills for perfect topic alignment.",
                  "Students form teams and send join requests for supervisor approval.",
                  "Collaborate in a dedicated workspace with milestones, tasks, and document repositories.",
                  "Leverage AI to extract PDF metadata and auto-generate APA/IEEE citations."
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 transition-transform hover:translate-x-2">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Terminal-style Card with Hover Glow */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-xl transition-all duration-500 hover:shadow-indigo-500/10 dark:border-[#2A2A2A] dark:bg-[#121212] dark:hover:border-indigo-500/30 dark:hover:shadow-[0_0_30px_rgba(79,70,229,0.15)]">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-[#2A2A2A]">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-2 font-mono text-xs text-slate-400">thesiscrew-portal.system</span>
              </div>
              <div className="mt-6 space-y-3 font-mono text-xs text-indigo-600 dark:text-indigo-300">
                <p className="text-slate-500 dark:text-slate-400">// System initialization successful</p>
                <p className="transition-opacity duration-300 group-hover:opacity-80">&gt; auth_status: verified_role_secure</p>
                <p className="transition-opacity duration-500 group-hover:opacity-80">&gt; database: firestore_connected</p>
                <p className="text-emerald-600 transition-opacity duration-700 dark:text-emerald-400">&gt; portal_ready: ready_for_lab_defense</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="scroll-mt-20 border-t border-slate-200/80 bg-slate-50/50 py-20 text-center dark:border-[#2A2A2A] dark:bg-[#0A0A0A]">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">About ThesisCrew</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
            Developed to bridge the gap between academic mentorship and student innovation. Designed specifically for university final year thesis and advanced project coordination.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 dark:border-[#2A2A2A] dark:bg-[#000000]">
        <div className="mx-auto max-w-7xl px-6 text-center text-xs text-slate-500 lg:px-8">
          <p>© {new Date().getFullYear()} ThesisCrew Academic System.</p>
        </div>
      </footer>
    </div>
  );
}