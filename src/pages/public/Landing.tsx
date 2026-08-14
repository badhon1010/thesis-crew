import { Link } from "react-router-dom";
import { FlaskConical, ArrowRight, ShieldCheck, Users, Sparkles, CheckCircle2, Cpu } from "lucide-react";
import { ThemeToggle } from "../../components/common/ThemeToggle";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-900 selection:bg-indigo-500 selection:text-white dark:bg-[#070b19] dark:text-slate-100">
      {/* নেভিগেশন বার, থিম টগল ও স্ক্রোলিং সেকশন লিংকস */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800/60 dark:bg-[#070b19]/80">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          
          {/* লোগো */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
              <FlaskConical className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              ThesisCrew
            </span>
          </div>

          {/* নেভিগেশন সেকশন বাটনগুলো */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Features</a>
            <a href="#workflow" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">Workflow</a>
            <a href="#about" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">About</a>
          </nav>

          {/* থিম টগল ও অথেনটিকেশন বাটন */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              to="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* হিরো সেকশন */}
      <section className="relative overflow-hidden py-24 lg:py-36">
        <div className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[700px] rounded-full bg-indigo-600/10 dark:bg-indigo-600/15 blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-600 dark:border-indigo-500/35 dark:bg-indigo-500/10 dark:text-indigo-300 shadow-inner">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" /> University Thesis & Research Management System
          </span>

          <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl leading-[1.15] dark:text-white">
            Accelerate your academic research with <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400 bg-clip-text text-transparent">intelligent collaboration.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400 sm:text-xl">
            A centralized platform connecting ambitious students with expert supervisors to publish, manage, and execute high-impact research projects.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 text-sm font-semibold text-white shadow-xl shadow-indigo-600/30 transition hover:bg-indigo-500 sm:w-auto"
            >
              Explore Research Topics <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="flex h-13 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-8 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white sm:w-auto"
            >
              Supervisor Login
            </Link>
          </div>

          {/* ট্রাস্ট ব্যাজ / স্ট্যাটিস্টিক্স */}
          <div className="mt-20 grid grid-cols-2 gap-6 border-t border-slate-200/80 pt-12 dark:border-slate-800/80 sm:grid-cols-4">
            <div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">100%</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Secure Cloud Sync</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">Real-time</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Supervisor Review</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">Smart</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Team Allocation</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">UIU CSE</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Academic Standard</p>
            </div>
          </div>
        </div>
      </section>

      {/* মূল ফিচারসমূহ (Features Section) */}
      <section id="features" className="border-t border-slate-200/80 bg-slate-50/50 py-24 dark:border-slate-800/80 dark:bg-[#090e1f] scroll-mt-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Core Capabilities</h2>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Everything needed for a successful thesis lifecycle.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-indigo-500/50 dark:border-slate-800/80 dark:bg-[#0f172a]/60">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-white">Smart Team Matching</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Form balanced research groups by evaluating individual technical skill sets, CGPA thresholds, and academic interests.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-indigo-500/50 dark:border-slate-800/80 dark:bg-[#0f172a]/60">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-white">Verified Supervisor Topics</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Browse through structured research proposals published directly by faculty members with predefined objectives.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-indigo-500/50 dark:border-slate-800/80 dark:bg-[#0f172a]/60">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
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

      {/* ওয়ার্কফ্লো সেকশন (Workflow Section) */}
      <section id="workflow" className="py-24 border-t border-slate-200/80 dark:border-slate-800/80 scroll-mt-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Streamlined Workflow</span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                How ThesisCrew connects researchers.
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed dark:text-slate-400">
                Our platform removes administrative friction from academic research management, letting students and supervisors focus purely on innovation.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "Supervisors publish structured research topics with skill requirements.",
                  "Students apply with custom team sizes and academic credentials.",
                  "Real-time status tracking from pending review to project approval."
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#0f172a]/80">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs text-slate-400 font-mono">thesiscrew-portal.system</span>
              </div>
              <div className="mt-6 space-y-3 font-mono text-xs text-indigo-600 dark:text-indigo-300">
                <p className="text-slate-500 dark:text-slate-400">// System initialization successful</p>
                <p>&gt; auth_status: verified_role_secure</p>
                <p>&gt; database: firestore_connected</p>
                <p className="text-emerald-600 dark:text-emerald-400">&gt; portal_ready: ready_for_lab_defense</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* এবাউট সেকশন (About Section) */}
      <section id="about" className="py-20 border-t border-slate-200/80 bg-slate-50/50 dark:border-slate-800/80 dark:bg-[#090e1f] text-center scroll-mt-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">About ThesisCrew</h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
            Developed to bridge the gap between academic mentorship and student innovation. Designed specifically for university final year thesis and advanced project coordination.
          </p>
        </div>
      </section>

      {/* ফুটার */}
      <footer className="border-t border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-[#050813]">
        <div className="mx-auto max-w-7xl px-6 text-center text-xs text-slate-500 lg:px-8">
          <p>© {new Date().getFullYear()} ThesisCrew Academic System. Designed for Advanced Software Engineering Lab Presentation.</p>
        </div>
      </footer>
    </div>
  );
}