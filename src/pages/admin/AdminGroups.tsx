import { useState, useEffect, useMemo } from "react";
import {
  FolderKanban,
  FileSpreadsheet,
  Download,
  Users,
  Search,
  Loader2,
} from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { db } from "@/firebase/firestore";

interface TeamDoc {
  projectId: string;
  topicTitle: string;
  supervisorId: string;
  memberIds: string[];
  maxTeamSize: number;
  createdAt?: unknown;
}

interface UserDoc {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  studentId?: string;
  designation?: string;
  accountStatus?: string;
  createdAt?: string;
}

interface TopicDoc {
  id: string;
  title: string;
  category: string;
  supervisorName?: string;
  status: string;
  applicationDeadline?: string;
  maxTeamSize: number;
  requiredSkills?: string[];
}

export default function AdminGroups() {
  const [teams, setTeams] = useState<TeamDoc[]>([]);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [topics, setTopics] = useState<TopicDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

    const unsubscribeTeams = onSnapshot(
      collection(db, "teams"),
      (snapshot) => {
        setTeams(snapshot.docs.map((d) => d.data() as TeamDoc));
        setLoading(false);
      },
      (error) => {
        console.error("Error loading teams:", error);
        setLoading(false);
      }
    );

    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setUsers(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserDoc, "id">) })));
      },
      (error) => console.error("Error loading users:", error)
    );

    const unsubscribeTopics = onSnapshot(
      collection(db, "researchTopics"),
      (snapshot) => {
        setTopics(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TopicDoc, "id">) })));
      },
      (error) => console.error("Error loading topics:", error)
    );

    return () => {
      unsubscribeTeams();
      unsubscribeUsers();
      unsubscribeTopics();
    };
  }, []);

  const filteredTeams = useMemo(() => {
    return teams.filter((t) =>
      t.topicTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [teams, searchQuery]);

  // Zero-dependency pure client-side CSV Generator
  const downloadCSV = (filename: string, rows: (string | number)[][]) => {
    const csvContent = rows
      .map((row) =>
        row
          .map((field) => {
            const stringified = String(field ?? "");
            // Escape double quotes and enclose in quotes if contains comma/quote/newline
            if (stringified.includes(",") || stringified.includes('"') || stringified.includes("\n")) {
              return `"${stringified.replace(/"/g, '""')}"`;
            }
            return stringified;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Users CSV
  const handleExportUsersCSV = () => {
    if (users.length === 0) return showToast("error", "No user data available to export.");

    const headers = ["User ID", "Full Name", "Email", "Role", "Department", "Student ID / Designation", "Account Status", "Created At"];
    const dataRows = users.map((u) => [
      u.id,
      u.name || "",
      u.email || "",
      u.role || "",
      u.department || "",
      u.role === "student" ? u.studentId || "" : u.designation || "",
      u.accountStatus || "active",
      u.createdAt || "",
    ]);

    downloadCSV(`ThesisCrew_Users_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...dataRows]);
    showToast("success", "Exported registered users to CSV.");
  };

  // Export Research Groups CSV
  const handleExportGroupsCSV = () => {
    if (teams.length === 0) return showToast("error", "No research group data available to export.");

    const headers = ["Project ID", "Topic Title", "Supervisor ID", "Members Count", "Max Capacity", "Member UIDs"];
    const dataRows = teams.map((t) => [
      t.projectId,
      t.topicTitle,
      t.supervisorId,
      t.memberIds?.length || 0,
      t.maxTeamSize,
      (t.memberIds || []).join("; "),
    ]);

    downloadCSV(`ThesisCrew_Research_Groups_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...dataRows]);
    showToast("success", "Exported research groups to CSV.");
  };

  // Export Research Topics CSV
  const handleExportTopicsCSV = () => {
    if (topics.length === 0) return showToast("error", "No topic data available to export.");

    const headers = ["Topic ID", "Title", "Category", "Supervisor Name", "Status", "Application Deadline", "Max Team Size", "Required Skills"];
    const dataRows = topics.map((t) => [
      t.id,
      t.title,
      t.category,
      t.supervisorName || "",
      t.status,
      t.applicationDeadline || "",
      t.maxTeamSize,
      (t.requiredSkills || []).join("; "),
    ]);

    downloadCSV(`ThesisCrew_Research_Topics_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...dataRows]);
    showToast("success", "Exported research topics to CSV.");
  };

  return (
    <DashboardLayout role="admin">
      <div className="mx-auto max-w-6xl px-2 sm:px-4">
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
              <FolderKanban className="h-3.5 w-3.5 text-indigo-500" />
              Project Oversight & Reporting
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Research Groups & CSV Export
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Inspect active research teams and generate 100% client-side CSV reports for official university records.
            </p>
          </div>
        </div>

        {/* CSV Export Card Section */}
        <div className="mb-8 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">CSV Data Export Center</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Download formatted CSV reports directly in your browser without third-party dependencies.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <button
              onClick={handleExportGroupsCSV}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-500 hover:shadow-md dark:border-[#2A2A2A] dark:bg-[#121212] dark:hover:border-indigo-500"
            >
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Research Groups CSV</p>
                <p className="text-[11px] text-slate-500">{teams.length} teams recorded</p>
              </div>
              <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </button>

            <button
              onClick={handleExportUsersCSV}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-emerald-500 hover:shadow-md dark:border-[#2A2A2A] dark:bg-[#121212] dark:hover:border-emerald-500"
            >
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Registered Users CSV</p>
                <p className="text-[11px] text-slate-500">{users.length} accounts recorded</p>
              </div>
              <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </button>

            <button
              onClick={handleExportTopicsCSV}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-amber-500 hover:shadow-md dark:border-[#2A2A2A] dark:bg-[#121212] dark:hover:border-amber-500"
            >
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Research Topics CSV</p>
                <p className="text-[11px] text-slate-500">{topics.length} topics recorded</p>
              </div>
              <Download className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </button>
          </div>
        </div>

        {/* Search Control */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search research groups by topic title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white"
            />
          </div>
        </div>

        {/* Groups Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {loading ? (
            <div className="col-span-2 flex h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-[#2A2A2A] dark:bg-[#181818]">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-[#2A2A2A] dark:bg-[#181818]">
              <Users className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">No active research teams found</p>
              <p className="mt-1 text-xs text-slate-500">Formed research teams will appear here as join requests are accepted.</p>
            </div>
          ) : (
            filteredTeams.map((team) => {
              const isFull = (team.memberIds?.length || 0) >= team.maxTeamSize;

              return (
                <div
                  key={team.projectId}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-200 dark:border-[#2A2A2A] dark:bg-[#181818]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        {isFull ? "Full Capacity Team" : "Forming Team"}
                      </span>
                      <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                        {team.topicTitle}
                      </h3>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3 py-1.5 text-right dark:bg-[#121212]">
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {team.memberIds?.length || 0} / {team.maxTeamSize}
                      </p>
                      <p className="text-[10px] text-slate-400">members</p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-[#2A2A2A]">
                    <p>Supervisor ID: <span className="font-semibold text-slate-700 dark:text-slate-300">{team.supervisorId}</span></p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
