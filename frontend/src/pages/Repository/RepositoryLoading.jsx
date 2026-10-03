import "./RepositoryLoading.css";

/*
 * Visual-only loading indicator.
 * The messages cycle via CSS and do NOT reflect real backend stages.
 */

const GITHUB_MESSAGES = [
  "Connecting to GitHub",
  "Fetching repository metadata",
  "Reading repository tree",
  "Loading source files",
  "Preparing documentation analysis",
];

const UPLOAD_MESSAGES = [
  "Preparing uploaded project",
  "Reading project files",
  "Building file tree",
  "Looking for README",
  "Preparing documentation analysis",
];

export default function RepositoryLoading({
  isUploadedProject = false,
}) {
  const messages = isUploadedProject
    ? UPLOAD_MESSAGES
    : GITHUB_MESSAGES;

  return (
    <div className="rl-root">
      <div className="rl-grid" aria-hidden="true" />

      <div className="rl-content">
        <div className="rl-stack" role="status">
          <span className="rl-sr-only">
            Loading repository…
          </span>

          {/* REPOSITORY VISUAL */}
          <div className="rl-repo" aria-hidden="true">
            <div className="rl-repo-bar">
              <span />
              <span />
              <span />
            </div>

            <div className="rl-repo-body">
              <div className="rl-repo-glyph">
                &lt;/&gt;
              </div>

              <div className="rl-line" style={{ width: "86%" }} />
              <div className="rl-line rl-line--accent" style={{ width: "52%" }} />
              <div className="rl-line" style={{ width: "70%" }} />
              <div className="rl-line" style={{ width: "38%" }} />

              <div className="rl-repo-label">
                REPOSITORY
              </div>
            </div>

            <div className="rl-scan" />
          </div>

          <div className="rl-connector" aria-hidden="true" />

          <div className="rl-target" aria-hidden="true">
            DOCUAI
          </div>

          {/* TEXT */}
          <p className="rl-title" aria-hidden="true">
            Loading repository
          </p>

          <div className="rl-status" aria-hidden="true">
            {messages.map((message) => (
              <span key={message}>{message}</span>
            ))}
          </div>

          {/* INDETERMINATE PROGRESS */}
          <div className="rl-progress" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
