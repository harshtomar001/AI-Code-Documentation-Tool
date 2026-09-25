import { useState } from "react";
import { Link } from "react-router-dom";
import { FileCode2, Loader2, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) return;

    setLoading(true);
    setSuccess(false);

    // Simulate a password-reset request.
    await new Promise((resolve) => setTimeout(resolve, 1200));

    setLoading(false);
    setSuccess(true);
  };

  return (
    <main className="min-h-screen w-full bg-[#080b12] px-4 py-8 text-white flex items-center justify-center overflow-x-hidden">
      <section className="w-full max-w-[374px] rounded-[16px] border border-[#6f42c1] bg-[#0d141d] px-6 py-8 shadow-[0_0_28px_rgba(124,58,237,0.12)] sm:px-7 sm:py-8">
        {/* Logo */}
        <div className="mb-7 flex justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#4f46e5] shadow-[0_0_18px_rgba(139,92,246,0.35)]">
            <FileCode2 size={21} strokeWidth={1.8} />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-white">
            Forgot Password?
          </h1>

          <p className="mx-auto mt-4 max-w-[290px] text-[13px] leading-5 text-[#d0d5dc]">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-7">
          <label
            htmlFor="email"
            className="mb-2 block text-[10px] font-semibold text-white"
          >
            Email Address *
          </label>

          <div className="relative">
            <Mail
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7c8795]"
            />

            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSuccess(false);
              }}
              placeholder="Enter your email address"
              className="h-12 w-full rounded-[7px] border border-[#d4dce8] bg-[#e8eef9] pl-10 pr-3 text-[12px] text-[#101722] outline-none placeholder:text-[#6c7480] transition focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 flex h-12 w-full cursor-pointer items-center justify-center rounded-[9px] bg-gradient-to-r from-[#a678f4] to-[#5f5bea] text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(104,78,220,0.22)] transition duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 size={17} className="mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        {/* Success message */}
        {success && (
          <div
            role="status"
            className="mt-4 flex gap-2 rounded-lg border border-[#3f8f68]/40 bg-[#123022]/50 px-3 py-3 text-[11px] leading-4 text-[#b8f2d1]"
          >
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <span>
              If an account exists with this email, a password reset link has
              been sent.
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-[#303943]" />
          <span className="text-[11px] text-[#9ca3af]">or</span>
          <div className="h-px flex-1 bg-[#303943]" />
        </div>

        {/* Back to login */}
        <p className="text-center text-[13px] text-[#e2e5e9]">
          Remember your password?{" "}
          <Link
            to="/Login"
            className="font-medium text-[#a78bfa] transition hover:text-[#c4b5fd]"
          >
            Back to Login
          </Link>
        </p>
      </section>
    </main>
  );
}
