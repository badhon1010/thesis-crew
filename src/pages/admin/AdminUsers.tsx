import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Search,
  UserCheck,
  UserX,
  Mail,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";

interface UserAccount {
  id: string;
  name?: string;
  email?: string;
  role?: "student" | "teacher" | "admin";
  department?: string;
  studentId?: string;
  designation?: string;
  cgpa?: string;
  accountStatus?: "active" | "suspended";
  createdAt?: string;
}

export default function AdminUsers() {
  const [searchParams] = useSearchParams();
  const initialRoleFilter = searchParams.get("role") || "all";

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>(initialRoleFilter);
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // State for Suspend / Activate Confirm Modal
  const [targetUser, setTargetUser] = useState<UserAccount | null>(null);
  const [actionType, setActionType] = useState<"suspend" | "activate" | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{ show: boolean; type: "success" | "error"; message: string }>({
    show: false,
    type: "success",
    message: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3500);
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setUsers(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserAccount, "id">) })));
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load users:", error);
        showToast("error", "Failed to load user database.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Extract unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.department) set.add(u.department.trim());
    });
    return Array.from(set).sort();
  }, [users]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const nameMatch = (u.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const emailMatch = (u.email || "").toLowerCase().includes(searchQuery.toLowerCase());
      const deptMatchQuery = (u.department || "").toLowerCase().includes(searchQuery.toLowerCase());
      const idMatch = (u.studentId || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSearch = nameMatch || emailMatch || deptMatchQuery || idMatch;

      const matchesRole = roleFilter === "all" ? true : u.role === roleFilter;
      const matchesDept = deptFilter === "all" ? true : u.department === deptFilter;
      const currentStatus = u.accountStatus || "active";
      const matchesStatus = statusFilter === "all" ? true : currentStatus === statusFilter;

      return matchesSearch && matchesRole && matchesDept && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, deptFilter, statusFilter]);

  // Handle Suspend / Activate Execution
  const handleConfirmAction = async () => {
    if (!targetUser || !actionType) return;
    const newStatus = actionType === "suspend" ? "suspended" : "active";

    try {
      await updateDoc(doc(db, "users", targetUser.id), {
        accountStatus: newStatus,
      });
      showToast("success", `Account for ${targetUser.name || targetUser.email} was ${newStatus}.`);
    } catch (error) {
      console.error(`Error updating account status:`, error);
      showToast("error", `Could not ${actionType} account. Please try again.`);
    } finally {
      setTargetUser(null);
      setActionType(null);
    }
  };

  // Send Password Reset Email via Firebase Auth
  const handleSendPasswordReset = async (email?: string, name?: string) => {
    if (!email) {
      showToast("error", "User email address is missing.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      showToast("success", `Password reset email sent to ${name || email}.`);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      showToast("error", "Could not send password reset email.");
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="mx-auto max-w-6xl px-2 sm:px-0">
        <ToastAlert
          show={toast.show}
          type={toast.type}
          message={toast.message}
          duration={3500}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />

        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Users className="h-3.5 w-3.5 text-indigo-500" />
              User Governance
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              User Management
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Inspect student and supervisor accounts, filter by department, manage suspension, and issue reset links.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-300">
              Total Accounts: <strong className="text-slate-900 dark:text-white">{users.length}</strong>
            </span>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Search Field */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, ID, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-300"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="teacher">Supervisors / Teachers</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-300"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Department Filter Pills */}
        {departments.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Department:</span>
            <button
              onClick={() => setDeptFilter("all")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${deptFilter === "all" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}
            >
              All
            </button>
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setDeptFilter(dept)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${deptFilter === dept ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}
              >
                {dept}
              </button>
            ))}
          </div>
        )}

        {/* Users Table / List */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No users found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Department / Details</th>
                    <th className="px-6 py-4">Account Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#2A2A2A]">
                  {filteredUsers.map((user) => {
                    const status = user.accountStatus || "active";
                    const isSuspended = status === "suspended";

                    return (
                      <tr key={user.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-[#222]">
                        {/* User Column */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${user.role === "teacher" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : user.role === "admin" ? "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"}`}>
                              {user.name ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{user.name || "Unnamed User"}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role Column */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${user.role === "teacher" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : user.role === "admin" ? "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300" : "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"}`}>
                            {user.role === "teacher" ? <GraduationCap className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                            {user.role}
                          </span>
                        </td>

                        {/* Department / ID Column */}
                        <td className="px-6 py-4">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {user.department || "N/A"}
                          </p>
                          {user.role === "student" && user.studentId && (
                            <p className="text-[11px] text-slate-500">ID: {user.studentId} {user.cgpa ? `· CGPA ${user.cgpa}` : ""}</p>
                          )}
                          {user.role === "teacher" && user.designation && (
                            <p className="text-[11px] text-slate-500">{user.designation}</p>
                          )}
                        </td>

                        {/* Account Status Column */}
                        <td className="px-6 py-4">
                          {isSuspended ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                              <ShieldAlert className="h-3.5 w-3.5" /> Suspended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                              <ShieldCheck className="h-3.5 w-3.5" /> Active
                            </span>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            
                            {/* Password Reset Action */}
                            {user.email && (
                              <button
                                onClick={() => handleSendPasswordReset(user.email, user.name)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-300 dark:hover:bg-[#222]"
                                title="Send Password Reset Email"
                              >
                                <Mail className="h-3.5 w-3.5 text-indigo-500" /> Reset Password
                              </button>
                            )}

                            {/* Suspend / Activate Action (Don't suspend admins) */}
                            {user.role !== "admin" && (
                              isSuspended ? (
                                <button
                                  onClick={() => {
                                    setTargetUser(user);
                                    setActionType("activate");
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                                >
                                  <UserCheck className="h-3.5 w-3.5" /> Activate
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setTargetUser(user);
                                    setActionType("suspend");
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                                >
                                  <UserX className="h-3.5 w-3.5" /> Suspend
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {targetUser && actionType && (
        <ConfirmModal
          isOpen={!!targetUser}
          title={actionType === "suspend" ? `Suspend User Account?` : `Activate User Account?`}
          message={
            actionType === "suspend"
              ? `Are you sure you want to suspend ${targetUser.name || targetUser.email}? They will be blocked from logging into ThesisCrew until reactivated.`
              : `Are you sure you want to restore access for ${targetUser.name || targetUser.email}?`
          }
          confirmText={actionType === "suspend" ? "Suspend Account" : "Activate Account"}
          onConfirm={handleConfirmAction}
          onClose={() => {
            setTargetUser(null);
            setActionType(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
