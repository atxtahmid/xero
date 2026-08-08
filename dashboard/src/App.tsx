import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout.js";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import AuthCallback from "./pages/AuthCallback.js";
import GuildPicker from "./pages/GuildPicker.js";
import Login from "./pages/Login.js";
import Analytics from "./pages/guild/Analytics.js";
import Giveaways from "./pages/guild/Giveaways.js";
import Moderation from "./pages/guild/Moderation.js";
import Overview from "./pages/guild/Overview.js";
import Settings from "./pages/guild/Settings.js";
import Tickets from "./pages/guild/Tickets.js";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route
        path="/guilds"
        element={
          <RequireAuth>
            <GuildPicker />
          </RequireAuth>
        }
      />

      <Route
        path="/guild/:guildId"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Overview />} />
        <Route path="settings" element={<Settings />} />
        <Route path="moderation" element={<Moderation />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="giveaways" element={<Giveaways />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>

      <Route path="*" element={<Navigate to="/guilds" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
