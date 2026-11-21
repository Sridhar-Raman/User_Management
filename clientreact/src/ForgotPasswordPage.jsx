import React, { useState } from "react";
import axios from "axios";
import { Mail } from "lucide-react";
import BrandLogo from "./BrandLogo";
import AuthNav from "./AuthNav";
import { API_URL } from "./apiConfig";

const linkStyle = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--accent)",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "inherit",
};

// Public: requests a password-reset email. Always shows the same confirmation
// regardless of whether the email matched an account, so this page can't be
// used to find out who has an account.
export default function ForgotPasswordPage({ go }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || "Could not send the reset email. Try again.");
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

        {sent ? (
          <div style={{ textAlign: "center", display: "grid", gap: 14, padding: "8px 0" }}>
            <Mail size={42} style={{ color: "var(--accent)", margin: "0 auto" }} />
            <h2 style={{ margin: 0 }}>Check your email</h2>
            <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.55 }}>
              If an account exists for <strong>{email}</strong>, we have sent a link to
              reset your password. It expires in 1 hour.
            </p>
            <button type="button" className="action-btn" onClick={() => go("login")}>
              Back to log in
            </button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
            <div>
              <h2 style={{ margin: "4px 0 2px" }}>Forgot your password?</h2>
              <div style={{ fontSize: "0.85rem", color: "var(--ink-2)" }}>
                Enter your email and we'll send you a link to reset it.
              </div>
            </div>

            <input
              className="glass-input"
              type="email"
              placeholder="Email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              {submitting ? "Sending..." : "Send reset link"}
            </button>

            <div style={{ textAlign: "center", fontSize: "0.88rem", color: "var(--ink-2)" }}>
              <button type="button" style={linkStyle} onClick={() => go("login")}>
                Back to log in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
