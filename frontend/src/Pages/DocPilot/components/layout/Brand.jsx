import Icon from '../common/Icon.jsx';

export default function Brand() {
  return (
    <div className="brand">
      <span className="brand__mark"><Icon name="doc" size={32} stroke={1.8} /></span>
      <span className="brand__name">DocPilot</span>
    </div>
  );
}
