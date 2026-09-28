import Brand from './Brand.jsx';
import Icon from '../common/Icon.jsx';
import './Sidebar.css';

const ITEMS = [
  { key: 'demo', label: 'Demo', icon: 'play' },
  { key: 'repos', label: 'Repositories', icon: 'folder' },
  { key: 'history', label: 'History', icon: 'clock' },
  { key: 'settings', label: 'Settings', icon: 'sliders' },
];

/** Only "Demo" is wired up in this prototype; the rest are visual placeholders. */
export default function Sidebar() {
  return (
    <aside className="sidebar">
      <Brand />
      <nav className="nav" aria-label="Main">
        {ITEMS.map((it) => (
          <button
            key={it.key}
            className={`nav__item ${it.key === 'demo' ? 'nav__item--on' : ''}`}
            aria-current={it.key === 'demo' ? 'page' : undefined}
            title={it.key === 'demo' ? undefined : 'Not part of this prototype'}
          >
            <Icon name={it.icon} size={22} stroke={1.7} />
            <span className="nav__label">{it.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
