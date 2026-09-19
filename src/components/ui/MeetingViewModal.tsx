import { X, Calendar, Clock, MapPin, Link as LinkIcon, Users, AlignLeft } from "lucide-react";

interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: string;
  type?: "online" | "offline";
  platform?: "google_meet" | "zoom" | "microsoft_teams" | "other";
  location?: string;
  meetingLink?: string;
  notes?: string;
  attendees: string[];
}

interface TeamMember {
  studentId: string;
  studentName: string;
}

interface MeetingViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting | null;
  teamMembers: TeamMember[];
  supervisorName?: string;
  supervisorId?: string;
}

export function MeetingViewModal({
  isOpen,
  onClose,
  meeting,
  teamMembers,
  supervisorName,
  supervisorId,
}: MeetingViewModalProps) {
  if (!isOpen || !meeting) return null;

  const getAttendeeName = (id: string) => {
    if (supervisorId && id === supervisorId) {
      return supervisorName || "Supervisor";
    }
    const member = teamMembers.find((m) => m.studentId === id);
    return member ? member.studentName : "Unknown Member";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-[#0A0A0A]/80">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:border dark:border-[#2A2A2A] dark:bg-[#181818]">
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-[#2A2A2A]">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Meeting Details
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{meeting.title}</h3>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Date & Time</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {new Date(meeting.date).toLocaleDateString()} at {new Date(meeting.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Duration</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{meeting.duration}</p>
              </div>
            </div>

            {meeting.type === "offline" && meeting.location && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Location</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{meeting.location}</p>
                </div>
              </div>
            )}

            {meeting.type === "online" && (meeting.meetingLink || meeting.platform) && (
              <div className="flex items-start gap-3">
                <LinkIcon className="mt-0.5 h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {meeting.platform === "google_meet" ? "Google Meet" : meeting.platform === "zoom" ? "Zoom" : meeting.platform === "microsoft_teams" ? "Microsoft Teams" : "Online Meeting"}
                  </p>
                  {meeting.meetingLink && (
                    <a
                      href={meeting.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Join Link
                    </a>
                  )}
                </div>
              </div>
            )}

            {meeting.notes && (
              <div className="flex items-start gap-3">
                <AlignLeft className="mt-0.5 h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Agenda / Notes</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{meeting.notes}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-5 w-5 text-violet-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Attendees ({meeting.attendees.length})</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {meeting.attendees.map((id) => (
                    <span key={id} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                      {getAttendeeName(id)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
