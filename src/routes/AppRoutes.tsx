import { Navigate, Route, Routes } from "react-router-dom";
import Landing from "@/pages/public/Landing";
import Login from "@/pages/public/Login";
import Register from "@/pages/public/Register";
import StudentDashboard from "@/pages/student/StudentDashboard";
import ResearchTopics from "@/pages/student/ResearchTopics";
import TeacherDashboard from "@/pages/teacher/TeacherDashboard";
import CreateResearchTopic from "@/pages/teacher/CreateResearchTopic";
import EditTopic from "@/pages/teacher/EditTopic";
import StudentProfile from "@/pages/student/StudentProfile";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route element={<EditTopic />} path="/teacher/topics/edit/:id" />

      <Route path="/student/profile" element={<StudentProfile />} />

      <Route
        path="/student/dashboard"
        element={<StudentDashboard />}
      />

      <Route
        path="/student/research-topics"
        element={<ResearchTopics />}
      />

      <Route
        path="/teacher/dashboard"
        element={<TeacherDashboard />}
      />

      <Route
        path="/teacher/topics/create"
        element={<CreateResearchTopic />}
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}