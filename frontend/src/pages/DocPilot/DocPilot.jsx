import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Engine } from "./engine/Engine.js";
import { EngineContext } from "./engine/EngineContext.js";

import Topbar from "./components/layout/Topbar.jsx";

import RepoHeader from "./components/demo/RepoHeader.jsx";
import Pipeline from "./components/demo/Pipeline.jsx";
import EventFeed from "./components/demo/EventFeed.jsx";
import CommitPanel from "./components/demo/CommitPanel.jsx";
import ProgressCard from "./components/demo/ProgressCard.jsx";

import ReviewModal from "./components/review/ReviewModal.jsx";
import ToastStack from "./components/common/ToastStack.jsx";

import ArchitectureView from "./components/architecture/ArchitectureView.jsx";

import { getToken } from "../../utils/getToken.js";

import "./styles/tokens.css";
import "./styles/base.css";
import "./DocPilot.css";

export default function DocPilot() {
  const [engine] = useState(() => new Engine());
  const [theme, setTheme] = useState("dark");
  const [view, setView] = useState("demo");

  const [searchParams] = useSearchParams();

  const projectId = searchParams.get("projectId");
  const startedProjectRef = useRef(null);

  useEffect(() => {
    engine.start({
      simulate: !projectId,
    });

    if (projectId) {
      if (startedProjectRef.current !== projectId) {
        startedProjectRef.current = projectId;

        engine.startProjectJob(
          projectId,
          "repository",
          getToken()
        );
      }
    } else {
      startedProjectRef.current = null;
    }

    return () => {
      engine.stop();
    };
  }, [engine, projectId]);

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
      <div className="docpilot-page">
        <Topbar
          theme={theme}
          onToggleTheme={() =>
            setTheme((t) =>
              t === "dark" ? "light" : "dark"
            )
          }
        />

        <main className="docpilot-content">
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

      <ReviewModal />
      <ToastStack />
    </EngineContext.Provider>
  );
}
