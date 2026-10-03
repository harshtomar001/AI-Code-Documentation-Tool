import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { FcGoogle } from "react-icons/fc";
import { BsMicrosoft } from "react-icons/bs";
import {
  FaGithub,
  FaFileAlt,
  FaCheck,
  FaMoon,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
} from "react-icons/fa";

import "./login.css";
import api from "../../api/client";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [rememberMe, setRememberMe] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // =========================================================
  // NORMAL LOGIN
  // =========================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/api/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const token = response.data?.access_token;

      if (!token) {
        setError(
          "Login successful but access token was not received."
        );
        return;
      }

      // Remove old tokens
      localStorage.removeItem("access_token");
      sessionStorage.removeItem("access_token");

      // Remember me
      if (rememberMe) {
        localStorage.setItem(
          "access_token",
          token
        );
      } else {
        sessionStorage.setItem(
          "access_token",
          token
        );
      }

      navigate("/dashboard", {
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // GOOGLE
  // =========================================================

  const handleGoogleLogin = () => {
    window.location.href =
      `${API_URL}/api/auth/google/login`;
  };

  // =========================================================
  // MICROSOFT
  // =========================================================

  const handleMicrosoftLogin = () => {
    window.location.href =
      `${API_URL}/api/auth/microsoft/login`;
  };

  // =========================================================
  // GITHUB
  // =========================================================

  const handleGithubLogin = () => {
    window.location.href =
      `${API_URL}/api/auth/github/login`;
  };

  return (
    <div className="login-page">

      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav className="login-navbar">

        <Link
          to="/"
          className="login-brand"
        >
          <span className="login-brand-icon">
            <FaFileAlt />
          </span>

          <span>
            DocuAI<span>.</span>
          </span>
        </Link>

        <div className="login-nav-links">
          <a href="#features">
            Features
          </a>

          <a href="#docs">
            Docs
          </a>

          <a href="#pricing">
            Pricing
          </a>
        </div>

        <button
          type="button"
          className="login-theme-button"
          aria-label="Theme"
        >
          <FaMoon />
        </button>

      </nav>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="login-content">

        {/* ===================================================
            LEFT HERO
        =================================================== */}

        <section className="login-intro">

          <div className="login-intro-copy">

            <div className="login-eyebrow">
              <span />
              AI-POWERED DOCUMENTATION
            </div>

            <h1>
              Turn your code
              <br />
              into <span>clear documentation.</span>
            </h1>

            <p className="login-intro-description">
              Generate docstrings, comments and README files
              <br className="login-desktop-break" />
              for any project — in seconds.
            </p>

            {/* BENEFITS */}

            <div className="login-benefits">

              <div className="login-benefit">

                <div className="login-benefit-icon">
                  <FaFileAlt />
                </div>

                <div>
                  <h3>
                    Instant Documentation
                  </h3>

                  <p>
                    Turn complex code into clear explanations.
                  </p>
                </div>

              </div>

              <div className="login-benefit">

                <div className="login-benefit-icon">
                  <FaCheck />
                </div>

                <div>
                  <h3>
                    Built for Developers
                  </h3>

                  <p>
                    Save time while keeping your code documented.
                  </p>
                </div>

              </div>

            </div>

          </div>

          {/* ORB */}

          <div className="login-orb" />

        </section>

        {/* ===================================================
            RIGHT LOGIN SECTION
        =================================================== */}

        <section className="login-form-area">

          <div className="login-card">

            {/* CARD HEADING */}

            <div className="login-card-heading">

              <h2>
                Welcome Back
              </h2>

              <p>
                Login to your DocuAI account.
              </p>

            </div>

            {/* =================================================
                SOCIAL LOGIN
            ================================================= */}

            <div className="login-social-login">

              <button
                type="button"
                className="login-social-btn"
                onClick={handleGoogleLogin}
              >
                <FcGoogle className="login-social-icon" />

                <span>
                  Continue with Google
                </span>
              </button>

              <button
                type="button"
                className="login-social-btn"
                onClick={handleMicrosoftLogin}
              >
                <BsMicrosoft className="login-social-icon" />

                <span>
                  Continue with Microsoft
                </span>
              </button>

              <button
                type="button"
                className="login-social-btn"
                onClick={handleGithubLogin}
              >
                <FaGithub className="login-social-icon login-github-icon" />

                <span>
                  Continue with GitHub
                </span>
              </button>

            </div>

            {/* =================================================
                DIVIDER
            ================================================= */}

            <div className="login-divider">

              <span />

              <p>OR</p>

              <span />

            </div>

            {/* =================================================
                LOGIN FORM
            ================================================= */}

            <form
              className="login-form"
              onSubmit={handleLogin}
            >

              {/* EMAIL */}

              <div className="login-field">

                <label>
                  Email Address
                </label>

                <div className="login-input-wrapper">

                  <FaEnvelope className="login-input-icon" />

                  <input
                    type="email"
                    name="email"
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

              {/* PASSWORD */}

              <div className="login-field">

                <label>
                  Password
                </label>

                <div className="login-input-wrapper">

                  <FaLock className="login-input-icon" />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
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

              {/* REMEMBER + FORGOT */}

              <div className="login-options">

                <label className="login-remember">

                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) =>
                      setRememberMe(
                        e.target.checked
                      )
                    }
                  />

                  <span>
                    Keep me signed in
                  </span>

                </label>

                <Link
                  to="/forgot-password"
                  className="login-forgot"
                >
                  Forgot password?
                </Link>

              </div>

              {/* ERROR */}

              {error && (
                <p className="login-error">
                  {error}
                </p>
              )}

              {/* LOGIN BUTTON */}

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                <span>
                  {loading
                    ? "Logging in..."
                    : "Log In"}
                </span>

                {!loading && (
                  <FaArrowRight />
                )}
              </button>

            </form>

            {/* REGISTER */}

            <p className="login-register-text">

              Don't have an account?

              <Link to="/register">
                Register
              </Link>

            </p>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Login;