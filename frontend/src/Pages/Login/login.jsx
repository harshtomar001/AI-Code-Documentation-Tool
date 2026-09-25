import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { BsMicrosoft } from "react-icons/bs";

import "./login.css";
import logo from "../../assets/logo.png";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Remember Me:", rememberMe);

    navigate("/dashboard");
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Logo */}
        <img
          src={logo}
          alt="CodeBase AI Logo"
          className="login-logo"
        />

        {/* Heading */}
        <h1>Welcome Back</h1>

        <p className="login-subtitle">
          Login to your Docu AI account
        </p>

        <form onSubmit={handleLogin}>

          {/* Email */}
          <div className="form-group">
            <h2 id="mail">
              Email Address <span className="asterisk">*</span>
            </h2>

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <h2 id="pass">
              Password <span className="asterisk">*</span>
            </h2>

            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Remember + Forgot Password */}
          <div className="below_pass">

            <div className="remember">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />

              <label htmlFor="remember">
                Remember me
              </label>
            </div>

            <Link to="/forgot-password" id="FP">
              Forgot Password?
            </Link>

          </div>

          {/* Login Button */}
          <button type="submit" className="login-button">
            Login
          </button>

        </form>

        {/* Continue With */}
        <div className="continue">
          <span></span>

          <p>or continue with</p>

          <span></span>
        </div>

        {/* Social Login */}
        <div className="social-login">

          <button
            type="button"
            className="social-btn"
          >
            <FcGoogle className="social-icon" />

            <span>
              Continue with Google
            </span>
          </button>

          <button
            type="button"
            className="social-btn"
          >
            <BsMicrosoft className="social-icon microsoft-icon" />

            <span>
              Continue with Microsoft
            </span>
          </button>

        </div>

        {/* Register */}
        <p className="register-text">
          Don't have an account?{" "}
          <Link to="/register">
            Register
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Login;