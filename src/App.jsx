import React from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import HomeScreen from './screens/HomeScreen';
import CreateProjectScreen from './screens/CreateProjectScreen';
import TokenScreen from './screens/TokenScreen';
import EditorScreen from './screens/EditorScreen';

function AppRouter() {
 const { screen } = useProject();
 switch (screen) {
 case 'home': return <HomeScreen />;
 case 'create': return <CreateProjectScreen />;
 case 'token': return <TokenScreen />;
 case 'editor': return <EditorScreen />;
 default: return <HomeScreen />;
 }
}

class ErrorBoundary extends React.Component {
 constructor(props) {
 super(props);
 this.state = { error: null };
 }
 static getDerivedStateFromError(error) {
 return { error };
 }
 render() {
 if (this.state.error) {
 return (
 <div style={{
 display: 'flex', flexDirection: 'column', alignItems: 'center',
 justifyContent: 'center', height: '100vh',
 background: '#0d0e1a', color: '#e8e8f0', fontFamily: 'monospace', padding: 40,
 }}>
 <div style={{ fontSize: 40, marginBottom: 16 }}>⚠</div>
 <h2 style={{ marginBottom: 12, color: '#e94560' }}>Something went wrong</h2>
 <pre style={{
 background: '#1c1d2d', border: '1px solid #2a2b3d',
 borderRadius: 8, padding: 20, maxWidth: 700, overflow: 'auto',
 fontSize: 12, color: '#ff6b6b', whiteSpace: 'pre-wrap',
 }}>
 {this.state.error.message}
 {'\n\n'}
 {this.state.error.stack}
 </pre>
 <button
 onClick={() => this.setState({ error: null })}
 style={{
 marginTop: 20, padding: '10px 24px', background: '#5b3bff',
 color: '#fff', border: 'none', borderRadius: 8,
 cursor: 'pointer', fontSize: 14,
 }}
 >
 Try Again
 </button>
 </div>
 );
 }
 return this.props.children;
 }
}

export default function App() {
 return (
 <ErrorBoundary>
 <ProjectProvider>
 <AppRouter />
 </ProjectProvider>
 </ErrorBoundary>
 );
}
