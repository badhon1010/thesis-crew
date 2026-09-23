import { useState, useEffect } from "react";
import { Loader2, Save, ShieldCheck, Lock, Mail, UserCheck, Building, Phone, FileText } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { auth } from "@/firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface AdminProfileData {
  name: string;
  department: string;
  phone: string;
  bio: string;
}

export default function AdminProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [accountStatus, setAccountStatus] = useState<string>("active");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [formData, setFormData] = useState<AdminProfileData>({
    name: "",
    department: "",
    phone: "",
    bio: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserUid(user.uid);
        setAdminEmail(user.email || "");
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFormData({
              name: data.name || user.displayName || "",
              department: data.department || "System Administration",
              phone: data.phone || "",
              bio: data.bio || "",
            });
            if (data.accountStatus) {
              setAccountStatus(data.accountStatus);
            }
          }
        } catch (error) {
          console.error("Error fetching admin profile:", error);
          setErrorMsg("Failed to load profile data.");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUid) {
      setErrorMsg("You must be logged in as an administrator!");
      return;
    }

    if (!formData.name.trim()) {
      setErrorMsg("Full name cannot be empty.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const docRef = doc(db, "users", userUid);
      
      // Update only safe profile fields. Role and account security fields are explicitly NOT mutated here.
      await updateDoc(docRef, {
        name: formData.name.trim(),
        department: formData.department.trim(),
        phone: formData.phone.trim(),
        bio: formData.bio.trim(),
        updatedAt: new Date().toISOString(),
      });

      setSuccessMsg("Admin profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating admin profile:", error);
      setErrorMsg(error.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="mx-auto max-w-4xl px-2 sm:px-0">
        
        {/* Header */}
        <div className="mb-10 flex items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Admin Profile
              </h1>
              <span className="rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                Administrator
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Manage your administrator details and system contact information.
            </p>
          </div>
        </div>

        {/* Feedback Banners */}
        {errorMsg && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-6">
          
          {/* Read-Only System Identity Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-[#2A2A2A]">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Protected Account Identity
              </h2>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Read-only system attributes
              </span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email Address
                </label>
                <input
                  type="text"
                  disabled
                  value={adminEmail}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 cursor-not-allowed dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" /> System Role
                </label>
                <input
                  type="text"
                  disabled
                  value="Administrator (admin)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-indigo-600 cursor-not-allowed dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-indigo-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> User UID
                </label>
                <input
                  type="text"
                  disabled
                  value={userUid || ""}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-xs font-mono text-slate-500 cursor-not-allowed dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Account Status
                </label>
                <input
                  type="text"
                  disabled
                  value={accountStatus.toUpperCase()}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-emerald-600 cursor-not-allowed dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-emerald-400"
                />
              </div>
            </div>
          </section>

          {/* Editable Administrator Information Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-[#2A2A2A] dark:bg-[#181818]">
            <h2 className="mb-6 text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-4 dark:border-[#2A2A2A]">
              Personal Information
            </h2>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Admin Name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300 flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-slate-400" /> Department / Division
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-slate-400" /> Phone Contact Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. +880 1700-000000"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-slate-400" /> Bio / Notes
                </label>
                <textarea
                  name="bio"
                  rows={3}
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Brief admin profile bio or responsibility notes..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-50 dark:border dark:border-indigo-500/50 dark:shadow-[0_0_20px_rgba(79,70,229,0.3)]"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Save Profile Changes
            </button>
          </div>

        </form>
      </div>
    </DashboardLayout>
  );
}
