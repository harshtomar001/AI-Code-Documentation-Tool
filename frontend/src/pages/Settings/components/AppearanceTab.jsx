import React from "react";
import Icon from "./Icon";

export default function AppearanceTab({ darkMode, setDarkMode, onNotify }) {
  const handleThemeChange = (dark) => {
    if (setDarkMode) {
      setDarkMode(dark);
      if (onNotify) {
        onNotify(`Switched to ${dark ? "Dark" : "Light"} theme`);
      }
    }
  };

  return (
    <div className="settings-tab-card">
      <div className="settings-tab-header">
        <h2>Appearance & Theme</h2>
        <p>Customize the look and feel of the documentation workspace.</p>
      </div>

      <div className="settings-section-block">
        <h3>Theme Mode</h3>
        <p>Select your interface color theme.</p>

        <div className="theme-selector-grid">
          <div
            className={`theme-card ${darkMode ? "active" : ""}`}
            onClick={() => handleThemeChange(true)}
          >
            <div className="theme-card-title">
              <span>Dark Theme</span>
              {darkMode && <span>✓</span>}
            </div>
            <div className="theme-card-desc">
              High-contrast dark palette tailored for coding and documentation.
            </div>
          </div>

          <div
            className={`theme-card ${!darkMode ? "active" : ""}`}
            onClick={() => handleThemeChange(false)}
          >
            <div className="theme-card-title">
              <span>Light Theme</span>
              {!darkMode && <span>✓</span>}
            </div>
            <div className="theme-card-desc">
              Clean and crisp bright interface with high daylight readability.
            </div>
          </div>
        </div>
      </div>

      <div className="profile-divider my-6" />

      <div className="settings-section-block">
        <h3>Code Diff Preview</h3>
        <p>How code documentation diffs and syntax highlights will appear.</p>
        <div className="p-4 rounded-lg bg-[#080d11] border border-[#232c33] font-mono text-xs text-[#a0aab2]">
          <span className="text-[#64a0e8]">def</span>{" "}
          <span className="text-[#e2b765]">calculate_coverage</span>(code):
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;
          <span className="text-[#699872]">"""Calculate docstring coverage across modules."""</span>
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;
          <span className="text-[#e67575]">- return 0</span>
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;
          <span className="text-[#56d364]">+ return len(code.docstrings) / len(code.functions)</span>
        </div>
      </div>
    </div>
  );
}
