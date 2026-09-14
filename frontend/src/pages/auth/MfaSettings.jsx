import { useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function MfaSettings() {
  const { user } = useAuth();
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const beginSetup = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/auth/mfa/setup");
      setSetup(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to start MFA setup.");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/mfa/verify", { code });
      setMessage("MFA enabled successfully.");
      setSetup(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Invalid MFA code.");
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/mfa/disable", { code, password });
      setMessage("MFA disabled successfully.");
      setCode("");
      setPassword("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to disable MFA.");
    } finally {
      setLoading(false);
    }
  };

  if (!user || !["doctor", "admin"].includes(user.role)) {
    return <p className="p-8 text-sm text-slate-600">MFA is available only for privileged accounts.</p>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <section className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">Multi-factor authentication</h1>
        <p className="mt-2 text-sm text-slate-500">Use an authenticator app for your {user.role} account.</p>
        {message && <p className="mt-4 text-sm text-emerald-600">{message}</p>}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {!setup && (
          <button onClick={beginSetup} disabled={loading} className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
            Set up MFA
          </button>
        )}
        {setup && (
          <div className="mt-6 space-y-4">
            <img src={setup.qrCode} alt="Scan this QR code in your authenticator app" className="h-48 w-48" />
            <p className="break-all text-xs text-slate-500">If scanning is unavailable, use this setup key: {setup.secret}</p>
            <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" maxLength={6} placeholder="6-digit code" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            <button onClick={verify} disabled={loading || code.length !== 6} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Verify and enable</button>
          </div>
        )}
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="font-medium text-slate-900">Disable MFA</h2>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Current password" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2" />
          <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" maxLength={6} placeholder="Current authenticator code" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2" />
          <button onClick={disable} disabled={loading || !password || code.length !== 6} className="mt-3 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700">Disable MFA</button>
        </div>
      </section>
    </main>
  );
}

export default MfaSettings;
