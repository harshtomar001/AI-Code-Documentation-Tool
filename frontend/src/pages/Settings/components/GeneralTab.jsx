import React, { useState } from "react";
import Icon from "./Icon";

export default function GeneralTab({ activeTab, onNotify }) {
  const [toggles, setToggles] = useState({
    emailAlerts: true,
    batchAutoSave: true,
    telemetry: false,
    securityScan: true,
  });

  const toggle = (key) => {
    setToggles((prev) => {
      const next = !prev[key];
      if (onNotify) {
        onNotify(`Preference updated`);
      }
      return { ...prev, [key]: next };
    });
  };

  const titles = {
    Notifications: "Notification Preferences",
    Integrations: "External Integrations",
    "Data & Storage": "Data & Local Workspaces",
    Privacy: "Privacy & Data Protection",
    Billing: "Plan & Billing Details",
    "Help & Support": "Help & Documentation Support",
  };

  const descriptions = {
    Notifications: "Manage how and when DocuAI alerts you about documentation pipelines.",
    Integrations: "Connect CI/CD tools, Slack, Discord, and third-party developer platforms.",
    "Data & Storage": "Inspect cache, workspace disk usage, and exported documentation archives.",
    Privacy: "Configure secret redaction, telemetry permissions, and data retention rules.",
    Billing: "Review current quota, active subscriptions, and generation limits.",
    "Help & Support": "Access documentation guides, submit feedback, or reach developer support.",
  };

  return (
    <div className="settings-tab-card">
      <div className="settings-tab-header">
        <h2>{titles[activeTab] || activeTab}</h2>
        <p>{descriptions[activeTab] || "Configure workspace options and preferences."}</p>
      </div>

      {activeTab === "Notifications" && (
        <div className="settings-section-block">
          <h3>Alert Channels</h3>
          <div className="settings-toggle-row">
            <div className="settings-toggle-info">
              <h4>Documentation Completion Alerts</h4>
              <p>Receive notifications when a repository documentation run finishes.</p>
            </div>
            <input
              type="checkbox"
              className="w-5 h-5 accent-[#ff4f4f] cursor-pointer"
              checked={toggles.emailAlerts}
              onChange={() => toggle("emailAlerts")}
            />
          </div>

          <div className="settings-toggle-row">
            <div className="settings-toggle-info">
              <h4>Batch Generation Updates</h4>
              <p>Stream real-time progress events during batch AI generation.</p>
            </div>
            <input
              type="checkbox"
              className="w-5 h-5 accent-[#ff4f4f] cursor-pointer"
              checked={toggles.batchAutoSave}
              onChange={() => toggle("batchAutoSave")}
            />
          </div>
        </div>
      )}

      {activeTab === "Data & Storage" && (
        <div className="settings-section-block">
          <h3>Storage & Cache</h3>
          <div className="p-4 rounded-lg bg-[#0a1015] border border-[#212b33] space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#8c969f]">Local Workspace Cache</span>
              <span className="text-[#f0f2f4] font-medium">Automatic Isolation</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8c969f]">Batch Persistence</span>
              <span className="text-[#f0f2f4] font-medium">PostgreSQL JSONB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8c969f]">Artifact Retention</span>
              <span className="text-[#f0f2f4] font-medium">Persistent per project run</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Privacy" && (
        <div className="settings-section-block">
          <h3>Security & Secrets Scanner</h3>
          <div className="settings-toggle-row">
            <div className="settings-toggle-info">
              <h4>Automatic Secret Redaction</h4>
              <p>Mask API keys, passwords, and tokens before sending AST snippets to AI models.</p>
            </div>
            <input
              type="checkbox"
              className="w-5 h-5 accent-[#ff4f4f] cursor-pointer"
              checked={toggles.securityScan}
              onChange={() => toggle("securityScan")}
            />
          </div>

          <div className="settings-toggle-row">
            <div className="settings-toggle-info">
              <h4>Anonymous Telemetry</h4>
              <p>Share anonymized error logs to improve DocuAI stability.</p>
            </div>
            <input
              type="checkbox"
              className="w-5 h-5 accent-[#ff4f4f] cursor-pointer"
              checked={toggles.telemetry}
              onChange={() => toggle("telemetry")}
            />
          </div>
        </div>
      )}

      {activeTab === "Billing" && (
        <div className="settings-section-block">
          <h3>Current Plan</h3>
          <div className="p-5 rounded-lg bg-[#0a1015] border border-[#212b33] flex items-center justify-between">
            <div>
              <div className="text-base font-semibold text-[#f0f2f4]">DocuAI Developer Edition</div>
              <div className="text-xs text-[#8c969f] mt-1">Full access to Core Pipeline, AST Scan, SSE Streaming, and GitHub Sync.</div>
            </div>
            <span className="settings-badge verified">Active</span>
          </div>
        </div>
      )}

      {activeTab === "Help & Support" && (
        <div className="settings-section-block">
          <h3>Resources & Guides</h3>
          <div className="space-y-3">
            <a
              href="https://github.com/harshtomar001/AI-Code-Documentation-Tool"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3.5 rounded-lg bg-[#0a1015] border border-[#212b33] hover:border-[#384550] text-sm text-[#f0f2f4] transition-colors"
            >
              <span>GitHub Documentation & Repository</span>
              <span className="text-[#8c969f]">↗</span>
            </a>
            <div className="p-4 rounded-lg bg-[#0a1015] border border-[#212b33] text-xs text-[#8c969f]">
              Need help? Check your pipeline execution logs in the DocPilot live workspace or review documentation history.
            </div>
          </div>
        </div>
      )}

      {activeTab === "Integrations" && (
        <div className="settings-section-block">
          <h3>Available Integrations</h3>
          <p>More CI/CD integrations (GitLab, Bitbucket) are coming soon.</p>
        </div>
      )}
    </div>
  );
}
