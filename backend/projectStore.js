'use strict';

const fs = require('fs');
const path = require('path');

const PROJECTS_DIR = path.resolve(__dirname, '..', 'data', 'projects');

function ensureDir() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }
}

function sanitizeId(id) {
  return String(id || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getFilePath(id) {
  ensureDir();
  return path.join(PROJECTS_DIR, `${sanitizeId(id)}.json`);
}

function listProjects() {
  ensureDir();
  const files = fs.readdirSync(PROJECTS_DIR).filter((f) => f.endsWith('.json'));
  const projects = [];

  for (const file of files) {
    try {
      const fullPath = path.join(PROJECTS_DIR, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const data = JSON.parse(content);
      projects.push({
        id: data.id || path.basename(file, '.json'),
        name: data.name || 'Untitled Bot',
        prefix: data.prefix || '!',
        hasToken: Boolean(data.token?.trim()),
        nodeCount: Array.isArray(data.nodes) ? data.nodes.length : 0,
        edgeCount: Array.isArray(data.edges) ? data.edges.length : 0,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      });
    } catch {
      // ignore corrupt files
    }
  }

  // Sort newest updated first
  projects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return projects;
}

function getProject(id) {
  const filePath = getFilePath(id);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to read project: ${err.message}`);
  }
}

function saveProject(id, projectData) {
  ensureDir();
  const safeId = sanitizeId(id || projectData?.id || `proj_${Date.now()}`);
  const now = Date.now();

  const dataToSave = {
    ...projectData,
    id: safeId,
    name: projectData?.name || 'Untitled Bot',
    token: projectData?.token || '',
    prefix: projectData?.prefix || '!',
    nodes: Array.isArray(projectData?.nodes) ? projectData.nodes : [],
    edges: Array.isArray(projectData?.edges) ? projectData.edges : [],
    updatedAt: now,
    createdAt: projectData?.createdAt || now,
  };

  const filePath = path.join(PROJECTS_DIR, `${safeId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
  return dataToSave;
}

function createProject(name) {
  const safeName = String(name || 'My Bot').trim();
  const safeId = `${safeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  const projectData = {
    id: safeId,
    name: safeName,
    token: '',
    prefix: '!',
    nodes: [],
    edges: [],
    createdAt: now,
    updatedAt: now,
  };

  return saveProject(safeId, projectData);
}

function deleteProject(id) {
  const filePath = getFilePath(id);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

module.exports = {
  listProjects,
  getProject,
  saveProject,
  createProject,
  deleteProject,
};
