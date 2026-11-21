import React, { useState } from "react";
import axios from "axios";
import { CheckCircle2 } from "lucide-react";
import BrandLogo from "./BrandLogo";
import AuthNav from "./AuthNav";
import PasswordInput from "./PasswordInput";
import { API_URL } from "./apiConfig";

const MIN_PASSWORD_LENGTH = 8;

// Public: the landing page for the link emailed by /forgot-password. `token`
// is the raw reset token read out of the URL by App.jsx.
export default function ResetPasswordPage({ go, token }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (password !== confirm) return setError("Passwords do not match");

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/auth/reset-password`, { token, password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || "This reset link is invalid or has expired.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="overlay login-screen">
      <AuthNav go={go} current="login" />
      <div
        className="glass login-card"
        style={{ width: "min(420px, 92vw)", textAlign: "left" }}>
        <BrandLogo size={48} caption="User management" spaced={false} onLight />

        {done ? (
          <div style={{ textAlign: "center", display: "grid", gap: 14, padding: "8px 0" }}>
            <CheckCircle2 size={46} style={{ color: "#2f7d4f", margin: "0 auto" }} />
            <h2 style={{ margin: 0 }}>Password updated</h2>
            <p style={{ margin: 0, color: "var(--ink-2)" }}>
              You can now log in with your new password.
            </p>
            <button type="button" className="action-btn" onClick={() => go("login")}>
              Go to log in
            </button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
            <div>
              <h2 style={{ margin: "4px 0 2px" }}>Choose a new password</h2>
              <div style={{ fontSize: "0.85rem", color: "var(--ink-2)" }}>
                This link works once and expires 1 hour after it was sent.
              </div>
            </div>

            <PasswordInput
              className="glass-input"
              placeholder={`New password (min ${MIN_PASSWORD_LENGTH} characters)`}
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordInput
              className="glass-input"
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            {error && (
              <div
                role="alert"
                style={{
                  color: "#b23b3b",
                  background: "rgba(178,59,59,0.08)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: "0.85rem",
                }}>
                {error}
              </div>
            )}

            <button type="submit" className="action-btn" disabled={submitting}>
              {submitting ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
