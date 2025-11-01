import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "@getmocha/users-service/react";
import Dashboard from "@/react-app/pages/Dashboard";
import Login from "@/react-app/pages/Login";
import AuthCallback from "@/react-app/pages/AuthCallback";
import ServerLogs from "@/react-app/pages/ServerLogs";
import Webhooks from "@/react-app/pages/Webhooks";
import Settings from "@/react-app/pages/Settings";
import LoadingScreen from "@/react-app/components/LoadingScreen";

function AppRouter() {
  const { user, isPending } = useAuth();

  if (isPending) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        {user ? (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/servers/:id/logs" element={<ServerLogs />} />
            <Route path="/webhooks" element={<Webhooks />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
