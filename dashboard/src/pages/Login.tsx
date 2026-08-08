import { getLoginUrl } from "../api/client.js";

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent font-mono text-lg font-bold text-white">
            X
          </div>
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-muted">
              Xero
            </div>
            <div className="font-semibold">Dashboard</div>
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold">Sign in to manage your servers</h1>
        <p className="mb-8 text-sm text-muted">
          You'll only see servers where you have Manage Server permission and Xero is already added.
        </p>

        <a
          href={getLoginUrl()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 font-semibold text-white transition hover:bg-accent/90"
        >
          Continue with Discord
        </a>
      </div>
    </div>
  );
}
