import { useEngine } from "../../hooks/useEngine.js";
import Icon from "../common/Icon.jsx";
import Badge from "../common/Badge.jsx";
import "./Topbar.css";

function Brand() {
  return (
    <div className="brand">
      <span className="brand__mark">
        <Icon name="doc" size={32} stroke={1.8} />
      </span>
      <span className="brand__name">DocPilot</span>
    </div>
  );
}

export default function Topbar({ theme, onToggleTheme }) {
  const engine = useEngine();
  const waiting = engine.counts().ready;
  const first = engine.batches.findIndex((b) => b.status === "ready");

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <Brand />
      </div>

      <button
        className="topbar__icon"
        onClick={onToggleTheme}
        aria-label={
          theme === "dark"
            ? "Switch to light theme"
            : "Switch to dark theme"
        }
      >
        <Icon
          name={theme === "dark" ? "moon" : "sun"}
          size={24}
          stroke={1.7}
        />
      </button>

      <button
        className="topbar__icon"
        disabled={first < 0}
        onClick={() => engine.openModal(first)}
        aria-label={
          waiting
            ? `${waiting} batches waiting for review`
            : "No batches waiting"
        }
        title={
          waiting
            ? "Open the next batch to review"
            : "Nothing to review yet"
        }
      >
        <Icon name="bell" size={24} stroke={1.7} />

        {waiting > 0 ? (
          <Badge count={waiting} variant="bell" />
        ) : (
          <span className="topbar__dot" hidden />
        )}
      </button>

      <button className="user" aria-label="Account menu">
        <span className="user__avatar">A</span>
        <span className="user__name">Aayushi</span>
        <Icon name="chevronDown" size={18} />
      </button>
    </header>
  );
}
