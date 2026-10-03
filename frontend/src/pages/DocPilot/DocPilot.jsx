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

import CompletionPanel from "./components/demo/CompletionPanel.jsx";
import JobFailedCard from "./components/demo/JobFailedCard.jsx";
import { useEngine } from "./hooks/useEngine.js";

import { getToken } from "../../utils/getToken.js";
import { getProject } from "../../api/projectStore.js";

import "./styles/tokens.css";
import "./styles/base.css";
import "./DocPilot.css";

function DocPilotContent() {
  const engine = useEngine();

  const isCompleted =
    engine.realJob && (engine.finished || engine.jobStatus === "completed");
  const isFailed = engine.realJob && engine.jobStatus === "failed";

  return (
    <main className="docpilot-content">
      <RepoHeader />

      <div className="demo-layout">
        {isFailed && <JobFailedCard />}

        {isCompleted ? (
          <div className="demo-grid demo-grid--completed">
            <CompletionPanel />

            <div className="demo-grid__right">
              <EventFeed />
              <CommitPanel />
            </div>
          </div>
        ) : (
          <div className="demo-grid">
            <Pipeline />

            <div className="demo-grid__right">
              <EventFeed />
              <CommitPanel />
              <ProgressCard />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function DocPilot() {
  const [engine] = useState(() => new Engine());
  const [theme, setTheme] = useState("dark");

  const [searchParams, setSearchParams] = useSearchParams();

  const projectId = searchParams.get("projectId");
  const jobIdFromQuery = searchParams.get("jobId");
  const shouldStart = searchParams.get("start") === "true";

  useEffect(() => {
    let cancelled = false;

    const setupEngine = async () => {
      const token = getToken();

      if (!projectId) {
        // Run simulated demo
        engine.start({ simulate: true });
        return;
      }

      // Real Core AI job
      engine.start({ simulate: false });

      // Determine the job to load or start
      let targetJobId = jobIdFromQuery || null;

      if (!targetJobId) {
        try {
          targetJobId = localStorage.getItem(`docpilot_job_${projectId}`);
        } catch {}
      }

      let projectName = "repository";
      try {
        const project = await getProject(projectId);
        if (project?.name) {
          projectName = project.name;
        }
        if (!targetJobId && project?.latest_job_id) {
          targetJobId = project.latest_job_id;
        }
      } catch (err) {
        console.warn("Could not fetch project details:", err);
      }

      if (cancelled) return;

      if (shouldStart || (!targetJobId && !cancelled)) {
        // Start a fresh documentation job
        await engine.startProjectJob(projectId, projectName, token);
        if (!cancelled && engine.jobId) {
          setSearchParams(
            { projectId, jobId: engine.jobId },
            { replace: true }
          );
        }
      } else if (targetJobId && !cancelled) {
        // Load existing job
        if (jobIdFromQuery !== targetJobId) {
          setSearchParams(
            { projectId, jobId: targetJobId },
            { replace: true }
          );
        }
        await engine.loadExistingJob(projectId, targetJobId, token);
      }
    };

    setupEngine();

    return () => {
      cancelled = true;
      engine.stop();
    };
  }, [engine, projectId, jobIdFromQuery, shouldStart, setSearchParams]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <EngineContext.Provider value={engine}>
      <div className="docpilot-page">
        <Topbar
          theme={theme}
          onToggleTheme={() =>
            setTheme((t) => (t === "dark" ? "light" : "dark"))
          }
        />

        <DocPilotContent />
      </div>

      <ReviewModal />
      <ToastStack />
    </EngineContext.Provider>
  );
}
