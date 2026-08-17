import { ArrowLeft, ArrowRight, Check, FlaskConical } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "../../components/common/ThemeToggle";
import { ToastAlert } from "../../components/common/ToastAlert";
import { validateUiuEmail } from "../../utils/emailValidation";
import { auth } from "../../firebase/auth";
import { db } from "../../firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"student" | "teacher">("student");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [designation, setDesignation] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [researchInterests, setResearchInterests] = useState("");
  const [researchAreas, setResearchAreas] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    const emailCheck = validateUiuEmail(email, role);
    if (!emailCheck.isValid) {
      setError(emailCheck.message || "Invalid university email format.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userData: any = {
        uid: user.uid,
        name: name,
        email: email,
        role: role,
        department: department,
        createdAt: new Date().toISOString(),
      };

      if (role === "student") {
        userData.studentId = universityId;
        userData.cgpa = cgpa;
        userData.researchInterests = researchInterests;
      } else {
        userData.designation = designation;
        userData.researchAreas = researchAreas;
      }

      await setDoc(doc(db, "users", user.uid), userData);
      await signOut(auth);

      // Trigger 3-second success toast notification
      setToastMessage("Account registered successfully! Redirecting...");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleToastClose = () => {
    setToastMessage("");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-900 selection:bg-indigo-500 selection:text-white dark:bg-[#000000] dark:text-slate-100 animate-slideIn">
      {toastMessage && (
        <ToastAlert message={toastMessage} type="success" onClose={handleToastClose} duration={3000} />
      )}

      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-[#2A2A2A]/60 dark:bg-[#121212]/80">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link to="/">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
                <FlaskConical className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                ThesisCrew
              </span>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 lg:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="mt-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-600 dark:border-indigo-500/35 dark:bg-indigo-500/10 dark:text-indigo-300">
            Registration Portal
          </span>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Create your ThesisCrew account
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Tell us a little about yourself so we can personalize your research workspace.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#121212] sm:p-8">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            I am joining as a...
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              {
                value: "student" as const,
                title: "Student",
                description: "Find research opportunities and teams.",
              },
              {
                value: "teacher" as const,
                title: "Teacher / Supervisor",
                description: "Publish topics and guide research teams.",
              },
            ].map((item) => (
              <button
                type="button"
                key={item.value}
                onClick={() => setRole(item.value)}
                className={`relative rounded-xl border p-4 text-left transition-all ${
                  role === item.value
                    ? "border-indigo-600 bg-indigo-50 text-slate-900 dark:border-indigo-500 dark:bg-indigo-500/15 dark:text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {role === item.value && (
                  <span className="absolute right-3.5 top-3.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                    <Check className="h-3 w-3" />
                  </span>
                )}

                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 pr-5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {item.description}
                </p>
              </button>
            ))}
          </div>

          <div className="my-8 h-px bg-slate-100 dark:bg-[#2A2A2A]" />

          {error && (
            <div className="mb-6 p-3.5 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                label="Full name *"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Field
                label="University email *"
                placeholder={role === "student" ? "student@bscse.uiu.ac.bd" : "faculty@cse.uiu.ac.bd"}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Field
                label="Department"
                placeholder="Computer Science & Engineering"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />

              {role === "student" ? (
                <Field
                  label="University ID"
                  placeholder="Enter your ID"
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                />
              ) : (
                <Field
                  label="Designation"
                  placeholder="Assistant Professor"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                />
              )}

              <Field
                label="Password *"
                placeholder="Create a password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Field
                label="Confirm password *"
                placeholder="Repeat your password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              {role === "student" && (
                <>
                  <Field
                    label="CGPA"
                    placeholder="e.g. 3.72"
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                  />

                  <Field
                    label="Research interests"
                    placeholder="AI, ML, Computer Vision"
                    value={researchInterests}
                    onChange={(e) => setResearchInterests(e.target.value)}
                  />
                </>
              )}

              {role === "teacher" && (
                <div className="sm:col-span-2">
                  <Field
                    label="Research areas"
                    placeholder="Machine Learning, IoT, Data Science"
                    value={researchAreas}
                    onChange={(e) => setResearchAreas(e.target.value)}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-8 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create account"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  required,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
        {label}
      </label>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
      />
    </div>
  );
}