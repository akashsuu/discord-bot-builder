import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [screen, setScreen] = useState('home');
  const [projectData, setProjectData] = useState(null);
  const [projectPath, setProjectPath] = useState(null);
  const [botRunning, setBotRunning] = useState(false);
  const [logs, setLogs] = useState([]);

  // Subscribe to bot events from main process
  useEffect(() => {
    window.electronAPI.onBotLog((log) => {
      addLog(log);
    });
    window.electronAPI.onBotStatus((status) => {
      setBotRunning(status.running);
    });
    return () => {
      window.electronAPI.removeListener('bot:log');
      window.electronAPI.removeListener('bot:status');
    };
  }, []);

  const addLog = useCallback((text) => {
    setLogs((prev) => [
      ...prev.slice(-499), // cap at 500 entries
      { id: Date.now() + Math.random(), text, time: new Date().toLocaleTimeString() },
    ]);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const updateProject = useCallback((patch) => {
    setProjectData((prev) => ({ ...prev, ...patch }));
  }, []);

  const openProject = useCallback((path, data) => {
    setProjectPath(path);
    setProjectData(data);
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        screen, setScreen,
        projectData, setProjectData,
        projectPath, setProjectPath,
        botRunning, setBotRunning,
        logs, addLog, clearLogs,
        updateProject, openProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be inside ProjectProvider');
  return ctx;
}
