import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileCode2, Loader2, Mail, CheckCircle2, ArrowLeft,
  ShieldCheck, LockKeyhole, Eye, EyeOff,
} from "lucide-react";
import {
  forgotPassword,
  resendResetOTP,
  resetPassword,
} from "../../api/auth";
import "./forgot.css";

function Forgot() {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await forgotPassword({ email: email.trim() });
      setMessage(response.message);
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not send the OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (e) => {
    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
    setError("");
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }
    setError("");
    setMessage("OTP entered. Create your new password.");
    setStep("reset");
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await resendResetOTP({ email: email.trim() });
      setMessage(response.message);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not resend the OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError("Password must not exceed 72 bytes.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword({
        email: email.trim(),
        otp,
        new_password: password,
      });

      setMessage(response.message);
      setTimeout(() => {
        setStep("email");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setOtp("");
        setMessage("");
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not reset the password.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setOtp("");
    setMessage("");
    setError("");
  };

  return (
    <main className="forgot-page">
      <section className="forgot-card">
        <div className="forgot-logo">
          <div className="forgot-logo-icon"><FileCode2 size={21} strokeWidth={1.8} /></div>
          <span>DocuAI</span>
        </div>

        {step === "email" && (
          <>
            <div className="forgot-heading">
              <h1>Forgot Password?</h1>
              <p>Enter your email address and we'll send you a password reset OTP.</p>
            </div>

            <form onSubmit={handleSendOTP} className="forgot-form">
              <label htmlFor="email">Email Address <span>*</span></label>
              <div className="forgot-input-wrapper">
                <Mail size={16} className="forgot-input-icon" />
                <input id="email" type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="Enter your email address" autoComplete="email" required />
              </div>

              <button type="submit" className="reset-button" disabled={loading}>
                {loading ? <><Loader2 size={17} className="loading-icon" /> Sending OTP...</> : "Send OTP"}
              </button>
            </form>
          </>
        )}

        {step === "otp" && (
          <>
            <div className="forgot-heading">
              <div className="step-icon"><ShieldCheck size={25} /></div>
              <h1>Verify OTP</h1>
              <p>Enter the 6-digit OTP sent to <strong>{email}</strong></p>
            </div>

            <form onSubmit={handleVerifyOTP} className="forgot-form">
              <label htmlFor="otp">Enter OTP <span>*</span></label>
              <div className="forgot-input-wrapper otp-wrapper">
                <ShieldCheck size={16} className="forgot-input-icon" />
                <input id="otp" type="text" inputMode="numeric" maxLength={6}
                  value={otp} onChange={handleOtpChange}
                  placeholder="Enter 6-digit OTP" autoComplete="one-time-code" />
              </div>

              <p className="otp-status">{otp.length}/6 digits entered</p>

              <button type="submit" className="reset-button"
                disabled={otp.length !== 6 || loading}>
                Verify OTP
              </button>

              <button type="button" className="change-email-button"
                onClick={handleResendOTP} disabled={loading}>
                Resend OTP
              </button>
            </form>

            <button type="button" className="change-email-button" onClick={handleBackToEmail}>
              <ArrowLeft size={14} /> Change email
            </button>
          </>
        )}

        {step === "reset" && (
          <>
            <div className="forgot-heading">
              <div className="step-icon"><LockKeyhole size={25} /></div>
              <h1>Reset Password</h1>
              <p>Create a new password for your DocuAI account.</p>
            </div>

            <form onSubmit={handleResetPassword} className="forgot-form">
              <label htmlFor="password">New Password <span>*</span></label>
              <div className="forgot-input-wrapper">
                <LockKeyhole size={16} className="forgot-input-icon" />
                <input id="password" type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Enter new password" />
                <button type="button" className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <label htmlFor="confirmPassword" className="confirm-password-label">
                Confirm Password <span>*</span>
              </label>
              <div className="forgot-input-wrapper">
                <LockKeyhole size={16} className="forgot-input-icon" />
                <input id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  placeholder="Confirm password" />
                <button type="button" className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <p className="password-hint">Password must contain at least 8 characters.</p>

              <button type="submit" className="reset-button" disabled={loading}>
                {loading ? <><Loader2 size={17} className="loading-icon" /> Resetting...</> : "Reset Password"}
              </button>
            </form>
          </>
        )}

        {message && (
          <div className="forgot-success"><CheckCircle2 size={17} /><span>{message}</span></div>
        )}

        {error && <div className="forgot-error"><span>{error}</span></div>}

        <div className="forgot-divider"><span /><p>or</p><span /></div>

        <p className="back-login-text">
          Remember your password?{" "}
          <Link to="/login" className="back-login"><ArrowLeft size={15} /> Back to Login</Link>
        </p>

        <p className="forgot-copyright">© 2026 DocuAI. All rights reserved.</p>
      </section>
    </main>
  );
}

export default Forgot;
