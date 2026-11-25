import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import AdminLayout from "./layouts/AdminLayout";

import LandingPage from "./pages/LandingPage";
import DivisionPage from "./pages/DivisionPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

import TeachersPage from "./pages/admin/TeachersPage";
import TeacherProfilePage from "./pages/admin/TeacherProfilePage";
import StudentsPage from "./pages/admin/StudentsPage";
import EvaluationPeriodsPage from "./pages/admin/Evaluationperiodspage .jsx";
import AdminPlaceholderPage from "./pages/admin/AdminPlaceholderPage";
import QuestionnairePage from "./pages/admin/QuestionnairePage";
import EvaluationResultsPage from "./pages/admin/EvaluationResultsPage";
import EvaluationReportPage from "./pages/admin/EvaluationReportPage";
import InstitutionalReportsPage from "./pages/admin/InstitutionalReportsPage";
import SuggestionsPage from "./pages/admin/SuggestionsPage";
import ProfileSettingsPage from "./pages/admin/ProfileSettingsPage";

function AppRoutes() {
  return (
    <Routes>
      {/* Public student pages */}
      <Route path="/" element={<LandingPage />} />

      <Route
        path="/college"
        element={<DivisionPage division="college" />}
      />

      <Route
        path="/basic-ed"
        element={<DivisionPage division="basic-ed" />}
      />

      {/* Administrator login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected administration pages */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />

          <Route path="teachers" element={<TeachersPage />} />
          <Route path="teachers/:id" element={<TeacherProfilePage />} />

          <Route path="students" element={<StudentsPage />} />

          <Route path="periods" element={<EvaluationPeriodsPage />} />

          <Route path="results" element={<EvaluationResultsPage />} />

          {/* Individual evaluation report */}
          <Route
            path="evaluations/:id"
            element={<EvaluationReportPage />}
          />

          <Route
            path="questionnaire"
            element={<QuestionnairePage />}
          />

          {/* Institutional reports */}
          <Route
            path="reports"
            element={<InstitutionalReportsPage />}
          />

          <Route path="suggestions" element={<SuggestionsPage />} />

          <Route path="settings" element={<ProfileSettingsPage />} />
        </Route>
      </Route>

      {/* Unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}