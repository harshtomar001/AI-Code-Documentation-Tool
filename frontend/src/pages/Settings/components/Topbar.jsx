import React from "react";
import Icon from "./Icon";
import "./Topbar.css";

export default function Topbar({
  darkMode = true,
  setDarkMode,
  userName = "User",
  avatarLetter = "U",
  onNotify,
}) {
  return (
    <header className="topbar">
      <div className="search-box">
        <Icon name="search" size={20} />

        <input
          type="text"
          placeholder="Search settings..."
          aria-label="Search"
        />
      </div>

      <div className="topbar-actions">
        <button
          className="icon-button"
          aria-label="Toggle theme"
          type="button"
          onClick={() => setDarkMode && setDarkMode((prev) => !prev)}
        >
          <Icon name={darkMode ? "moon" : "sun"} size={22} />
        </button>

        <button
          className="icon-button notification-button"
          aria-label="Notifications"
          type="button"
          onClick={() => onNotify && onNotify("No new notifications")}
        >
          <Icon name="bell" size={22} />
          <span className="notification-dot" />
        </button>

        <button className="user-menu" type="button">
          <span className="avatar">{avatarLetter}</span>
          <span className="user-name">{userName}</span>
        </button>
      </div>
    </header>
  );
}