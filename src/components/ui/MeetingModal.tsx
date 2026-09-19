import React, { useState, useEffect } from "react";
import { X, Check, Video, Link as LinkIcon, Calendar, MapPin } from "lucide-react";

interface TeamMember {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  department?: string;
}

export type MeetingPlatform = "zoom" | "google-meet" | "google-classroom" | "teams" | "custom";

export interface MeetingFormData {
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. 10:30 AM
  duration: string;
  type?: "online" | "offline";
  location?: string;
  platform?: MeetingPlatform | "";
  meetingLink?: string;
  agenda: string;
  attendees: string[];
}

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MeetingFormData) => Promise<void>;
  editingMeeting?: (MeetingFormData & { id: string }) | null;
  teamMembers: TeamMember[];
}

const PLATFORMS: { value: MeetingPlatform; label: string; color: string; bg: string; darkBg: string }[] = [
  { value: "zoom", label: "Zoom", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50", darkBg: "dark:bg-blue-500/20" },
  { value: "google-meet", label: "Google Meet", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50", darkBg: "dark:bg-emerald-500/20" },
  { value: "google-classroom", label: "Google Classroom", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50", darkBg: "dark:bg-teal-500/20" },
  { value: "teams", label: "Microsoft Teams", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50", darkBg: "dark:bg-violet-500/20" },
  { value: "custom", label: "Custom / Other", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50", darkBg: "dark:bg-slate-500/20" },
];

const DURATIONS = [
  "15 minutes",
  "30 minutes",
  "45 minutes",
  "1 hour",
  "1.5 hours",
  "2 hours",
  "2.5 hours",
  "3 hours",
];

const TIME_OPTIONS = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM", "06:00 PM"
];

function getPlatformLinkPlaceholder(platform: MeetingPlatform | ""): string {
  switch (platform) {
    case "zoom":
      return "https://zoom.us/j/your-meeting-id";
    case "google-meet":
      return "https://meet.google.com/abc-defg-hij";
    case "google-classroom":
      return "https://classroom.google.com/c/your-class-id";
    case "teams":
      return "https://teams.microsoft.com/l/meetup-join/...";
    default:
      return "https://your-meeting-link.com";
  }
}

export function MeetingModal({
  isOpen,
  onClose,
  onSave,
  editingMeeting,
  teamMembers,
}: MeetingModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("1 hour");
  const [type, setType] = useState<"online" | "offline">("online");
  const [location, setLocation] = useState("");
  const [platform, setPlatform] = useState<MeetingPlatform | "">("");
  const [meetingLink, setMeetingLink] = useState("");
  const [agenda, setAgenda] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  // Today's date string for min constraint
  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (editingMeeting) {
      setTitle(editingMeeting.title);
      setDate(editingMeeting.date);
      setTime(editingMeeting.time || "");
      setDuration(editingMeeting.duration || "1 hour");
      setType(editingMeeting.type || "online");
      setLocation(editingMeeting.location || "");
      setPlatform(editingMeeting.platform || "");
      setMeetingLink(editingMeeting.meetingLink || "");
      setAgenda(editingMeeting.agenda || "");
      setAttendees(editingMeeting.attendees || []);
    } else {
      setTitle("");
      setDate("");
      setTime("");
      setDuration("1 hour");
      setType("online");
      setLocation("");
      setPlatform("");
      setMeetingLink("");
      setAgenda("");
      setAttendees([]);
    }
    setError("");
    setShowTimePicker(false);
    setShowDurationPicker(false);
  }, [editingMeeting, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Meeting title is required.");
      return;
    }
    if (!date) {
      setError("Please select a date for the meeting.");
      return;
    }
    if (!time) {
      setError("Please select a time for the meeting.");
      return;
    }
    // Validate that datetime is in the future for new meetings
    if (!editingMeeting) {
      // time might be "10:30 AM", so we need to parse it for validation.
      let meetingDateTime = new Date(`${date}T00:00:00`);
      const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3].toUpperCase();
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        meetingDateTime = new Date(`${date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
      } else {
        meetingDateTime = new Date(`${date}T${time}`);
      }
      
      if (meetingDateTime <= new Date()) {
        setError("Meeting date and time must be in the future.");
        return;
      }
    }
    if (type === "online" && meetingLink && !/^https?:\/\/.+/.test(meetingLink)) {
      setError("Meeting link must be a valid URL starting with http:// or https://");
      return;
    }
    if (type === "offline" && !location.trim()) {
      setError("Please specify a location for the offline meeting.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await onSave({ 
        title: title.trim(), 
        date, 
        time, 
        duration, 
        type,
        location: type === "offline" ? location.trim() : "",
        platform: type === "online" ? platform : "", 
        meetingLink: type === "online" ? meetingLink.trim() : "", 
        agenda: agenda.trim(), 
        attendees 
      });
      onClose();
    } catch (err) {
      console.error("Error saving meeting:", err);
      setError("Failed to save meeting. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAttendee = (studentId: string) => {
    setAttendees((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const selectedPlatformInfo = PLATFORMS.find((p) => p.value === platform);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-[#0A0A0A]/80">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:border dark:border-[#2A2A2A] dark:bg-[#181818]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/20">
              <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {editingMeeting ? "Edit Meeting" : "Schedule Meeting"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </div>
          )}

          <form id="meeting-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Meeting Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g., Weekly Research Sync, Thesis Review"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                required
              />
            </div>

            {/* Date & Time & Duration */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={date}
                    min={editingMeeting ? undefined : todayStr}
                    onChange={(e) => setDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.target as HTMLInputElement).showPicker();
                      } catch (err) {
                        // fallback for browsers that don't support showPicker
                      }
                    }}
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                    required
                  />
                </div>
              </div>

              <div className="sm:col-span-7 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    onFocus={() => {
                      setShowTimePicker(true);
                      setShowDurationPicker(false);
                    }}
                    placeholder="e.g., 10:30 AM"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                    required
                  />
                  {showTimePicker && (
                    <div className="absolute top-full z-20 mt-2 animate-in fade-in zoom-in-95 duration-200 w-full bg-white dark:bg-[#181818] shadow-xl rounded-xl border border-slate-200 dark:border-[#333] p-2">
                      <div className="overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-[#333] dark:bg-[#0F0F0F] h-[280px]">
                        {TIME_OPTIONS.map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setTime(t);
                              setShowTimePicker(false);
                            }}
                            className={`block w-full text-center px-3 py-2.5 text-sm rounded-lg mb-1 transition-colors ${
                              time === t 
                                ? 'bg-indigo-100 text-indigo-700 font-bold dark:bg-indigo-500/20 dark:text-indigo-400' 
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#181818] font-medium'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="relative flex-1">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Duration <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    onFocus={() => {
                      setShowDurationPicker(true);
                      setShowTimePicker(false);
                    }}
                    placeholder="e.g., 1 hour"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                    required
                  />
                  {showDurationPicker && (
                    <div className="absolute top-full right-0 z-20 mt-2 animate-in fade-in zoom-in-95 duration-200 w-full bg-white dark:bg-[#181818] shadow-xl rounded-xl border border-slate-200 dark:border-[#333] p-2">
                      <div className="overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-[#333] dark:bg-[#0F0F0F] h-[280px]">
                        {DURATIONS.map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              setDuration(d);
                              setShowDurationPicker(false);
                            }}
                            className={`block w-full text-center px-3 py-2.5 text-sm rounded-lg mb-1 transition-colors ${
                              duration === d 
                                ? 'bg-indigo-100 text-indigo-700 font-bold dark:bg-indigo-500/20 dark:text-indigo-400' 
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#181818] font-medium'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Meeting Type */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Meeting Type
              </label>
              <div className="inline-flex rounded-xl bg-slate-100 p-1.5 dark:bg-[#0F0F0F] border border-slate-200 dark:border-[#333]">
                <button
                  type="button"
                  onClick={() => setType("online")}
                  className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold transition-all ${
                    type === "online"
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-[#181818] dark:text-indigo-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <Video className="h-4 w-4" />
                  Online
                </button>
                <button
                  type="button"
                  onClick={() => setType("offline")}
                  className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold transition-all ${
                    type === "offline"
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-[#181818] dark:text-indigo-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  Offline
                </button>
              </div>
            </div>

            {type === "offline" ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Location <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="E.g., Room 402, Dept Building"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                  required={type === "offline"}
                />
              </div>
            ) : (
              <>
                {/* Platform */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Platform
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {PLATFORMS.map((p) => {
                      const isSelected = platform === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => {
                            setPlatform(isSelected ? "" : p.value);
                            if (isSelected) setMeetingLink("");
                          }}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                            isSelected
                              ? `border-indigo-400 ${p.bg} ${p.color} ${p.darkBg} ring-1 ring-indigo-400`
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-[#333] dark:text-slate-400 dark:hover:bg-[#0F0F0F]"
                          }`}
                        >
                          <Video className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{p.label}</span>
                          {isSelected && <Check className="ml-auto h-3 w-3 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Meeting Link — only shown when a platform is selected */}
                {platform && (
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${selectedPlatformInfo?.bg} ${selectedPlatformInfo?.color} ${selectedPlatformInfo?.darkBg}`}
                      >
                        <Video className="h-3 w-3" />
                        {selectedPlatformInfo?.label} Link
                      </span>
                    </label>
                    <div className="relative">
                      <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="url"
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        placeholder={getPlatformLinkPlaceholder(platform)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-500">
                      This link will be shared with all attendees
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Agenda / Notes */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Agenda / Notes
              </label>
              <textarea
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder="What will be discussed? Add an agenda or any notes for attendees..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
              />
            </div>

            {/* Attendees */}
            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
                <span>Attendees</span>
                {attendees.length > 0 && (
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    {attendees.length} selected
                  </span>
                )}
              </label>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-[#333] dark:bg-[#0F0F0F]">
                {teamMembers.length === 0 ? (
                  <p className="p-2 text-center text-sm text-slate-500 dark:text-slate-400">
                    No team members to add
                  </p>
                ) : (
                  teamMembers.map((member) => {
                    const isSelected = attendees.includes(member.studentId);
                    return (
                      <button
                        key={member.studentId}
                        type="button"
                        onClick={() => toggleAttendee(member.studentId)}
                        className={`flex w-full items-center justify-between rounded-lg p-2.5 text-left transition-colors ${
                          isSelected
                            ? "bg-indigo-50 dark:bg-indigo-500/20"
                            : "hover:bg-slate-50 dark:hover:bg-[#181818]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {member.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p
                              className={`text-sm font-medium ${
                                isSelected
                                  ? "text-indigo-700 dark:text-indigo-300"
                                  : "text-slate-900 dark:text-white"
                              }`}
                            >
                              {member.studentName}
                            </p>
                            {member.department && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {member.department}
                              </p>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 p-6 dark:border-[#2A2A2A] dark:bg-[#181818]">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="meeting-form"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : editingMeeting ? (
                "Update Meeting"
              ) : (
                "Schedule Meeting"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
