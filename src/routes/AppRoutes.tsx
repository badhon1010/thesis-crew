import { Navigate, Route, Routes } from "react-router-dom";
import Landing from "@/pages/public/Landing";
import Login from "@/pages/public/Login";
import Register from "@/pages/public/Register";
import StudentDashboard from "@/pages/student/StudentDashboard";
import ResearchTopics from "@/pages/student/ResearchTopics";
import TeacherDashboard from "@/pages/teacher/TeacherDashboard";
import TeacherResearchTopics from "@/pages/teacher/TeacherResearchTopics";
import TeacherResearchGroups from "@/pages/teacher/TeacherResearchGroups";
import CreateResearchTopic from "@/pages/teacher/CreateResearchTopic";
import EditTopic from "@/pages/teacher/EditTopic";
import TeacherJoinRequests from "@/pages/teacher/TeacherJoinRequests";
import ResearchTopicDetails from "@/pages/teacher/ResearchTopicDetails";
import ResearchGroupManagement from "@/pages/teacher/ResearchGroupManagement";
import StudentProfile from "@/pages/student/StudentProfile";
import StudentTopicDetails from "@/pages/student/StudentTopicDetails";
import StudentMyGroups from "@/pages/student/StudentMyGroups";
import StudentGroupDetails from "@/pages/student/StudentGroupDetails";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
      <Route path="/teacher/topics" element={<TeacherResearchTopics />} />
      <Route path="/teacher/research-groups" element={<TeacherResearchGroups />} />
      <Route path="/teacher/research-groups/:id" element={<ResearchGroupManagement />} />
      <Route path="/teacher/topics/create" element={<CreateResearchTopic />} />
      <Route path="/teacher/topics/edit/:id" element={<EditTopic />} />
      <Route path="/teacher/topics/details/:id" element={<ResearchTopicDetails />} />
      <Route path="/teacher/requests" element={<TeacherJoinRequests />} />

      <Route path="/student/dashboard" element={<StudentDashboard />} />
      <Route path="/student/research-topics" element={<ResearchTopics />} />
      <Route path="/student/research-topics/:id" element={<StudentTopicDetails />} />
      <Route path="/student/profile" element={<StudentProfile />} />
      <Route path="/student/my-groups" element={<StudentMyGroups />} />
      <Route path="/student/my-groups/:id" element={<StudentGroupDetails />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}