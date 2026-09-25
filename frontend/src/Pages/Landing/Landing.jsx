import React from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  FileCode2,
  MessageSquare,
  Moon,
  Play,
  Sparkles,
} from "lucide-react";
import "./landing.css";

function GitHubIcon({ size = 18, className = "" }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.78.5 12.28c0 5.2 3.29 9.61 7.86 11.17.57.11.78-.25.78-.56v-2.16c-3.2.72-3.87-1.4-3.87-1.4-.52-1.35-1.27-1.71-1.27-1.71-1.04-.73.08-.72.08-.72 1.15.08 1.75 1.21 1.75 1.21 1.02 1.78 2.68 1.27 3.33.97.1-.76.4-1.27.73-1.56-2.55-.3-5.23-1.31-5.23-5.82 0-1.29.45-2.34 1.18-3.17-.12-.3-.51-1.5.11-3.13 0 0 .96-.31 3.15 1.21a10.6 10.6 0 0 1 5.74 0c2.19-1.52 3.15-1.21 3.15-1.21.62 1.63.23 2.83.11 3.13.73.83 1.18 1.88 1.18 3.17 0 4.52-2.69 5.52-5.25 5.81.41.37.78 1.1.78 2.22v3.29c0 .31.21.68.79.56 4.56-1.56 7.85-5.97 7.85-11.17C23.5 5.78 18.35.5 12 .5Z" />
    </svg>
  );
}

