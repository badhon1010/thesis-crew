import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, FlaskConical, ArrowRight, ArrowLeft, ShieldCheck, Lock } from "lucide-react";
import { ThemeToggle } from "../../components/common/ThemeToggle";
import { auth } from "../../firebase/auth";
import { db } from "../../firebase/firestore";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        // Account Suspension Check
        if (userData.accountStatus === "suspended") {
          setError("Your administrator account has been suspended. Please contact system management.");
          await signOut(auth);
          setLoading(false);
          return;
        }

        // Strict Admin Role Verification
        if (userData.role !== "admin") {
          setError(`Access Denied! Only administrator accounts can log in through the Admin Portal.`);
          await signOut(auth);
          setLoading(false);
          return;
        }

        // Successful Admin Login
        navigate("/admin/dashboard");
      } else {
        // User doc does not exist or missing role
        setError("Access Denied! Administrator profile not found.");
        await signOut(auth);
      }
    } catch (err: any) {
      console.error("Admin Login Error:", err);
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-900 selection:bg-indigo-500 selection:text-white dark:bg-[#000000] dark:text-slate-100 animate-slideIn">
      <div className="grid min-h-screen lg:grid-cols-[1fr_0.9fr]">
        
        {/* Left Branding Side */}
        <section className="relative hidden border-r border-slate-200/80 bg-slate-900 lg:flex dark:border-[#2A2A2A]/80 dark:bg-[#090d16]">
          <div className="flex w-full items-center justify-center px-12 xl:px-20">
            <div className="w-full max-w-xl">
              <Link to="/" className="inline-flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">
                  ThesisCrew
                </span>
              </Link>
              <div className="mt-16 max-w-lg">
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3.5 py-1.5 text-xs font-bold tracking-wider text-indigo-400 uppercase border border-indigo-500/20">
                  <ShieldCheck className="h-4 w-4" />
                  Admin Control Center
                </div>
                <h1 className="mt-5 text-4xl font-extrabold leading-[1.15] tracking-tight text-white xl:text-5xl">
                  Centralized System Administration & Governance
                </h1>
                <p className="mt-6 max-w-md text-base leading-relaxed text-slate-400">
                  Manage user permissions, monitor research groups, and oversee institutional academic topics securely.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Form Side */}
        <section className="relative flex min-h-screen items-center justify-center bg-white px-6 py-12 dark:bg-[#000000]">
          <div className="absolute right-6 top-6">
            <ThemeToggle />
          </div>

          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center justify-between">
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back to normal login
              </Link>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                <Lock className="h-5 w-5" />
              </div>
              <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                Admin Portal
              </span>
            </div>

            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Administrator Sign In
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Sign in with your admin credentials to access system management.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="mt-8 space-y-5">
              
              {error && (
                <div className="p-3.5 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Admin Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@thesiscrew.edu"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Authenticating Admin..." : "Log In to Admin Portal"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="mt-8 rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-xs text-slate-500 dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Notice:</span> Access to this section is monitored and restricted to authorized system administrators only.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
