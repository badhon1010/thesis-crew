import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, FlaskConical, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "../../components/common/ThemeToggle";
import { auth } from "../../firebase/auth";
import { db } from "../../firebase/firestore";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">(location.state?.role || "student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
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
        const actualRole = userData.role;
        
        // Account Suspension Check
        if (userData.accountStatus === "suspended") {
          setError("Your account has been suspended. Please contact the administrator.");
          await signOut(auth);
          setLoading(false);
          return;
        }

        // Admin Role Restriction - Admins must use dedicated Admin Login
        if (actualRole === "admin") {
          setError("Admin accounts are not allowed to log in here. Please use Admin Login.");
          await signOut(auth);
          setLoading(false);
          return;
        }

        // Role Match Check
        if (actualRole !== role) {
          setError(`Access Denied! This account is registered as a ${actualRole}.`);
          await signOut(auth); // Log out the user
          setLoading(false);
          return;
        }

        // Role is correct, navigate to the appropriate dashboard
        if (actualRole === "teacher") {
          navigate("/teacher/dashboard");
        } else {
          navigate("/student/dashboard");
        }
      } else {
        // If no data is found in the database, navigate based on the selected role
        if (role === "teacher") {
          navigate("/teacher/dashboard");
        } else {
          navigate("/student/dashboard");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Invalid email or password. Please try again.");
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
                  Secure Portal Access
                </p>
                <h1 className="mt-5 text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 dark:text-white xl:text-5xl">
                  Research is better when the right people find each other.
                </h1>
                <p className="mt-6 max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-400">
                  Discover research opportunities, connect with supervisors, and build meaningful academic teams securely.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center bg-white px-6 py-12 dark:bg-[#000000]">
          <div className="absolute right-6 top-6 flex items-center gap-3">
            <Link
              to="/admin/login"
              title="Admin Login Portal"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-indigo-600 dark:border-[#2A2A2A] dark:bg-[#121212]/80 dark:text-slate-300 dark:hover:bg-[#181818] dark:hover:text-indigo-400"
            >
              <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Admin Login</span>
            </Link>
            <ThemeToggle />
          </div>

          <div className="w-full max-w-md">
            <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Sign in to continue your research journey.
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              
              {/* Role Selection Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${role === 'student' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#2A2A2A] dark:text-slate-400 dark:hover:bg-[#181818]'}`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${role === 'teacher' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#2A2A2A] dark:text-slate-400 dark:hover:bg-[#181818]'}`}
                >
                  Supervisor
                </button>
              </div>

              {error && (
                <div className="p-3.5 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
                  {error}
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
                  placeholder="you@university.edu"
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
                    placeholder="Enter your password"
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
                {loading ? "Authenticating..." : "Log in"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
              Don't have an account?{" "}
              <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                Create one
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}