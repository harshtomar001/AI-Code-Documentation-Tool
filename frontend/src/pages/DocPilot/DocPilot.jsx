import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { Engine } from "./engine/Engine.js";
import { EngineContext } from "./engine/EngineContext.js";
import AppTopBar from "../common/AppTopBar.jsx";
import RepoHeader from "./components/demo/RepoHeader.jsx";
import Pipeline from "./components/demo/Pipeline.jsx";
import EventFeed from "./components/demo/EventFeed.jsx";
import CommitPanel from "./components/demo/CommitPanel.jsx";
import ProgressCard from "./components/demo/ProgressCard.jsx";

import ReviewModal from "./components/review/ReviewModal.jsx";
import ToastStack from "./components/common/ToastStack.jsx";

import CompletionPanel from "./components/demo/CompletionPanel.jsx";
import JobFailedCard from "./components/demo/JobFailedCard.jsx";
import UploadedFolderStructure from "./components/demo/UploadedFolderStructure.jsx";
import { useEngine } from "./hooks/useEngine.js";

import { getToken } from "../../utils/getToken.js";
import { getProject } from "../../api/projectStore.js";

import "./styles/tokens.css";
import "./styles/base.css";
import "./DocPilot.css";
import {getCurrentUser} from "../../api/auth.js";



function DocPilotContent() {
  const engine = useEngine();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isCompleted =
    engine.realJob && (engine.finished || engine.jobStatus === "completed");
  const isFailed = engine.realJob && engine.jobStatus === "failed";

  const resolvedProjectId =
    searchParams.get("projectId") ||
    location.state?.projectId ||
    engine.projectId;

  const initialFiles = location.state?.files || null;

  return (
    <main className="docpilot-content">
      <RepoHeader />

      <div className="demo-layout">
        {isFailed && <JobFailedCard />}

        {isCompleted ? (
          <>
            <div className="demo-grid demo-grid--completed">
              <CompletionPanel />

              <div className="demo-grid__right">
                <EventFeed />
                <CommitPanel />
              </div>
            </div>

            <UploadedFolderStructure
              projectId={resolvedProjectId}
              batches={engine.batches}
              repositoryName={engine.repositoryName}
              initialFiles={initialFiles}
            />
          </>
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
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const projectId = searchParams.get("projectId") || location.state?.projectId || null;
  const jobIdFromQuery = searchParams.get("jobId");
  const shouldStart = searchParams.get("start") === "true";

  const [engine] = useState(() => {
    const eng = new Engine();
    const pid =
      projectId ||
      (typeof localStorage !== "undefined"
        ? localStorage.getItem("docpilot_last_project")
        : null);
    if (pid) {
      eng.realJob = true;
      eng.projectId = pid;
      eng.batches = [];
      eng.events = [];
      eng.commits = [];
      eng.aside = "Initializing documentation pipeline...";
    }
    return eng;
  });

  const [theme, setTheme] = useState("dark");

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);


  const logout = () => {
    localStorage.removeItem(
      "access_token"
    );

    sessionStorage.removeItem(
      "access_token"
    );

    navigate(
      "/login",
      { replace: true }
    );
  };

  useEffect(() => {
    const loadUser = async () => {
      const token = getToken();

      if (!token) {
        navigate(
          "/login",
          { replace: true }
        );
        return;
      }

      try {
        const data =
          await getCurrentUser(
            token
          );

        console.log(
          "Authenticated user:",
          data
        );

        setUser(data);

      } catch (error) {
        console.error(
          "Failed to load current user:",
          error
        );

        localStorage.removeItem(
          "access_token"
        );

        sessionStorage.removeItem(
          "access_token"
        );

        navigate(
          "/login",
          { replace: true }
        );
      }
      finally {

        setLoadingUser(false);
      }
    };

    loadUser();

  }, [navigate]);

  useEffect(() => {
    return () => {
      engine.stop();
    };
  }, [engine]);

  useEffect(() => {
    let cancelled = false;

    const setupEngine = async () => {
      const token = getToken();

      let resolvedProjectId = projectId;
      if (!resolvedProjectId) {
        resolvedProjectId = location.state?.projectId || null;
      }
      if (!resolvedProjectId && token) {
        resolvedProjectId = localStorage.getItem("docpilot_last_project") || null;
      }

      if (!resolvedProjectId) {
        // Run simulated demo only when no project could be resolved at all
        if (engine.realJob) {
          engine.stop();
        }
        engine.start({ simulate: true });
        return;
      }

      // Determine the job to load or start
      let targetJobId = jobIdFromQuery || null;

      if (!targetJobId) {
        try {
          targetJobId =
            localStorage.getItem(`docpilot_job_${resolvedProjectId}`) ||
            (resolvedProjectId === localStorage.getItem("docpilot_last_project")
              ? localStorage.getItem("docpilot_last_job")
              : null);
        } catch {}
      }

      if (!projectId && resolvedProjectId) {
        const nextParams = { projectId: resolvedProjectId };
        if (targetJobId) nextParams.jobId = targetJobId;
        setSearchParams(nextParams, { replace: true });
      }

      // If engine is ALREADY running or loaded for this exact job and not starting a new one, skip!
      if (
        engine.realJob &&
        engine.jobId &&
        (engine.jobId === targetJobId || engine.jobId === jobIdFromQuery) &&
        !shouldStart
      ) {
        return;
      }

      // If switching to a different job, stop the previous one
      if (engine.jobId && targetJobId && engine.jobId !== targetJobId) {
        engine.stop();
      }

      // Real Core AI job
      engine.start({ simulate: false });

      let projectName = "repository";
      try {
        const project = await getProject(resolvedProjectId);
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
        await engine.startProjectJob(resolvedProjectId, projectName, token);
        if (!cancelled && engine.jobId) {
          setSearchParams(
            { projectId: resolvedProjectId, jobId: engine.jobId },
            { replace: true }
          );
        }
      } else if (targetJobId && !cancelled) {
        // Load existing job
        if (jobIdFromQuery !== targetJobId) {
          setSearchParams(
            { projectId: resolvedProjectId, jobId: targetJobId },
            { replace: true }
          );
        }
        await engine.loadExistingJob(resolvedProjectId, targetJobId, token, projectName);
      }
    };

    setupEngine();

    return () => {
      cancelled = true;
    };
  }, [engine, projectId, jobIdFromQuery, shouldStart, location.state, setSearchParams]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const userName = user?.name || "User";

    const userEmail = user?.email || "";

    const avatarLetter = userName.charAt(0).toUpperCase();

    const providers =
      user?.providers?.length
        ? user.providers.join(", ")
        : "local";

    const verificationText =
      user?.is_verified
        ? "Verified"
        : "Not verified";

  return (
    <EngineContext.Provider value={engine}>
      <div className="docpilot-page">
        <AppTopBar
          search={false}
          setSearch={
            false
          }
          darkMode={
            true
          }
          setDarkMode={
            false
          }
          showNotifications={
            showNotifications
          }
          setShowNotifications={
            setShowNotifications
          }
          showProfile={
            showProfile
          }
          setShowProfile={
            setShowProfile
          }
          userName={
            userName
          }
          avatarLetter={
            avatarLetter
          }
          userEmail={
            userEmail
          }
          verificationText={
            verificationText
          }
          providers={
            providers
          }
          reviewsCount={
            0
          }
          onNotify={
           null
          }
          onLogout={
            logout
          }
        />

        <DocPilotContent />
      </div>

      <ReviewModal />
      <ToastStack />
    </EngineContext.Provider>
  );
}
