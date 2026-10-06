import React from "react";
import Icon from "./Icon";
import "./SettingsMenu.css";

const items = [
  ["user", "Profile", "Manage your personal information"],
  ["lock", "Account", "Security and login settings"],
  ["palette", "Appearance", "Theme and display preferences"],
  ["bell", "Notifications", "Manage your notification preferences"],
  ["link", "Integrations", "Connect external services"],
  ["github", "GitHub", "Manage your GitHub account"],
  ["database", "Data & Storage", "Manage your data and storage"],
  ["shield", "Privacy", "Control your privacy settings"],
  ["card", "Billing", "Manage your subscription"],
  ["help", "Help & Support", "Get help and contact support"],
];

export default function SettingsMenu({
  activeTab,
  setActiveTab,
}) {
  return (
    <aside className="settings-menu">
      {items.map(([icon, title, subtitle]) => (
        <button
          key={title}
          type="button"
          className={`settings-menu-item ${
            activeTab === title ? "selected" : ""
          }`}
          onClick={() => setActiveTab(title)}
        >
          <span className="settings-menu-icon">
            <Icon name={icon} size={25} />
          </span>

          <span className="settings-menu-copy">
            <strong>{title}</strong>
            <small>{subtitle}</small>
          </span>
        </button>
      ))}
    </aside>
  );
} 