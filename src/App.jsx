import React from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import HomeScreen from './screens/HomeScreen';
import CreateProjectScreen from './screens/CreateProjectScreen';
import TokenScreen from './screens/TokenScreen';
import EditorScreen from './screens/EditorScreen';

function AppRouter() {
  const { screen } = useProject();

  switch (screen) {
    case 'home':    return <HomeScreen />;
    case 'create':  return <CreateProjectScreen />;
    case 'token':   return <TokenScreen />;
    case 'editor':  return <EditorScreen />;
    default:        return <HomeScreen />;
  }
}

export default function App() {
  return (
    <ProjectProvider>
      <AppRouter />
    </ProjectProvider>
  );
}
