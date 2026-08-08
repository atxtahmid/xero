import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { setToken } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refetchUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setError("No token received. Please try signing in again.");
      return;
    }

    setToken(token);

    void refetchUser().then(() => {
      navigate("/guilds", { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="mb-4 text-danger">{error}</p>
          <a href="/login" className="text-accent hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="font-mono text-sm text-muted">Signing you in…</p>
    </div>
  );
}
