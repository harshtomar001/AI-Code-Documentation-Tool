import { Search, Moon, Bell, ChevronDown } from "lucide-react";

export default function Topbar({
  search = "",
  setSearch = () => {},
  darkMode = true,
  setDarkMode = () => {},
  userName = "User",
  avatarLetter = "U",
}) {
  return (
    <header className="topbar">
      <div className="global-search">
        <Search size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search repositories, projects..."
        />
        <kbd>Ctrl K</kbd>
      </div>

      <div className="top-actions">
        <button
          className="circle-button"
          onClick={() => setDarkMode(!darkMode)}
          aria-label="Toggle theme"
        >
          <Moon size={19} />
        </button>

        <button
          className="circle-button notification"
          onClick={() => {}}
          aria-label="Notifications"
        >
          <Bell size={19} />
          <span />
        </button>

        <button className="profile" type="button">
          <span className="avatar">{avatarLetter}</span>
          <span>{userName}</span>
          <ChevronDown size={15} />
        </button>
      </div>
    </header>
  );
}
