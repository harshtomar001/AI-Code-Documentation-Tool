import React from "react";
import Icon from "./Icon";

export default function GitHubTab({ user, onNotify }) {
  const isConnected = user?.providers?.includes("github");
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000";

  const handleConnectGitHub = () => {
    window.location.href = `${API_BASE}/api/auth/github/login`;
  };

  return (
    <div className="settings-tab-card">
      <div className="settings-tab-header">
        <h2>GitHub Integration</h2>
        <p>Manage your linked GitHub account and repository sync permissions.</p>
      </div>

      <div className="settings-section-block">
        <h3>Connection Status</h3>
        <p>Connect your GitHub account to import repositories and export generated documentation commits.</p>

        <div className="flex items-center justify-between p-4 rounded-lg bg-[#0a1015] border border-[#212b33] max-w-[560px]">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-md bg-[#162027] text-white">
              <Icon name="github" size={24} />
            </span>
            <div>
              <div className="text-sm font-semibold text-[#f0f2f4]">GitHub</div>
              <div className="text-xs text-[#8c969f]">
                {isConnected ? "Connected and authorized" : "Not connected"}
              </div>
            </div>
          </div>

          <div>
            {isConnected ? (
              <span className="settings-badge verified">✓ Connected</span>
            ) : (
              <button
                type="button"
                className="settings-action-btn"
                onClick={handleConnectGitHub}
              >
                Connect Account
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="profile-divider my-6" />

      <div className="settings-section-block">
        <h3>Repository Access</h3>
        <p>
          DocuAI only requests repository read/write access required to generate and submit documentation pull requests.
        </p>

        <div className="space-y-3 max-w-[560px]">
          <div className="flex items-start gap-2 text-xs text-[#8c969f]">
            <span className="text-[#3fb950]">✔</span>
            <span>Scan repository file tree and AST structures</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-[#8c969f]">
            <span className="text-[#3fb950]">✔</span>
            <span>Detect missing and outdated docstrings</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-[#8c969f]">
            <span className="text-[#3fb950]">✔</span>
            <span>Export generated batches as Git commits or pull requests</span>
          </div>
        </div>
      </div>
    </div>
  );
}
