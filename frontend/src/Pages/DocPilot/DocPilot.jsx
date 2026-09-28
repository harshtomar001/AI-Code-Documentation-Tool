import { useEffect, useState } from "react";

import { Engine } from "./engine/Engine.js";
import { EngineContext } from "./engine/EngineContext.js";

import Sidebar from "./components/layout/Sidebar.jsx";
import Topbar from "./components/layout/Topbar.jsx";

import RepoHeader from "./components/demo/RepoHeader.jsx";
import Pipeline from "./components/demo/Pipeline.jsx";
import EventFeed from "./components/demo/EventFeed.jsx";
import CommitPanel from "./components/demo/CommitPanel.jsx";
import ProgressCard from "./components/demo/ProgressCard.jsx";

import ReviewModal from "./components/review/ReviewModal.jsx";
import ToastStack from "./components/common/ToastStack.jsx";

import ArchitectureView from "./components/architecture/ArchitectureView.jsx";

import "./styles/tokens.css";
import "./styles/base.css";
import "./DocPilot.css";

export default function DocPilot() {
  const [engine] = useState(() => new Engine());
  const [theme, setTheme] = useState("dark");
  const [view, setView] = useState("demo");

  useEffect(() => {
    engine.start();

    return () => {
      engine.stop();
    };
  }, [engine]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (view === "arch") {
      engine.closeModal();
    }
  }, [view, engine]);

  return (
    <EngineContext.Provider value={engine}>
      <div className="app">
        <Sidebar />

        <div className="app__main">
          <Topbar
            theme={theme}
            onToggleTheme={() =>
              setTheme((t) => (t === "dark" ? "light" : "dark"))
            }
          />

          <main className="app__content">
            <RepoHeader
              view={view}
              onViewChange={setView}
            />

            {view === "demo" ? (
              <div className="demo-grid">
                <Pipeline />

                <div className="demo-grid__right">
                  <EventFeed />
                  <CommitPanel />
                  <ProgressCard />
                </div>
              </div>
            ) : (
              <ArchitectureView />
            )}
          </main>
        </div>
      </div>

      <ReviewModal />
      <ToastStack />
    </EngineContext.Provider>
  );
}
