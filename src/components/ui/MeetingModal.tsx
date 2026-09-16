import React, { useState, useEffect } from "react";
import { X, Check, ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";

export interface Meeting {
  id?: string;
  title: string;
  date: string;
  duration: string;
  type?: "online" | "offline";
  location?: string;
  meetingLink?: string;
  notes?: string;
  attendees: string[];
}

interface Member {
  id: string;
  name: string;
  role?: string;
  department?: string;
}

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meeting: Omit<Meeting, "id">) => Promise<void>;
  editingMeeting?: Meeting | null;
  members: Member[];
}

export function MeetingModal({ isOpen, onClose, onSave, editingMeeting, members }: MeetingModalProps) {
  const [title, setTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("10:00 AM");
  const [duration, setDuration] = useState("30 mins");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [meetingType, setMeetingType] = useState<"online" | "offline">("online");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingMeeting) {
      setTitle(editingMeeting.title);
      setDuration(editingMeeting.duration);
      setMeetingType(editingMeeting.type || "online");
      setLocation(editingMeeting.location || "");
      setMeetingLink(editingMeeting.meetingLink || "");
      setNotes(editingMeeting.notes || "");
      setAttendees(editingMeeting.attendees || []);
      if (editingMeeting.date) {
        const d = new Date(editingMeeting.date);
        if (!isNaN(d.getTime())) {
          setSelectedDate(d);
          setCurrentMonth(d);
          const h = d.getHours();
          const period = h >= 12 ? 'PM' : 'AM';
          const displayHour = h % 12 === 0 ? 12 : h % 12;
          const mins = d.getMinutes().toString().padStart(2, '0');
          setSelectedTime(`${displayHour}:${mins} ${period}`);
        }
      }
    } else {
      setTitle("");
      setSelectedDate(new Date());
      setCurrentMonth(new Date());
      setSelectedTime("10:00 AM");
      setDuration("30 mins");
      setMeetingType("online");
      setLocation("");
      setMeetingLink("");
      setNotes("");
      setAttendees([]);
    }
    setShowDatePicker(false);
    setShowTimePicker(false);
    setError("");
  }, [editingMeeting, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !duration.trim()) {
      setError("Title and Duration are required.");
      return;
    }

    if (attendees.length === 0) {
      setError("Please select at least one attendee.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      
      const timeMatch = selectedTime.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?$/);
      let hrs = 10;
      let mins = 0;
      if (timeMatch) {
        hrs = parseInt(timeMatch[1], 10);
        mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const period = timeMatch[3]?.toUpperCase();
        if (period === 'PM' && hrs < 12) hrs += 12;
        if (period === 'AM' && hrs === 12) hrs = 0;
      }

      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateString = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}T${pad(hrs)}:${pad(mins)}:00`;

      const meetingData: Omit<Meeting, "id"> = {
        title: title.trim(),
        date: dateString,
        duration: duration.trim(),
        type: meetingType,
        attendees,
      };

      if (meetingType === "offline" && location.trim()) {
        meetingData.location = location.trim();
      }
      if (meetingType === "online" && meetingLink.trim()) {
        meetingData.meetingLink = meetingLink.trim();
      }
      if (notes.trim()) {
        meetingData.notes = notes.trim();
      }

      await onSave(meetingData);
      onClose();
    } catch (err) {
      console.error("Error saving meeting:", err);
      setError("Failed to save meeting. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAttendee = (memberId: string) => {
    setAttendees((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectAll = () => {
    setAttendees(members.map(m => m.id));
  };

  const deselectAll = () => {
    setAttendees([]);
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const timeOptions = [];
  const startHour = 9; // 9 AM
  const endHour = meetingType === "offline" ? 18 : 22; // 6 PM for offline, 10 PM for online
  
  for (let h = startHour; h <= endHour; h++) {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    timeOptions.push(`${displayHour}:00 ${period}`);
    // Don't add 6:30 PM for offline if end time is strictly 6 PM, 
    // but typically people might want to start a 30m meeting at 6 PM.
    // Let's add the :30 interval unless it's exactly the end hour.
    if (h < endHour) {
      timeOptions.push(`${displayHour}:30 ${period}`);
    }
  }

  const durationOptions = [
    "15 mins", "30 mins", "45 mins", "1 hour", "1.5 hours", "2 hours", "3 hours", "Half Day", "Full Day"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-[#0A0A0A]/80">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:border dark:border-[#2A2A2A] dark:bg-[#181818]">
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-[#2A2A2A]">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {editingMeeting ? "Edit Meeting" : "Schedule Meeting"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </div>
          )}

          <form id="meeting-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Meeting Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g., Weekly Sync, Milestone Review"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Meeting Type
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setMeetingType("online")}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                    meetingType === "online"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#2A2A2A] dark:text-slate-400 dark:hover:bg-[#333]"
                  }`}
                >
                  Online
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingType("offline")}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                    meetingType === "offline"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#2A2A2A] dark:text-slate-400 dark:hover:bg-[#333]"
                  }`}
                >
                  Offline
                </button>
              </div>
            </div>

            {meetingType === "online" ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Online Meeting Link
                </label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="E.g., https://meet.google.com/... or Zoom link"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                />
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Meeting Location <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="E.g., Room 301, Research Lab"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Selection */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Date <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {selectedDate.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </button>

                {showDatePicker && (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#333] dark:bg-[#0F0F0F] animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                      <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 font-semibold text-slate-400">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                      {blanks.map(b => <div key={`blank-${b}`}></div>)}
                      {days.map(d => {
                        const isSelected = selectedDate.getDate() === d && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
                              setShowDatePicker(false);
                            }}
                            className={`aspect-square rounded-full flex items-center justify-center font-medium transition-colors ${
                              isSelected 
                                ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700' 
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {d}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Time and Duration Selection */}
              <div>
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Time <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Clock className="absolute left-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        onFocus={() => setShowTimePicker(true)}
                        placeholder="e.g., 10:00 AM"
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Duration <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      onFocus={() => setShowTimePicker(true)}
                      placeholder="e.g., 1 hour"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white"
                      required
                    />
                  </div>
                </div>

                {showTimePicker && (
                  <div className="mt-2 flex gap-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-[#333] dark:bg-[#0F0F0F] h-[280px]">
                      {timeOptions.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setSelectedTime(t);
                            if (duration) setShowTimePicker(false);
                          }}
                          className={`block w-full text-center px-3 py-2.5 text-sm rounded-lg mb-1 transition-colors ${
                            selectedTime === t 
                              ? 'bg-indigo-100 text-indigo-700 font-bold dark:bg-indigo-500/20 dark:text-indigo-400' 
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#181818] font-medium'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-[#333] dark:bg-[#0F0F0F] h-[280px]">
                      {durationOptions.map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setDuration(d);
                            setShowTimePicker(false);
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

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Agenda / Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What will be discussed?"
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Attendees <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAll} className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Select All</button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button type="button" onClick={deselectAll} className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400">Clear</button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-[#333] dark:bg-[#0F0F0F]">
                {members.length === 0 ? (
                  <p className="p-2 text-center text-sm text-slate-500">No members available</p>
                ) : (
                  members.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleAttendee(member.id)}
                      className={`flex w-full items-center justify-between rounded-lg p-2 text-left transition-colors ${
                        attendees.includes(member.id)
                          ? "bg-indigo-50 dark:bg-indigo-500/20"
                          : "hover:bg-slate-50 dark:hover:bg-[#181818]"
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-medium flex items-center gap-2 ${
                          attendees.includes(member.id)
                            ? "text-indigo-700 dark:text-indigo-300"
                            : "text-slate-900 dark:text-white"
                        }`}>
                          {member.name}
                          {member.role === "teacher" && (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] uppercase text-slate-700 dark:bg-slate-700 dark:text-slate-300">Supervisor</span>
                          )}
                        </p>
                        {member.department && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{member.department}</p>
                        )}
                      </div>
                      {attendees.includes(member.id) && (
                        <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </form>
        </div>

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
              ) : (
                editingMeeting ? "Save Changes" : "Schedule Meeting"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
