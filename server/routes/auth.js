
const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { verifyToken } = require("../middleware/auth");
const { isTracked, startSession } = require("../utils/attendanceSession");
const { sendMail } = require("../utils/mailer");

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const escaped = email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const user = await User.findOne({ email: new RegExp(`^${escaped}$`, "i") });
    const validPass = user && (await bcrypt.compare(password, user.password));
    if (!validPass) return res.status(400).json({ error: "Invalid credentials" });

    // Only someone who knows the right password learns the account's state.
    if (user.status === "Pending") {
      return res.status(403).json({
        error: "Your account is awaiting admin approval. Please try again later.",
      });
    }
    if (user.status === "Rejected") {
      return res.status(403).json({
        error: "Your sign-up request was declined. Contact your administrator.",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // A successful login starts the time tracker (not for admins).
    if (isTracked(user.role)) await startSession(user._id, { resume: true });

    // Sending role back so frontend can handle UI visibility
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        lead_id: user.lead_id || null,
        manager_id: user.manager_id || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Self-service sign-up ---------------------------------------------------
// Creates a *Pending Employee*; an admin must approve it before it can log in.
const SIGNUP_DEPARTMENTS = ["Cloud", "Development", "Design", "Security", "QA", "General"];
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const SIGNUP_MAX_PER_WINDOW = 5;
const signupHits = new Map(); // ip -> timestamps (in-memory; resets on restart)

const tooManySignups = (ip) => {
  const now = Date.now();
  const recent = (signupHits.get(ip) || []).filter((t) => now - t < SIGNUP_WINDOW_MS);
  if (recent.length >= SIGNUP_MAX_PER_WINDOW) {
    signupHits.set(ip, recent);
    return true;
  }
  recent.push(now);
  signupHits.set(ip, recent);
  return false;
};

router.post("/signup", async (req, res) => {
  try {
    if (tooManySignups(req.ip)) {
      return res
        .status(429)
        .json({ error: "Too many sign-up attempts. Please try again later." });
    }

    const { name, email, department, password } = req.body;
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      name.trim().length > 80 ||
      !/^\S+@\S+\.\S+$/.test(email.trim())
    ) {
      return res.status(400).json({ error: "Enter a valid name, email and password" });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }
    if (!SIGNUP_DEPARTMENTS.includes(department)) {
      return res.status(400).json({ error: "Choose a department" });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (await User.exists({ email: cleanEmail })) {
      return res
        .status(400)
        .json({ error: "An account with this email already exists" });
    }

    // Role and status are fixed server-side: the client cannot pick either.
    await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: await bcrypt.hash(password, 10),
      role: "Employee",
      department,
      status: "Pending",
      salary: 45000,
    });

    res.status(201).json({
      message: "Request received. An admin will review it before you can log in.",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ error: "An account with this email already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

// --- Forgot / reset password -------------------------------------------------
const RESET_WINDOW_MS = 60 * 60 * 1000;
const RESET_MAX_PER_WINDOW = 5;
const resetHits = new Map(); // ip -> timestamps (in-memory; resets on restart)

const tooManyResetRequests = (ip) => {
  const now = Date.now();
  const recent = (resetHits.get(ip) || []).filter((t) => now - t < RESET_WINDOW_MS);
  if (recent.length >= RESET_MAX_PER_WINDOW) {
    resetHits.set(ip, recent);
    return true;
  }
  recent.push(now);
  resetHits.set(ip, recent);
  return false;
};

// FRONTEND_URL may hold several comma-separated origins; the reset link uses
// the first one.
const FRONTEND_BASE = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")[0]
  .trim()
  .replace(/\/+$/, "");

router.post("/forgot-password", async (req, res) => {
  try {
    if (tooManyResetRequests(req.ip)) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }

    const { email } = req.body;
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ error: "Enter your email" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    // The response never reveals whether the account exists - only the email
    // (if one goes out) does.
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      user.resetPasswordTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      const link = `${FRONTEND_BASE}/#/reset-password/${rawToken}`;
      await sendMail({
        to: user.email,
        subject: "Reset your SRI.CR password",
        text:
          `Hi ${user.name},\n\n` +
          `Use this link to reset your SRI.CR password (it expires in 1 hour):\n${link}\n\n` +
          "If you didn't request this, you can ignore this email.",
        html:
          `<p>Hi ${user.name},</p>` +
          `<p>Use the link below to reset your SRI.CR password. It expires in 1 hour.</p>` +
          `<p><a href="${link}">${link}</a></p>` +
          "<p>If you didn't request this, you can ignore this email.</p>",
      });
    }

    res.json({ message: "If an account exists for that email, a reset link has been sent." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (typeof token !== "string" || !token || typeof password !== "string") {
      return res.status(400).json({ error: "Invalid request" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ error: "This reset link is invalid or has expired." });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Password updated. You can now log in." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: the logged-in user's own account details
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(
      req.user.id,
      "name email role department pulseStatus lead_id manager_id",
    )
      .populate("lead_id", "name email")
      .populate("manager_id", "name email")
      .lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      pulseStatus: user.pulseStatus,
      lead: user.lead_id || null,
      manager: user.manager_id || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: change the logged-in user's own password
router.post("/change-password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return res.status(400).json({ error: "Both passwords are required" });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "New password must be at least 8 characters" });
    }
    if (newPassword === currentPassword) {
      return res
        .status(400)
        .json({ error: "New password must differ from the current one" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;