import React, { useState } from "react";
import Icon from "./Icon";
import { changePassword } from "../../../api/auth";

export default function AccountTab({ user, token, onNotify }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(
        {
          current_password: user?.has_password ? currentPassword : null,
          new_password: newPassword,
        },
        token
      );
      setSuccess("Password updated successfully!");
      if (onNotify) onNotify("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg =
        err?.response?.data?.detail || "Failed to update password. Please check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-tab-card">
      <div className="settings-tab-header">
        <h2>Account & Security</h2>
        <p>Manage your login credentials, authentication methods, and security preferences.</p>
      </div>

      {/* Account Info */}
      <div className="settings-section-block">
        <h3>Account Status</h3>
        <p>Your primary account details and verification state.</p>

        <div className="flex flex-col gap-3 max-w-[480px] bg-[#090e12] border border-[#202930] p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#8c969f]">Email Address</span>
            <span className="text-sm font-medium text-[#f0f2f4]">{user?.email || "N/A"}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-[#8c969f]">Email Verification</span>
            <span
              className={`settings-badge ${
                user?.is_verified ? "verified" : "unverified"
              }`}
            >
              {user?.is_verified ? "✓ Verified" : "Pending Verification"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-[#8c969f]">Auth Providers</span>
            <div className="flex gap-2">
              {(user?.providers || ["local"]).map((p) => (
                <span
                  key={p}
                  className="px-2 py-0.5 rounded text-xs bg-[#192229] border border-[#2a353d] text-[#cfd4d8] capitalize"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="profile-divider my-6" />

      {/* Password Update */}
      <div className="settings-section-block">
        <h3>{user?.has_password ? "Change Password" : "Set Account Password"}</h3>
        <p>Ensure your account is using a long, random password to stay secure.</p>

        {error && (
          <div className="mb-4 max-w-[480px] p-3 rounded bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 max-w-[480px] p-3 rounded bg-green-950/40 border border-green-800/60 text-green-300 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="password-form-grid">
          {user?.has_password && (
            <div className="settings-input-group">
              <label>Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>
          )}

          <div className="settings-input-group">
            <label>New Password (min 8 characters)</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
            />
          </div>

          <div className="settings-input-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            className="settings-action-btn"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
