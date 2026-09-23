import { useState, useEffect } from "react";
import { Loader2, Save, UserCircle, X, Plus, Lock, Mail, Key, Eye, EyeOff, Camera } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { auth } from "@/firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { validateUiuEmail } from "@/utils/emailValidation";
import { onAuthStateChanged, updateEmail, updatePassword, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { ImageCropperModal } from "@/components/common/ImageCropperModal";
import { ToastAlert } from "@/components/common/ToastAlert";

interface TeacherProfileData {
  name: string;
  facultyInitial: string;
  department: string;
  designation: string;
  researchInterests: string;
  skills: string[];
  photoURL?: string;
}

export default function TeacherProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [userUid, setUserUid] = useState<string | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  
  // Account Security state
  const [accountEmail, setAccountEmail] = useState("");
  const [emailValidationError, setEmailValidationError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountSuccess, setAccountSuccess] = useState("");
  
  // Visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; type: "success" | "error"; message: string }>({
    show: false,
    type: "success",
    message: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ show: true, type, message });
  };

  const [formData, setFormData] = useState<TeacherProfileData>({
    name: "",
    facultyInitial: "",
    department: "",
    designation: "",
    researchInterests: "",
    skills: [],
  });

  // Fetch user profile data on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserUid(user.uid);
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFormData({
              name: data.name || user.displayName || "",
              facultyInitial: data.facultyInitial || data.facultyId || "",
              department: data.department || "",
              designation: data.designation || "",
              researchInterests: data.researchInterests || "",
              skills: data.skills || [],
              photoURL: data.photoURL || user.photoURL || "",
            });
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setLoading(false);
        }
        setAccountEmail(user.email || "");
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

  //Add skills
  const handleAddSkill = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && (e as React.KeyboardEvent).key !== 'Enter') return;
    e?.preventDefault(); // Prevent form submission
    
    const trimmedSkill = skillInput.trim();
    if (trimmedSkill && !formData.skills.includes(trimmedSkill)) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, trimmedSkill],
      }));
      setSkillInput("");
    }
  };

  // Remove skill
  const removeSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }));
  };

  // Update profile
  const handleSaveProfile = async () => {
    if (!userUid) return showToast("error", "You must be logged in!");
    setSaving(true);
    
    try {
      const docRef = doc(db, "users", userUid);
      await updateDoc(docRef, {
        name: formData.name,
        facultyInitial: formData.facultyInitial,
        department: formData.department,
        designation: formData.designation,
        researchInterests: formData.researchInterests,
        skills: formData.skills,
        photoURL: formData.photoURL,
      });
      showToast("success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("error", "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast("error", "Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setCropImageSrc(reader.result?.toString() || null);
    });
    reader.readAsDataURL(file);
    
    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const handleCropComplete = async (base64Url: string) => {
    setCropImageSrc(null); // Close modal
    if (!userUid || !auth.currentUser) return;

    // Just update local state for preview, it will be saved when "Save Profile" is clicked
    setFormData((prev) => ({ ...prev, photoURL: base64Url }));
    showToast("success", "Profile picture cropped! Click 'Save Profile' to save changes.");
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAccountEmail(val);
    
    if (!val || val === auth.currentUser?.email) {
      setEmailValidationError("");
      return;
    }
    
    const check = validateUiuEmail(val, "teacher");
    if (!check.isValid) {
      setEmailValidationError(check.message || "Enter a valid teacher email address.");
    } else {
      setEmailValidationError("");
    }
  };

  const handleUpdateEmail = async () => {
    if (!auth.currentUser) return;
    if (!accountEmail || emailValidationError) return;

    const emailCheck = validateUiuEmail(accountEmail, "teacher");
    if (!emailCheck.isValid) {
      setAccountError(emailCheck.message || "Invalid university email format.");
      return;
    }

    setAccountSaving(true);
    setAccountError("");
    setAccountSuccess("");
    try {
      await updateEmail(auth.currentUser, accountEmail);
      setAccountSuccess("Email updated successfully.");
    } catch (error: any) {
      if (error.code === "auth/requires-recent-login") {
        setAccountError("Please log out and log back in to change your email.");
      } else {
        setAccountError(error.message || "Failed to update email.");
      }
    } finally {
      setAccountSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!auth.currentUser || !auth.currentUser.email) return;
    if (!currentPassword) {
      setAccountError("Please enter your current password to verify.");
      return;
    }
    if (!newPassword || newPassword !== confirmPassword) {
      setAccountError("New passwords do not match or are empty.");
      return;
    }
    setAccountSaving(true);
    setAccountError("");
    setAccountSuccess("");
    try {
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Then update password
      await updatePassword(auth.currentUser, newPassword);
      setAccountSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setAccountError(error.message || "Failed to update password. Check your current password.");
    } finally {
      setAccountSaving(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailToReset = auth.currentUser?.email;
    if (!emailToReset) {
      setAccountError("No email associated with this account.");
      return;
    }
    setAccountSaving(true);
    setAccountError("");
    setAccountSuccess("");
    try {
      await sendPasswordResetEmail(auth, emailToReset);
      setAccountSuccess(`Password reset email sent to ${emailToReset}.`);
    } catch (error: any) {
      setAccountError(error.message || "Failed to send reset email.");
    } finally {
      setAccountSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="teacher">
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="teacher">
      <ToastAlert
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
      {cropImageSrc && (
        <ImageCropperModal
          imageSrc={cropImageSrc}
          onClose={() => setCropImageSrc(null)}
          onCropComplete={handleCropComplete}
        />
      )}
      <div className="mx-auto max-w-4xl px-2 sm:px-0">
        
        {/* Header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="relative group">
            <div className="flex h-24 w-24 shrink-0 overflow-hidden items-center justify-center rounded-full bg-indigo-50 text-indigo-600 border-4 border-white shadow-lg dark:border-[#181818] dark:bg-indigo-500/10 dark:text-indigo-400">
              {formData.photoURL ? (
                <img src={formData.photoURL} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <UserCircle className="h-12 w-12" />
              )}
            </div>
            <label 
              className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-white shadow-md transition-transform hover:scale-110 active:scale-95"
              title="Upload profile picture"
            >
              <Camera className="h-4 w-4" />
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageSelect} 
              />
            </label>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Teacher Profile
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Manage your professional information, research interests, and account security.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-[#2A2A2A] dark:bg-[#181818]">
            <h2 className="mb-6 text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-4 dark:border-[#2A2A2A]">
              Basic Information
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Faculty Initial / ID</label>
                <input
                  type="text"
                  name="facultyInitial"
                  value={formData.facultyInitial}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Designation</label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder="e.g., Professor, Assistant Professor, Lecturer"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          </section>

          {/* Research & Skills Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-[#2A2A2A] dark:bg-[#181818]">
            <h2 className="mb-6 text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-4 dark:border-[#2A2A2A]">
              Research & Expertise
            </h2>
            <div className="grid gap-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Research Interests</label>
                <input
                  type="text"
                  name="researchInterests"
                  value={formData.researchInterests}
                  onChange={handleChange}
                  placeholder="e.g., Artificial Intelligence, IoT, Web Development"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-300">Technical Skills / Specializations</label>
                
                {/* Add Skill Field */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    placeholder="Type a skill and press Enter..."
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-[#2A2A2A] dark:text-slate-300 dark:hover:bg-[#2a3143]"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                {/* Skill Tags Display */}
                {formData.skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-[#2A2A2A] dark:bg-[#181818]">
                    {formData.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="rounded-full p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-500/40"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Account Security Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-[#2A2A2A]">
              <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Account Security
              </h2>
            </div>
            
            {accountError && (
              <div className="mb-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                {accountError}
              </div>
            )}
            
            {accountSuccess && (
              <div className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                {accountSuccess}
              </div>
            )}

            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Change Email
                </h3>
                <div>
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={handleEmailChange}
                    placeholder="New Email Address"
                    className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:ring-1 dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500 ${
                      emailValidationError 
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-500/50" 
                        : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 dark:border-[#2A2A2A]"
                    }`}
                  />
                  {emailValidationError && (
                    <p className="mt-2 text-xs text-rose-500 dark:text-rose-400">
                      {emailValidationError}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleUpdateEmail}
                  disabled={accountSaving || !accountEmail || accountEmail === auth.currentUser?.email || !!emailValidationError}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-[#2A2A2A] dark:text-slate-300 dark:hover:bg-[#2a3143]"
                >
                  Update Email
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="h-4 w-4" /> Change Password
                </h3>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current Password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-10 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New Password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-10 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm New Password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-10 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white dark:placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleUpdatePassword}
                    disabled={accountSaving || !newPassword || !currentPassword || newPassword !== confirmPassword}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-[#2A2A2A] dark:text-slate-300 dark:hover:bg-[#2a3143]"
                  >
                    Update Password
                  </button>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={accountSaving}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <button
               type="button"
               onClick={handleSaveProfile}
               disabled={saving}
               className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-50 dark:border dark:border-indigo-500/50 dark:shadow-[0_0_20px_rgba(79,70,229,0.3)]"
            >
               {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
               Save Profile Changes
            </button>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
