import { FACE_LABELS, getFacesForType, LUANTI_MAX_VERTICES, LUANTI_RECOMMENDED_TRIS, nextNodeId, createStarterNode, clampNodeToWorkspace, mirrorNodeAcrossAxis, computeAutoSelectionBox, snapValue, estimateGeometryStats, computeSceneBudget, pxToLuantiBox, } from './shapes.js'; import { ClipboardAndHistory } from './clipboard.js'; import { StudioViewport } from './viewport.js'; import { readImageFileAsDataUrl } from './textures.js'; import { exportNodeboxLua, exportWavefrontObj, exportGlbBuffer, buildModBundleFiles, } from './exporters.js';
const state = { nodes: [createStarterNode()], materials: [], selectionBox: { x1: 0, y1: 0, z: 0, x2: 16, y2: 16, z2: 16 }, selectedId: null, activeFace: '+Y', snapStep: 1, showBounds: true, showSelBox: false, wireframe: false, }; state.selectedId = state.nodes[0].id;
const history = new ClipboardAndHistory(60); const canvas = document.getElementById('viewport-canvas'); const viewport = new StudioViewport(canvas, (id) => { selectNode(id); });
function selectNode(id) { state.selectedId = id; const sel = getSelectedNode(); if (sel) { const validFaces = getFacesForType(sel.type, Boolean(sel.half)); if (validFaces.length > 0 && !validFaces.includes(state.activeFace)) { state.activeFace = validFaces[0]; } } refreshAll(); }
function showToast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.classList.remove('hidden'); clearTimeout(showToast._t); showToast._t = setTimeout(() => el.classList.add('hidden'), 3000); }
function getSelectedNode() { return state.nodes.find((n) => n.id === state.selectedId) || null; }
function getMaterialById(id) { return state.materials.find((m) => m.id === id) || null; }
function snapshotState() { return { nodes: state.nodes, materials: state.materials, selectionBox: state.selectionBox, }; }
function restoreSnapshot(snap) { if (Array.isArray(snap)) { state.nodes = snap; } else if (snap && Array.isArray(snap.nodes)) { state.nodes = snap.nodes; state.materials = snap.materials || []; if (snap.selectionBox) state.selectionBox = snap.selectionBox; } }
function addPrimitive(type) { const defaultSegs = 12; const incoming = estimateGeometryStats(type, defaultSegs); const current = computeSceneBudget(state.nodes);
if (current.vertices + incoming.vertices > LUANTI_MAX_VERTICES) { showToast(Blocked: Adding this ${type} exceeds Luanti's ${LUANTI_MAX_VERTICES.toLocaleString()} vertex cap.); return; }
history.pushSnapshot(snapshotState()); const count = state.nodes.filter((n) => n.type === type).length + 1; const label = type.charAt(0).toUpperCase() + type.slice(1);
const node = clampNodeToWorkspace({ id: nextNodeId(), name: ${label} ${count}, type, half: false, pos: { x: 4, y: 16, z: 4 }, size: { x: 8, y: 8, z: 8 }, rot: { x: 0, y: 0, z: 0 }, segments: defaultSegs, color: '#57e389', materialId: null, faceMaterials: {}, faceUV: {}, });
state.nodes.push(node); selectNode(node.id); }
function deleteSelected() { const sel = getSelectedNode(); if (!sel) return; history.pushSnapshot(snapshotState()); state.nodes = state.nodes.filter((n) => n.id !== sel.id); selectNode(state.nodes.length > 0 ? state.nodes[state.nodes.length - 1].id : null); }
function copySelected() { const sel = getSelectedNode(); if (!sel) return; history.copy([sel]); showToast(Copied "${sel.name}"); }
function pasteClipboard() { if (history.clipboard.length === 0) { showToast('Clipboard is empty'); return; } const pasted = history.paste(state.snapStep > 0 ? Math.max(1, state.snapStep) : 1); const incomingVerts = computeSceneBudget(pasted).vertices; const currentVerts = computeSceneBudget(state.nodes).vertices;
if (currentVerts + incomingVerts > LUANTI_MAX_VERTICES) { showToast(Blocked: Pasting exceeds Luanti's ${LUANTI_MAX_VERTICES.toLocaleString()} vertex cap.); return; }
history.pushSnapshot(snapshotState()); state.nodes.push(...pasted); selectNode(pasted[pasted.length - 1].id); showToast(Pasted "${pasted[0].name}"); }
function duplicateSelected() { const sel = getSelectedNode(); if (!sel) return; history.copy([sel]); pasteClipboard(); }
function mirrorSelected(axis) { const sel = getSelectedNode(); if (!sel) { showToast('Select a piece first to mirror'); return; } const incomingVerts = computeSceneBudget([sel]).vertices; const currentVerts = computeSceneBudget(state.nodes).vertices; if (currentVerts + incomingVerts > LUANTI_MAX_VERTICES) { showToast(Blocked: Mirroring exceeds Luanti's ${LUANTI_MAX_VERTICES.toLocaleString()} vertex cap.); return; } history.pushSnapshot(snapshotState()); const mirrored = mirrorNodeAcrossAxis(sel, axis); state.nodes.push(mirrored); selectNode(mirrored.id); showToast(Mirrored "${sel.name}" across ${axis.toUpperCase()}); }
function assignMaterialToActiveTarget(matId) { const sel = getSelectedNode(); if (!sel) { showToast('Select a piece first to apply a material'); return; } history.pushSnapshot(snapshotState()); const validFaces = getFacesForType(sel.type, Boolean(sel.half)); if (validFaces.length > 0) { const faceKey = validFaces.includes(state.activeFace) ? state.activeFace : validFaces[0]; sel.faceMaterials = sel.faceMaterials || {}; if (matId) { sel.faceMaterials[faceKey] = matId; } else { delete sel.faceMaterials[faceKey]; } } else { sel.materialId = matId || null; } refreshAll(); }
function renderOutliner() { const list = document.getElementById('outliner-list'); list.innerHTML = ''; for (const node of state.nodes) { const li = document.createElement('li'); li.className = outliner-item${node.id === state.selectedId ? ' selected' : ''};
```
const nameSpan = document.createElement('span');
nameSpan.className = 'outliner-name';
nameSpan.textContent = node.name;
nameSpan.title = 'Double-click to rename';

nameSpan.addEventListener('dblclick', (e) => {
  e.stopPropagation();
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'outliner-rename-input';
  input.value = node.name;
  li.replaceChild(input, nameSpan);
  input.focus();
  input.select();

  const commit = () => {
    const val = input.value.trim();
    if (val && val !== node.name) {
      history.pushSnapshot(snapshotState());
      node.name = val;
    }
    refreshAll();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (ke) => {
    if (ke.key === 'Enter') {
      ke.preventDefault();
      input.blur();
    } else if (ke.key === 'Escape') {
      refreshAll();
    }
  });
});

const tagSpan = document.createElement('span');
tagSpan.className = 'outliner-tag';
tagSpan.textContent = node.type;

li.appendChild(nameSpan);
li.appendChild(tagSpan);

li.addEventListener('click', () => {
  selectNode(node.id);
});
list.appendChild(li);
```
} }
function renderMaterialsLibrary() { const list = document.getElementById('materials-list'); list.innerHTML = '';
const sel = getSelectedNode(); const validFaces = sel ? getFacesForType(sel.type, Boolean(sel.half)) : []; const activeFaceKey = validFaces.includes(state.activeFace) ? state.activeFace : validFaces[0]; const activeMatId = sel ? (validFaces.length > 0 ? (sel.faceMaterials?.[activeFaceKey] || sel.materialId) : sel.materialId) : null;
if (state.materials.length === 0) { const empty = document.createElement('li'); empty.className = 'sub-readout'; empty.style.padding = '6px'; empty.textContent = 'No shared materials yet. Click + PNG or + Color above.'; list.appendChild(empty); return; }
for (const mat of state.materials) { const li = document.createElement('li'); li.className = material-item${mat.id === activeMatId ? ' active-mat' : ''}; li.title = sel ? Click to apply "${mat.name}" to ${validFaces.length > 0 ? (FACE_LABELS[activeFaceKey] || activeFaceKey) : sel.name} : mat.name;
```
const swatch = document.createElement('span');
swatch.className = 'mat-swatch';
if (mat.dataUrl) {
  swatch.style.backgroundImage = `url(${mat.dataUrl})`;
} else {
  swatch.style.backgroundColor = mat.color || '#6ea8fe';
}

const label = document.createElement('span');
label.className = 'mat-name';
label.textContent = mat.name;

label.addEventListener('dblclick', (e) => {
  e.stopPropagation();
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'outliner-rename-input';
  input.value = mat.name;
  li.replaceChild(input, label);
  input.focus();
  input.select();
  const commit = () => {
    const val = input.value.trim();
    if (val && val !== mat.name) {
      history.pushSnapshot(snapshotState());
      mat.name = val;
    }
    refreshAll();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (ke) => {
    if (ke.key === 'Enter') input.blur();
    else if (ke.key === 'Escape') refreshAll();
  });
});

const delBtn = document.createElement('button');
delBtn.className = 'mat-del';
delBtn.textContent = '✕';
delBtn.title = 'Remove from Material List';
delBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  history.pushSnapshot(snapshotState());
  state.materials = state.materials.filter((m) => m.id !== mat.id);
  for (const n of state.nodes) {
    if (n.materialId === mat.id) n.materialId = null;
    if (n.faceMaterials) {
      for (const fk of Object.keys(n.faceMaterials)) {
        if (n.faceMaterials[fk] === mat.id) delete n.faceMaterials[fk];
      }
    }
  }
  refreshAll();
});

li.appendChild(swatch);
li.appendChild(label);
li.appendChild(delBtn);

li.addEventListener('click', () => {
  assignMaterialToActiveTarget(mat.id);
});

list.appendChild(li);
```
} }
function populateMaterialSelect(selectEl, selectedMatId, defaultLabel) { selectEl.innerHTML = ''; const noneOpt = document.createElement('option'); noneOpt.value = ''; noneOpt.textContent = defaultLabel; selectEl.appendChild(noneOpt);
for (const mat of state.materials) { const opt = document.createElement('option'); opt.value = mat.id; opt.textContent = mat.name; if (mat.id === selectedMatId) opt.selected = true; selectEl.appendChild(opt); } }
function renderInspector() { const sel = getSelectedNode(); const emptyEl = document.getElementById('inspector-empty'); const bodyEl = document.getElementById('inspector-body'); const badgeEl = document.getElementById('selected-type-badge');
document.getElementById('selbox-x1').value = state.selectionBox.x1; document.getElementById('selbox-y1').value = state.selectionBox.y1; document.getElementById('selbox-z1').value = state.selectionBox.z1; document.getElementById('selbox-x2').value = state.selectionBox.x2; document.getElementById('selbox-y2').value = state.selectionBox.y2; document.getElementById('selbox-z2').value = state.selectionBox.z2;
if (!sel) { emptyEl.classList.remove('hidden'); bodyEl.classList.add('hidden'); badgeEl.textContent = 'NONE'; return; }
emptyEl.classList.add('hidden'); bodyEl.classList.remove('hidden'); badgeEl.textContent = sel.type.toUpperCase();
document.getElementById('prop-name').value = sel.name; document.getElementById('prop-half').checked = Boolean(sel.half); document.getElementById('pos-x').value = sel.pos.x; document.getElementById('pos-y').value = sel.pos.y; document.getElementById('pos-z').value = sel.pos.z;
document.getElementById('size-x').value = sel.size.x; document.getElementById('size-y').value = sel.size.y; document.getElementById('size-z').value = sel.size.z;
document.getElementById('rot-x').value = sel.rot.x || 0; document.getElementById('rot-y').value = sel.rot.y || 0; document.getElementById('rot-z').value = sel.rot.z || 0;
const b = pxToLuantiBox(sel); document.getElementById('luanti-coords-readout').textContent = Luanti: [${b.x1}, ${b.y1}, ${b.z1}] → [${b.x2}, ${b.y2}, ${b.z2}];
const segGroup = document.getElementById('segments-group'); if (sel.type === 'box') { segGroup.classList.add('hidden'); } else { segGroup.classList.remove('hidden'); const segInput = document.getElementById('prop-segments'); segInput.value = sel.segments || 12; document.getElementById('prop-segments-val').textContent = segInput.value; const est = estimateGeometryStats(sel.type, Number(segInput.value), Boolean(sel.half)); document.getElementById('segment-cost-label').textContent = ${est.triangles} tris / ${est.vertices} verts; }
document.getElementById('prop-color').value = sel.color || '#6ea8fe'; document.getElementById('prop-color-hex').value = sel.color || '#6ea8fe';
const baseMatSelect = document.getElementById('prop-base-material'); populateMaterialSelect(baseMatSelect, sel.materialId || '', 'Use Base Color');
const faceGroup = document.getElementById('face-tiling-group'); const validFaces = getFacesForType(sel.type, Boolean(sel.half)); if (validFaces.length === 0) { faceGroup.classList.add('hidden'); } else { faceGroup.classList.remove('hidden'); if (!validFaces.includes(state.activeFace)) { state.activeFace = validFaces[0]; }
```
const grid = document.getElementById('face-selector-grid');
grid.innerHTML = '';

for (const fk of validFaces) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `face-btn${state.activeFace === fk ? ' active' : ''}`;

  const assignedId = sel.faceMaterials?.[fk] || sel.materialId;
  const assignedMat = assignedId ? getMaterialById(assignedId) : null;

  const thumb = document.createElement('span');
  thumb.className = 'face-thumb';
  if (assignedMat?.dataUrl) {
    thumb.style.backgroundImage = `url(${assignedMat.dataUrl})`;
  } else {
    thumb.style.backgroundColor = assignedMat?.color || sel.color || '#6ea8fe';
  }

  const lbl = document.createElement('span');
  lbl.textContent = FACE_LABELS[fk] || fk;

  btn.appendChild(thumb);
  btn.appendChild(lbl);
  btn.addEventListener('click', () => {
    state.activeFace = fk;
    refreshAll();
  });
  grid.appendChild(btn);
}

document.getElementById('active-face-label').textContent = FACE_LABELS[state.activeFace] || state.activeFace;
const faceSelect = document.getElementById('prop-face-material');
populateMaterialSelect(
  faceSelect,
  sel.faceMaterials?.[state.activeFace] || '',
  'Inherit Base Material'
);

const uvCfg = sel.faceUV?.[state.activeFace] || { rot: 0, rx: 1, ry: 1 };
document.getElementById('prop-face-uv-rot').value = String(uvCfg.rot || 0);
document.getElementById('prop-face-uv-rx').value = uvCfg.rx || 1;
document.getElementById('prop-face-uv-ry').value = uvCfg.ry || 1;
```
} }
function renderStatusBar() { const budget = computeSceneBudget(state.nodes); const modeEl = document.getElementById('status-mode'); const polyEl = document.getElementById('status-polys'); const vertEl = document.getElementById('status-verts');
if (budget.nodeboxCompatible) { modeEl.textContent = 'Nodebox + Mesh Ready (.lua / .obj / .glb / .zip)'; modeEl.className = 'status-pill ok'; } else { modeEl.textContent = 'Mesh Only (.obj / .glb / .zip — rotated or curved shapes)'; modeEl.className = 'status-pill warn'; }
polyEl.textContent = Triangles: ${budget.triangles.toLocaleString()} / ${LUANTI_RECOMMENDED_TRIS.toLocaleString()} rec; polyEl.className = status-pill mono ${budget.overRecommended ? 'warn' : 'ok'};
vertEl.textContent = Vertices: ${budget.vertices.toLocaleString()} / ${LUANTI_MAX_VERTICES.toLocaleString()} max; vertEl.className = status-pill mono ${budget.overHardLimit ? 'crit' : 'ok'}; }
function refreshAll() { viewport.syncScene(state.nodes, state.selectedId, state.materials, state.selectionBox); renderOutliner(); renderMaterialsLibrary(); renderInspector(); renderStatusBar(); }
async function saveText(defaultName, text, filterDesc) { if (window.pywebview?.api?.save_text_file) { const res = await window.pywebview.api.save_text_file(defaultName, text, filterDesc); if (res?.ok) showToast(Saved ${res.path}); return; } const blob = new Blob([text], { type: 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = defaultName; a.click(); showToast(Downloaded ${defaultName}); }
async function saveBinary(defaultName, arrayBuffer, filterDesc) { if (window.pywebview?.api?.save_binary_file) { const bytes = new Uint8Array(arrayBuffer); let binary = ''; for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]); const b64 = btoa(binary); const res = await window.pywebview.api.save_binary_file(defaultName, b64, filterDesc); if (res?.ok) showToast(Saved ${res.path}); return; } const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = defaultName; a.click(); showToast(Downloaded ${defaultName}); }
document.getElementById('btn-add-box').addEventListener('click', () => addPrimitive('box')); document.getElementById('btn-add-cylinder').addEventListener('click', () => addPrimitive('cylinder')); document.getElementById('btn-add-cone').addEventListener('click', () => addPrimitive('cone')); document.getElementById('btn-add-sphere').addEventListener('click', () => addPrimitive('sphere'));
document.getElementById('btn-copy').addEventListener('click', copySelected); document.getElementById('btn-paste').addEventListener('click', pasteClipboard); document.getElementById('btn-duplicate').addEventListener('click', duplicateSelected); document.getElementById('btn-mirror-x').addEventListener('click', () => mirrorSelected('x')); document.getElementById('btn-mirror-y').addEventListener('click', () => mirrorSelected('y')); document.getElementById('btn-mirror-z').addEventListener('click', () => mirrorSelected('z')); document.getElementById('btn-delete').addEventListener('click', deleteSelected);
document.getElementById('btn-undo').addEventListener('click', () => { const prev = history.undo(snapshotState()); if (prev) { restoreSnapshot(prev); selectNode(state.nodes[0]?.id || null); } });
document.getElementById('btn-redo').addEventListener('click', () => { const next = history.redo(snapshotState()); if (next) { restoreSnapshot(next); selectNode(state.nodes[0]?.id || null); } });
document.getElementById('btn-reset-scene').addEventListener('click', () => { history.pushSnapshot(snapshotState()); state.nodes = [createStarterNode()]; state.selectionBox = { x1: 0, y: 0, z: 0, x2: 16, y2: 16, z2: 16 }; selectNode(state.nodes[0].id); showToast('Reset to 1-Node Starter Cube'); });
document.getElementById('snap-select').addEventListener('change', (e) => { state.snapStep = parseFloat(e.target.value); const stepAttr = state.snapStep > 0 ? String(state.snapStep) : '0.05'; for (const id of ['pos-x', 'pos-y', 'pos-z', 'size-x', 'size-y', 'size-z']) { document.getElementById(id).step = stepAttr; } });
document.getElementById('cam-reset').addEventListener('click', () => viewport.resetCamera()); document.getElementById('toggle-bounds').addEventListener('click', (e) => { state.showBounds = !state.showBounds; e.target.classList.toggle('active', state.showBounds); viewport.setBoundsVisible(state.showBounds); }); document.getElementById('toggle-selbox').addEventListener('click', (e) => { state.showSelBox = !state.showSelBox; e.target.classList.toggle('active', state.showSelBox); viewport.setSelectionBoxVisible(state.showSelBox); }); document.getElementById('toggle-wireframe').addEventListener('click', (e) => { state.wireframe = !state.wireframe; e.target.classList.toggle('active', state.wireframe); viewport.setWireframe(state.wireframe); });
document.getElementById('lib-texture-file').addEventListener('change', async (e) => { const files = Array.from(e.target.files || []); if (files.length === 0) return; history.pushSnapshot(snapshotState());
let lastMat = null; for (const file of files) { const dataUrl = await readImageFileAsDataUrl(file); const mat = { id: mat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}, name: file.name.replace(/.[^.]+$/, ''), type: 'texture', dataUrl, fileName: file.name, color: '#ffffff', }; state.materials.push(mat); lastMat = mat; }
if (lastMat) { assignMaterialToActiveTarget(lastMat.id); } else { refreshAll(); }
showToast(Imported ${files.length} texture${files.length > 1 ? 's' : ''} into Material List); e.target.value = ''; });
document.getElementById('btn-add-color-mat').addEventListener('click', () => { const hex = document.getElementById('prop-color').value || '#6ea8fe'; history.pushSnapshot(snapshotState()); const mat = { id: mat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}, name: Color ${hex.toUpperCase()}, type: 'color', dataUrl: null, fileName: null, color: hex, }; state.materials.push(mat); assignMaterialToActiveTarget(mat.id); showToast(Added ${mat.name} to Material List); });
function bindNumericProp(elId, setter) { const el = document.getElementById(elId); el.addEventListener('change', () => { const sel = getSelectedNode(); if (!sel) return; const raw = parseFloat(el.value); if (isNaN(raw)) return; history.pushSnapshot(snapshotState()); setter(sel, raw); clampNodeToWorkspace(sel); refreshAll(); }); }
document.getElementById('prop-name').addEventListener('change', (e) => { const sel = getSelectedNode(); if (!sel) return; history.pushSnapshot(snapshotState()); sel.name = e.target.value.trim() || 'Piece'; refreshAll(); });
document.getElementById('prop-half').addEventListener('change', (e) => { const sel = getSelectedNode(); if (!sel) return; history.pushSnapshot(snapshotState()); sel.half = e.target.checked; refreshAll(); });
bindNumericProp('pos-x', (n, v) => { n.pos.x = snapValue(v, state.snapStep); }); bindNumericProp('pos-y', (n, v) => { n.pos.y = snapValue(v, state.snapStep); }); bindNumericProp('pos-z', (n, v) => { n.pos.z = snapValue(v, state.snapStep); });
bindNumericProp('size-x', (n, v) => { n.size.x = Math.max(0.25, snapValue(v, state.snapStep)); }); bindNumericProp('size-y', (n, v) => { n.size.y = Math.max(0.25, snapValue(v, state.snapStep)); }); bindNumericProp('size-z', (n, v) => { n.size.z = Math.max(0.25, snapValue(v, state.snapStep)); });
bindNumericProp('rot-x', (n, v) => { n.rot.x = v; }); bindNumericProp('rot-y', (n, v) => { n.rot.y = v; }); bindNumericProp('rot-z', (n, v) => { n.rot.z = v; });
document.getElementById('btn-snap-rot').addEventListener('click', () => { const sel = getSelectedNode(); if (!sel) return; history.pushSnapshot(snapshotState()); sel.rot.x = Math.round((sel.rot.x || 0) / 22.5) * 22.5; sel.rot.y = Math.round((sel.rot.y || 0) / 22.5) * 22.5; sel.rot.z = Math.round((sel.rot.z || 0) / 22.5) * 22.5; refreshAll(); });
document.getElementById('prop-segments').addEventListener('input', (e) => { const sel = getSelectedNode(); if (!sel || sel.type === 'box') return; const nextSegs = parseInt(e.target.value, 10); const oldSegs = sel.segments || 12; sel.segments = nextSegs;
if (computeSceneBudget(state.nodes).overHardLimit) { sel.segments = oldSegs; e.target.value = oldSegs; showToast(Blocked: Exceeds Luanti's ${LUANTI_MAX_VERTICES.toLocaleString()} vertex cap.); return; } refreshAll(); });
function applyLiveColorChange(sel, hex) { sel.color = hex; const validFaces = getFacesForType(sel.type, Boolean(sel.half)); if (validFaces.length > 0 && sel.faceMaterials?.[state.activeFace]) { const faceMat = getMaterialById(sel.faceMaterials[state.activeFace]); if (faceMat && !faceMat.dataUrl) { faceMat.color = hex; faceMat.name = Color ${hex.toUpperCase()}; } else { delete sel.faceMaterials[state.activeFace]; } } else if (sel.materialId) { const baseMat = getMaterialById(sel.materialId); if (baseMat && !baseMat.dataUrl) { baseMat.color = hex; baseMat.name = Color ${hex.toUpperCase()}; } else { sel.materialId = null; } } }
document.getElementById('prop-color').addEventListener('input', (e) => { const sel = getSelectedNode(); if (!sel) return; document.getElementById('prop-color-hex').value = e.target.value; applyLiveColorChange(sel, e.target.value); refreshAll(); });
document.getElementById('prop-color-hex').addEventListener('change', (e) => { const sel = getSelectedNode(); if (!sel) return; const hex = e.target.value.trim(); if (/^#[0-9a-fA-F]{6}$/.test(hex)) { history.pushSnapshot(snapshotState()); document.getElementById('prop-color').value = hex; applyLiveColorChange(sel, hex); refreshAll(); } });
document.getElementById('prop-base-material').addEventListener('change', (e) => { const sel = getSelectedNode(); if (!sel) return; history.pushSnapshot(snapshotState()); sel.materialId = e.target.value || null; refreshAll(); });
document.getElementById('prop-face-material').addEventListener('change', (e) => { const sel = getSelectedNode(); if (!sel || getFacesForType(sel.type, Boolean(sel.half)).length === 0) return; history.pushSnapshot(snapshotState()); sel.faceMaterials = sel.faceMaterials || {}; if (e.target.value) { sel.faceMaterials[state.activeFace] = e.target.value; } else { delete sel.faceMaterials[state.activeFace]; } refreshAll(); });
function updateActiveFaceUV() { const sel = getSelectedNode(); if (!sel || getFacesForType(sel.type, Boolean(sel.half)).length === 0) return; history.pushSnapshot(snapshotState()); sel.faceUV = sel.faceUV || {}; sel.faceUV[state.activeFace] = { rot: parseInt(document.getElementById('prop-face-uv-rot').value, 10) || 0, rx: Math.max(0.25, parseFloat(document.getElementById('prop-face-uv-rx').value) || 1), ry: Math.max(0.25, parseFloat(document.getElementById('prop-face-uv-ry').value) || 1), }; refreshAll(); }
document.getElementById('prop-face-uv-rot').addEventListener('change', updateActiveFaceUV); document.getElementById('prop-face-uv-rx').addEventListener('change', updateActiveFaceUV); document.getElementById('prop-face-uv-ry').addEventListener('change', updateActiveFaceUV);
document.getElementById('btn-apply-all-faces').addEventListener('click', () => { const sel = getSelectedNode(); if (!sel || getFacesForType(sel.type, Boolean(sel.half)).length === 0) return; history.pushSnapshot(snapshotState()); const currentMatId = sel.faceMaterials?.[state.activeFace] || sel.materialId || null; const currentUV = sel.faceUV?.[state.activeFace] || { rot: 0, rx: 1, ry: 1 }; sel.materialId = currentMatId; sel.faceMaterials = {}; sel.faceUV = {}; for (const fk of getFacesForType(sel.type, Boolean(sel.half))) { sel.faceUV[fk] = { ...currentUV }; } refreshAll(); showToast('Applied active face material & UV to all sides'); });
document.getElementById('btn-fit-selbox').addEventListener('click', () => { history.pushSnapshot(snapshotState()); state.selectionBox = computeAutoSelectionBox(state.nodes); state.showSelBox = true; document.getElementById('toggle-selbox').classList.add('active'); viewport.setSelectionBoxVisible(true); refreshAll(); showToast('Selection Box auto-fitted to all pieces'); });
for (const key of ['x1', 'y1', 'z1', 'x2', 'y2', 'z2']) { document.getElementById(selbox-${key}).addEventListener('change', (e) => { const val = parseFloat(e.target.value); if (isNaN(val)) return; history.pushSnapshot(snapshotState()); state.selectionBox[key] = val; refreshAll(); }); }
document.getElementById('btn-save').addEventListener('click', () => { const payload = JSON.stringify( { format: '3d-for-luanti', version: 3, nodes: state.nodes, materials: state.materials, selectionBox: state.selectionBox, }, null, 2 ); saveText('model.l3d.json', payload, '3D for Luanti Project (*.l3d.json)'); });
document.getElementById('btn-open').addEventListener('click', async () => { const loadParsed = (parsed, label) => { if (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) { history.pushSnapshot(snapshotState()); state.nodes = parsed.nodes; state.materials = Array.isArray(parsed.materials) ? parsed.materials : []; state.selectionBox = parsed.selectionBox || computeAutoSelectionBox(state.nodes); selectNode(state.nodes[0].id); if (label) showToast(Loaded ${label}); } };
if (window.pywebview?.api?.open_project_file) { const res = await window.pywebview.api.open_project_file(); if (res?.ok && res.content) loadParsed(JSON.parse(res.content), res.path); return; } const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,.l3d.json'; input.onchange = async () => { const f = input.files?.[0]; if (!f) return; loadParsed(JSON.parse(await f.text()), f.name); }; input.click(); });
const expMenuBtn = document.getElementById('btn-export-menu'); const expDropdown = document.getElementById('export-dropdown'); expMenuBtn.addEventListener('click', () => expDropdown.classList.toggle('hidden')); document.addEventListener('click', (e) => { if (!expMenuBtn.contains(e.target) && !expDropdown.contains(e.target)) { expDropdown.classList.add('hidden'); } });
document.getElementById('exp-mod-zip').addEventListener('click', async () => { expDropdown.classList.add('hidden'); const bundle = await buildModBundleFiles(state.nodes, state.materials, state.selectionBox); if (window.pywebview?.api?.save_mod_zip) { const res = await window.pywebview.api.save_mod_zip('custom_models.zip', bundle); if (res?.ok) showToast(Saved complete Luanti mod to ${res.path}); return; } await saveText('init.lua', bundle.initLua, 'Lua Script (.lua)'); const raw = atob(bundle.glbBase64); const bytes = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i); await saveBinary('luanti_model.glb', bytes.buffer, 'glTF Binary (.glb)'); });
document.getElementById('exp-nodebox').addEventListener('click', () => { expDropdown.classList.add('hidden'); const budget = computeSceneBudget(state.nodes); if (!budget.nodeboxCompatible) { showToast('Note: Rotated boxes or curved shapes were flattened to bounding boxes for Nodebox Lua.'); } const lua = exportNodeboxLua(state.nodes, state.materials, 'custom_node', state.selectionBox); saveText('nodebox.lua', lua, 'Lua Script (*.lua)'); });
document.getElementById('exp-obj').addEventListener('click', async () => { expDropdown.classList.add('hidden'); const { obj, mtl, atlasDataUrl } = await exportWavefrontObj(state.nodes, state.materials, 'luanti_model'); await saveText('luanti_model.obj', obj, 'Wavefront OBJ (.obj)'); await saveText('luanti_model.mtl', mtl, 'Wavefront MTL (.mtl)'); const raw = atob(atlasDataUrl.split(',')[1]); const bytes = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i); await saveBinary('luanti_model_uv.png', bytes.buffer, 'UV Atlas PNG (*.png)'); });
document.getElementById('exp-glb').addEventListener('click', async () => { expDropdown.classList.add('hidden'); const { buffer: glbBuffer, atlasDataUrl } = await exportGlbBuffer(state.nodes, state.materials); await saveBinary('luanti_model.glb', glbBuffer, 'glTF Binary (.glb)'); const raw = atob(atlasDataUrl.split(',')[1]); const bytes = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i); await saveBinary('luanti_model_uv.png', bytes.buffer, 'UV Atlas PNG (.png)'); });
window.addEventListener('keydown', (e) => { if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return; const mod = e.ctrlKey || e.metaKey;
if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelected(); } else if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteClipboard(); } else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); } else if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); document.getElementById('btn-undo').click(); } else if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); document.getElementById('btn-redo').click(); } else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); } });
refreshAll();