function Landing() {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <main className="landing-page">
      {/* Navbar */}
      <header className="navbar">
        <button
          className="logo"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Go to home"
        >
          <span className="logo-icon">
            <FileCode2 />
            <span>AI</span>
          </span>
          <span className="logo-text">DocuAI</span>
        </button>

        <nav className="nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#docs">Docs</a>
          <a href="#demo">Demo</a>
          <a href="#pricing">Pricing</a>
        </nav>

        <div className="nav-actions">
          <button className="theme-button" aria-label="Toggle theme">
            <Moon size={18} />
          </button>

          <button className="signin-button" onClick={() => scrollTo("login")}>
            Sign In
          </button>

          <button
            className="get-started-button"
            onClick={() => scrollTo("login")}
          >
            Get Started
            <ArrowRight size={16} />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-section" id="demo">
        <div className="hero-badge">
          <Sparkles size={14} />
          AI-POWERED DEVELOPER PRODUCTIVITY
        </div>

        <h1 className="hero-title">
          Turn Your Code Into
          <br />
          Clear <span>Documentation</span>
        </h1>

        <p className="hero-description">
          Generate docstrings, inline comments, technical documentation
          <br />
          and professional README files for any project — in seconds.
        </p>

        <div className="hero-actions">
          <button
            className="primary-hero-button"
            onClick={() => scrollTo("login")}
          >
            <GitHubIcon size={18} />
            Import Repository
            <ArrowRight size={16} />
          </button>

          <button
            className="secondary-hero-button"
            onClick={() => scrollTo("demo-preview")}
          >
            <Play size={16} />
            Watch Demo
          </button>
        </div>

        {/* Product preview */}
        <div className="code-window" id="demo-preview">
          <div className="window-header">
            <div className="window-controls">
              <span className="window-dot red" />
              <span className="window-dot yellow" />
              <span className="window-dot green" />
            </div>

            <div className="repository-name">
              <GitHubIcon size={16} />
              <span>student-erp</span>
              <ChevronDown className="repo-arrow" size={14} />
            </div>

            <div className="product-tabs">
              <button className="product-tab active">
                <span>&lt;/&gt;</span>
                Code
              </button>

              <button className="product-tab">
                <FileCode2 size={14} />
                <span>Documentation</span>
              </button>

              <button className="product-tab">
                <BarChart3 size={14} />
                <span>Analysis</span>
              </button>

              <button className="product-tab">
                <FileCode2 size={14} />
                <span>README</span>
              </button>
            </div>
          </div>

          <div className="code-comparison">
            <div className="code-panel before-panel">
              <div className="code-label">Before</div>

              <div className="code-content">
                <div className="code-line">
                  <span className="line-number">1</span>
                  <span>
                    <span className="keyword">def</span>{" "}
                    <span className="function">calculate_average</span>
                    (scores):
                  </span>
                </div>

                <div className="code-line">
                  <span className="line-number">2</span>
                  <span className="indent">total = 0</span>
                </div>

                <div className="code-line">
                  <span className="line-number">3</span>
                  <span className="indent">
                    <span className="keyword">for</span> s{" "}
                    <span className="keyword">in</span> scores:
                  </span>
                </div>

                <div className="code-line">
                  <span className="line-number">4</span>
                  <span className="indent-2">total += s</span>
                </div>

                <div className="code-line">
                  <span className="line-number">5</span>
                  <span className="indent">
                    <span className="keyword">return</span> total / len(scores)
                  </span>
                </div>
              </div>
            </div>

            <div className="conversion-arrow">
              <ArrowRight size={20} />
            </div>

            <div className="code-panel after-panel">
              <div className="code-label ai-label">
                <Sparkles size={12} />
                After (AI Generated)
              </div>

              <div className="code-content">
                <div className="code-line">
                  <span className="line-number">1</span>
                  <span>
                    <span className="keyword">def</span>{" "}
                    <span className="function">calculate_average</span>
                    (scores):
                  </span>
                </div>

                <div className="code-line">
                  <span className="line-number">2</span>
                  <span className="docstring">"""</span>
                </div>

                <div className="code-line">
                  <span className="line-number">3</span>
                  <span className="docstring indent">
                    Calculates the average score from a list.
                  </span>
                </div>

                <div className="code-line">
                  <span className="line-number">4</span>
                  <span className="docstring"> </span>
                </div>

                <div className="code-line">
                  <span className="line-number">5</span>
                  <span className="docstring indent">Args:</span>
                </div>

                <div className="code-line">
                  <span className="line-number">6</span>
                  <span className="docstring indent-2">
                    scores (list[float]): List of numeric scores.
                  </span>
                </div>

                <div className="code-line">
                  <span className="line-number">7</span>
                  <span className="docstring"> </span>
                </div>

                <div className="code-line">
                  <span className="line-number">8</span>
                  <span className="docstring indent">Returns:</span>
                </div>

                <div className="code-line">
                  <span className="line-number">9</span>
                  <span className="docstring indent-2">
                    float: The average of all scores.
                  </span>
                </div>

                <div className="code-line">
                  <span className="line-number">10</span>
                  <span className="docstring">"""</span>
                </div>

                <div className="code-line">
                  <span className="line-number">11</span>
                  <span className="indent">total = 0</span>
                </div>

                <div className="code-line">
                  <span className="line-number">12</span>
                  <span className="indent">
                    <span className="keyword">for</span> s{" "}
                    <span className="keyword">in</span> scores:
                  </span>
                </div>

                <div className="code-line">
                  <span className="line-number">13</span>
                  <span className="indent-2">total += s</span>
                </div>

                <div className="code-line">
                  <span className="line-number">14</span>
                  <span className="indent">
                    <span className="keyword">return</span> total / len(scores)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating feature cards */}
        <div className="feature-layout">
          <article className="feature-card feature-left">
            <div className="feature-icon">
              <FileCode2 size={21} />
            </div>
            <h3>Add Docstrings</h3>
            <p>Generate accurate docstrings for all functions.</p>
          </article>

          <article className="feature-card feature-left-bottom">
            <div className="feature-icon">
              <MessageSquare size={21} />
            </div>
            <h3>Inline Comments</h3>
            <p>Add meaningful comments to complex code sections.</p>
          </article>

          <article className="feature-card feature-right">
            <div className="feature-icon">
              <BookOpen size={21} />
            </div>
            <h3>README Generator</h3>
            <p>Create professional README files with project overview.</p>
          </article>

          <article className="feature-card feature-right-bottom">
            <div className="feature-icon">
              <BarChart3 size={21} />
            </div>
            <h3>Project Analyzer</h3>
            <p>Detect issues, suggest improvements, and follow best practices.</p>
          </article>
        </div>
      </section>

      {/* Features */}
      <section className="how-it-works-section" id="features">
        <div className="section-badge">
          <Sparkles size={14} />
          FEATURES
        </div>

        <h2>
          Everything your codebase needs to stay <span>understandable.</span>
        </h2>

        <p>One workflow for code analysis, documentation, and collaboration.</p>

        <div className="steps-container">
          <article className="step-card">
            <div className="step-number">01</div>
            <FileCode2 size={24} />
            <h3>Generate Documentation</h3>
            <p>Turn undocumented functions into clear, useful documentation.</p>
          </article>

          <article className="step-card">
            <div className="step-number">02</div>
            <MessageSquare size={24} />
            <h3>Add Code Comments</h3>
            <p>Make complex sections easier for developers to understand.</p>
          </article>

          <article className="step-card">
            <div className="step-number">03</div>
            <BarChart3 size={24} />
            <h3>Analyze Your Project</h3>
            <p>Find documentation gaps and areas that need attention.</p>
          </article>

          <article className="step-card">
            <div className="step-number">04</div>
            <BookOpen size={24} />
            <h3>Create README</h3>
            <p>Generate professional project documentation automatically.</p>
          </article>
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works-section" id="how-it-works">
        <div className="section-badge">
          <Sparkles size={14} />
          HOW IT WORKS
        </div>

        <h2>
          From repository to <span>documentation.</span>
        </h2>

        <p>Connect your repository and let DocuAI handle the repetitive work.</p>
      </section>

      {/* Docs */}
      <section className="how-it-works-section" id="docs">
        <div className="section-badge">
          <FileCode2 size={14} />
          DOCS
        </div>

        <h2>
          Documentation generated <span>from your code.</span>
        </h2>

        <p>Keep your technical documentation close to the source code.</p>
      </section>

      {/* Pricing */}
      <section className="how-it-works-section" id="pricing">
        <div className="section-badge">
          <Sparkles size={14} />
          PRICING
        </div>

        <h2>
          Simple plans for <span>developers and teams.</span>
        </h2>

        <p>Choose the workflow that fits your project.</p>
      </section>

      {/* Final CTA */}
      <section className="final-cta" id="login">
        <Sparkles size={25} />

        <h2>
          Ready to document your <span>repository?</span>
        </h2>

        <p>
          Connect your GitHub account and start analyzing your project with
          DocuAI.
        </p>

        <button
          className="primary-hero-button"
          onClick={() => console.log("Connect GitHub")}
        >
          <GitHubIcon size={18} />
          Continue with GitHub
          <ArrowRight size={16} />
        </button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-brand">
          <div className="logo">
            <span className="logo-icon">
              <FileCode2 />
              <span>AI</span>
            </span>
            <span className="logo-text">DocuAI</span>
          </div>

          <p>
            AI-powered documentation and developer productivity for modern
            codebases.
          </p>
        </div>

        <div className="footer-links">
          <div>
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
          </div>

          <div>
            <h4>Resources</h4>
            <a href="#docs">Documentation</a>
            <a href="#demo">Demo</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default Landing;
