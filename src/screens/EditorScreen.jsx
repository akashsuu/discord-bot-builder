import React, { useCallback, useRef, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useProject } from '../context/ProjectContext';
import nodeTypes, { DEFAULT_NODE_DATA } from '../nodes/nodeTypes';
import Toolbar from '../components/Toolbar';
import NodePalette from '../components/NodePalette';
import LogPanel from '../components/LogPanel';

let _nodeCounter = 1;

const MINIMAP_COLORS = {
  event_message: '#9b59b6',
  custom_command: '#3498db',
  send_message: '#2ecc71',
  condition_branch: '#e67e22',
};

function serializeNodes(nodes) {
  return nodes.map(({ id, type, position, data }) => ({ id, type, position, data }));
}

// ─── Inner editor — needs ReactFlowProvider as ancestor ───────────────────
function EditorInner() {
  const { projectData, projectPath, addLog } = useProject();

  const [nodes, setNodes, onNodesChange] = useNodesState(projectData?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(projectData?.edges || []);

  const { project: rfProject } = useReactFlow();
  const wrapperRef = useRef(null);
  const autoSaveRef = useRef(null);

  // ── Auto-save every 2s after changes ──────────────────────────────────
  useEffect(() => {
    if (!projectPath) return;
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      await window.electronAPI.saveProject({
        projectPath,
        projectData: { ...projectData, nodes: serializeNodes(nodes), edges },
      });
    }, 2000);
    return () => clearTimeout(autoSaveRef.current);
  }, [nodes, edges]); // intentional: only watch graph changes

  // ── Ctrl+S manual save ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!projectPath) return;
        await window.electronAPI.saveProject({
          projectPath,
          projectData: { ...projectData, nodes: serializeNodes(nodes), edges },
        });
        addLog('[System] Project saved (Ctrl+S).');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nodes, edges, projectPath, projectData, addLog]);

  // ── Connect nodes ─────────────────────────────────────────────────────
  const onConnect = useCallback((params) => {
    setEdges((eds) =>
      addEdge(
        {
          ...params,
          animated: true,
          style: { stroke: '#4ecdc4', strokeWidth: 2 },
        },
        eds
      )
    );
  }, [setEdges]);

  // ── Drag-and-drop from palette ────────────────────────────────────────
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow');
    if (!type || !wrapperRef.current) return;

    const bounds = wrapperRef.current.getBoundingClientRect();
    const position = rfProject({
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    });

    const id = `${type}_${Date.now()}_${_nodeCounter++}`;
    setNodes((prev) => [
      ...prev,
      {
        id,
        type,
        position,
        data: { ...(DEFAULT_NODE_DATA[type] || { label: type }) },
      },
    ]);
  }, [rfProject, setNodes]);

  return (
    <div className="editor-screen">
      <Toolbar nodes={nodes} edges={edges} />

      <div className="editor-body">
        <NodePalette />

        <div className="rf-wrapper" ref={wrapperRef}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            deleteKeyCode="Delete"
            snapToGrid
            snapGrid={[15, 15]}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#4ecdc4', strokeWidth: 2 },
            }}
            connectionLineStyle={{ stroke: '#4ecdc4', strokeWidth: 2 }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.5}
              color="#1e1f2e"
            />
            <Controls className="rf-controls" />
            <MiniMap
              nodeColor={(n) => MINIMAP_COLORS[n.type] || '#555'}
              maskColor="rgba(13,14,26,0.7)"
              style={{ background: '#13141f', border: '1px solid #2a2b3d' }}
            />
            <Panel position="top-right">
              <div className="canvas-info">
                {nodes.length} nodes · {edges.length} edges
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>

      <LogPanel />
    </div>
  );
}

// ─── Public component wraps EditorInner in its required Provider ──────────
export default function EditorScreen() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  );
}
