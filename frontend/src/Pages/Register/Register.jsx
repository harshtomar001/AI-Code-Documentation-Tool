import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FcGoogle,
} from "react-icons/fc";
import {
  BsMicrosoft,
} from "react-icons/bs";
import {
  FaGithub,
  FaFileAlt,
  FaCheck,
  FaArrowRight,
  FaMoon,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaEnvelope,
  FaLock,
} from "react-icons/fa";

import {
  registerUser,
  verifyEmail,
  resendOTP,
} from "../../api/auth";

import "./register.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

function Register() {
  const navigate = useNavigate();

  // =========================
  // REGISTER FORM
  // =========================

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================
  // OTP
  // =========================

  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  // =========================
  // REGISTER
  // =========================

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      // Open OTP popup
      setOtp("");
      setOtpError("");
      setOtpMessage("");
      setShowOtpPopup(true);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // VERIFY OTP
  // =========================

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    setOtpError("");
    setOtpMessage("");

    if (otp.length !== 6) {
      setOtpError("Please enter the 6-digit OTP.");
      return;
    }

    setOtpLoading(true);

    try {
      const response = await verifyEmail({
        email: email.trim().toLowerCase(),
        otp,
      });

      const token = response?.access_token;

      if (!token) {
        setOtpError(
          "Verification succeeded but token was not received."
        );
        return;
      }

      localStorage.setItem("access_token", token);
      sessionStorage.setItem("access_token", token);

      setOtpMessage("Email verified successfully!");

      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 500);
    } catch (err) {
      setOtpError(
        err.response?.data?.detail ||
          "Invalid or expired OTP."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // =========================
  // RESEND OTP
  // =========================

  const handleResendOtp = async () => {
    setOtpError("");
    setOtpMessage("");
    setOtpLoading(true);

    try {
      const response = await resendOTP({
        email: email.trim().toLowerCase(),
      });

      setOtpMessage(
        response.data?.message ||
          "A new OTP has been sent to your email."
      );
    } catch (err) {
      setOtpError(
        err.response?.data?.detail ||
          "Could not resend OTP."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // =========================
  // SOCIAL LOGIN
  // =========================

  const handleGoogleLogin = () => {
    window.location.href =
      `${API_URL}/api/auth/google/login`;
  };

  const handleMicrosoftLogin = () => {
    window.location.href =
      `${API_URL}/api/auth/microsoft/login`;
  };

  const handleGithubLogin = () => {
    window.location.href =
      `${API_URL}/api/auth/github/login`;
  };

  // =========================
  // UI
  // =========================

  return (
    <>
      <div className="register-page">

        {/* BACKGROUND GLOWS */}
        <div className="register-glow register-glow-one" />
        <div className="register-glow register-glow-two" />

        {/* =========================
            NAVBAR
        ========================= */}

        <nav className="register-navbar">

          <Link to="/" className="register-brand">
            <span className="register-brand-icon">
              <FaFileAlt />
            </span>

            <span>
              DocuAI<span>.</span>
            </span>
          </Link>

          <div className="register-nav-links">
            <a href="#features">Features</a>
            <a href="#docs">Docs</a>
            <a href="#pricing">Pricing</a>
          </div>

          <button
            type="button"
            className="register-theme-button"
            aria-label="Theme"
          >
            <FaMoon />
          </button>

        </nav>

        {/* =========================
            MAIN CONTENT
        ========================= */}

        <main className="register-content">

          {/* =========================
              LEFT SIDE
          ========================= */}

          <section className="register-intro">

            <div className="register-intro-copy">

              <div className="register-eyebrow">
                <span />
                AI-POWERED DOCUMENTATION
              </div>

              <h1>
                Turn your code
                <br />
                into <span>clear documentation.</span>
              </h1>

              <p className="register-intro-description">
                Generate docstrings, comments and README files
                <br className="desktop-break" />
                for any project — in seconds.
              </p>

              <div className="register-benefits">

                <div className="register-benefit">

                  <div className="benefit-icon">
                    <FaFileAlt />
                  </div>

                  <div>
                    <h3>Instant Documentation</h3>
                    <p>
                      Turn complex code into clear explanations.
                    </p>
                  </div>

                </div>

                <div className="register-benefit">

                  <div className="benefit-icon">
                    <FaCheck />
                  </div>

                  <div>
                    <h3>Built for Developers</h3>
                    <p>
                      Save time while keeping your code documented.
                    </p>
                  </div>

                </div>

              </div>

            </div>

            {/* DECORATIVE ORB */}
            <div className="register-orb" />

          </section>

          {/* =========================
              RIGHT SIDE
          ========================= */}

          <section className="register-form-area">

            <div className="register-card">

              {/* CARD HEADING */}

              <div className="register-card-heading">

                <h2>Create Account</h2>

                <p>
                  Start documenting your code with DocuAI.
                </p>

              </div>

              {/* =========================
                  SOCIAL LOGIN
              ========================= */}

              <div className="social-login">

                <button
                  type="button"
                  className="social-btn"
                  onClick={handleGoogleLogin}
                >
                  <FcGoogle className="social-icon" />
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  className="social-btn"
                  onClick={handleMicrosoftLogin}
                >
                  <BsMicrosoft className="social-icon" />
                  <span>Continue with Microsoft</span>
                </button>

                <button
                  type="button"
                  className="social-btn"
                  onClick={handleGithubLogin}
                >
                  <FaGithub className="social-icon github-icon" />
                  <span>Continue with GitHub</span>
                </button>

              </div>

              {/* DIVIDER */}

              <div className="register-divider">
                <span />
                <p>OR</p>
                <span />
              </div>

              {/* =========================
                  REGISTER FORM
              ========================= */}

              <form
                className="register-form"
                onSubmit={handleRegister}
              >

                {/* NAME */}

                <div className="register-field">

                  <label>
                    Full Name
                  </label>

                  <div className="register-input-wrapper">

                    <FaUser className="register-input-icon" />

                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) =>
                        setName(e.target.value)
                      }
                      autoComplete="name"
                      required
                    />

                  </div>

                </div>

                {/* EMAIL */}

                <div className="register-field">

                  <label>
                    Email Address
                  </label>

                  <div className="register-input-wrapper">

                    <FaEnvelope className="register-input-icon" />

                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      autoComplete="email"
                      required
                    />

                  </div>

                </div>

                {/* PASSWORD + CONFIRM */}

                <div className="register-two-column">

                  <div className="register-field">

                    <label>
                      Password
                    </label>

                    <div className="register-input-wrapper">

                      <FaLock className="register-input-icon" />

                      <input
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        placeholder="Create password"
                        value={password}
                        onChange={(e) =>
                          setPassword(e.target.value)
                        }
                        autoComplete="new-password"
                        required
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowPassword(!showPassword)
                        }
                        aria-label="Toggle password"
                      >
                        {showPassword ? (
                          <FaEyeSlash />
                        ) : (
                          <FaEye />
                        )}
                      </button>

                    </div>

                  </div>

                  <div className="register-field">

                    <label>
                      Confirm Password
                    </label>

                    <div className="register-input-wrapper">

                      <FaLock className="register-input-icon" />

                      <input
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) =>
                          setConfirmPassword(
                            e.target.value
                          )
                        }
                        autoComplete="new-password"
                        required
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowConfirmPassword(
                            !showConfirmPassword
                          )
                        }
                        aria-label="Toggle confirm password"
                      >
                        {showConfirmPassword ? (
                          <FaEyeSlash />
                        ) : (
                          <FaEye />
                        )}
                      </button>

                    </div>

                  </div>

                </div>

                {/* ERROR */}

                {error && (
                  <p className="register-error">
                    {error}
                  </p>
                )}

                {/* CREATE ACCOUNT */}

                <button
                  type="submit"
                  className="create-account-button"
                  disabled={loading}
                >
                  {loading
                    ? "Creating Account..."
                    : "Create Account"}

                  {!loading && <FaArrowRight />}
                </button>

              </form>

              {/* LOGIN */}

              <p className="already-account">
                Already have an account?

                <Link to="/login">
                  Login
                </Link>
              </p>

            </div>

          </section>

        </main>

      </div>

      {/* =================================================
          OTP POPUP
      ================================================= */}

      {showOtpPopup && (

        <div className="otp-overlay">

          <div className="otp-popup">

            <button
              type="button"
              className="otp-close"
              onClick={() => setShowOtpPopup(false)}
              disabled={otpLoading}
            >
              ×
            </button>

            <div className="otp-header">

              <div className="otp-icon">
                <FaEnvelope />
              </div>

              <h2>Verify your email</h2>

              <p>
                We sent a 6-digit OTP to
              </p>

              <strong>
                {email}
              </strong>

            </div>

            <form onSubmit={handleVerifyOtp}>

              <label className="otp-label">
                Enter OTP
              </label>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6);

                  setOtp(value);
                }}
                className="otp-input"
                autoFocus
              />

              {otpError && (
                <p className="otp-error">
                  {otpError}
                </p>
              )}

              {otpMessage && (
                <p className="otp-success">
                  {otpMessage}
                </p>
              )}

              <button
                type="submit"
                className="otp-verify-button"
                disabled={otpLoading}
              >
                {otpLoading
                  ? "Verifying..."
                  : "Verify Email"}
              </button>

            </form>

            <button
              type="button"
              className="otp-resend-button"
              onClick={handleResendOtp}
              disabled={otpLoading}
            >
              Resend OTP
            </button>

            <p className="otp-info">
              OTP is valid for 10 minutes.
            </p>

          </div>

        </div>

      )}

    </>
  );
}

export default Register;