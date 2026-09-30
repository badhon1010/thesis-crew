import { useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, ArrowRight, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "../../components/common/ThemeToggle";
import { auth } from "../../firebase/auth";
import { sendPasswordResetEmail } from "firebase/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Password reset email sent! Please check your inbox.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send password reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-900 selection:bg-indigo-500 selection:text-white dark:bg-[#000000] dark:text-slate-100 animate-slideIn">
      <div className="grid min-h-screen lg:grid-cols-[1fr_0.9fr]">
        
        <section className="relative hidden border-r border-slate-200/80 bg-slate-50/50 lg:flex dark:border-[#2A2A2A]/80 dark:bg-[#121212]">
          <div className="flex w-full items-center justify-center px-12 xl:px-20">
            <div className="w-full max-w-xl">
              <Link to="/" className="inline-flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  ThesisCrew
                </span>
              </Link>
              <div className="mt-16 max-w-lg">
                <p className="text-xs font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
                  Account Recovery
                </p>
                <h1 className="mt-5 text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 dark:text-white xl:text-5xl">
                  Regain access to your research portal.
                </h1>
                <p className="mt-6 max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-400">
                  Enter your email address to receive a secure link to reset your password and get back to your research.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center bg-white px-6 py-12 dark:bg-[#000000]">
          <div className="absolute right-6 top-6 flex items-center gap-3">
            <ThemeToggle />
          </div>

          <div className="w-full max-w-md">
            <Link to="/login" className="mb-10 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>

            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Forgot Password
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Enter your email to receive a password reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              
              {error && (
                <div className="p-3.5 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3.5 bg-emerald-50 text-emerald-600 text-sm rounded-xl border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400">
                  {success}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student@bscse.uiu.ac.bd / faculty@cse.uiu.ac.bd"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Sending link..." : "Send reset link"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
