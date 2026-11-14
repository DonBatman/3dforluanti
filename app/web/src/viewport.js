import * as THREE from '../vendor/three.module.js'; import { OrbitControls } from '../vendor/addons/controls/OrbitControls.js'; import { UNIT_PER_PX, buildGeometryForNode } from './shapes.js'; import { createMaterialsForNode, disposeNodeMaterial } from './textures.js';
export class StudioViewport { constructor(canvas, onSelectNode) { this.canvas = canvas; this.onSelectNode = onSelectNode; this.meshMap = new Map(); this.selectedId = null; this.wireframe = false; this.selBoxMesh = null; this.showSelBox = false;
```
this.scene = new THREE.Scene();
this.scene.background = new THREE.Color('#141418');

this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 50);
this.resetCamera();

this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

this.controls = new OrbitControls(this.camera, canvas);
this.controls.enableDamping = true;
this.controls.dampingFactor = 0.08;
this.controls.target.set(0, 0.15, 0);

this._setupLights();
this._setupGuides();
this._setupPicking();

this._onResize = () => this.resize();
window.addEventListener('resize', this._onResize);
this.resize();
this._animate();
```
}
_setupLights() { const ambient = new THREE.AmbientLight(0xffffff, 0.72); this.scene.add(ambient);
```
const dir1 = new THREE.DirectionalLight(0xffffff, 0.85);
dir1.position.set(3, 5, 4);
this.scene.add(dir1);

const dir2 = new THREE.DirectionalLight(0x9ec5fe, 0.35);
dir2.position.set(-3, 2, -4);
this.scene.add(dir2);
```
}
_setupGuides() { this.guideGroup = new THREE.Group();
```
const pixelGrid = new THREE.GridHelper(3.0, 48, 0x3b4252, 0x242832);
pixelGrid.position.set(0, -0.5, 0);
this.guideGroup.add(pixelGrid);

const nodeGrid = new THREE.GridHelper(3.0, 3, 0x5c7cfa, 0x434c5e);
nodeGrid.position.set(0, -0.499, 0);
this.guideGroup.add(nodeGrid);

const originBox = new THREE.BoxGeometry(1, 1, 1);
const originEdges = new THREE.EdgesGeometry(originBox);
const originLines = new THREE.LineSegments(
  originEdges,
  new THREE.LineBasicMaterial({ color: 0x57e389, transparent: true, opacity: 0.75 })
);
originLines.position.set(0, 0, 0);
this.guideGroup.add(originLines);

const outerBox = new THREE.BoxGeometry(3, 2, 3);
const outerEdges = new THREE.EdgesGeometry(outerBox);
const outerLines = new THREE.LineSegments(
  outerEdges,
  new THREE.LineBasicMaterial({ color: 0x4c566a, transparent: true, opacity: 0.45 })
);
outerLines.position.set(0, 0.5, 0);
this.guideGroup.add(outerLines);

const axes = new THREE.AxesHelper(0.45);
axes.position.set(-0.5, -0.498, -0.5);
this.guideGroup.add(axes);

this.scene.add(this.guideGroup);
```
}
_setupPicking() { this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2(); let downPos = { x: 0, y: 0 };
```
this.canvas.addEventListener('pointerdown', (e) => {
  downPos = { x: e.clientX, y: e.clientY };
});

this.canvas.addEventListener('pointerup', (e) => {
  const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
  if (dist > 5 || e.button !== 0) return;

  const rect = this.canvas.getBoundingClientRect();
  this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  this.raycaster.setFromCamera(this.pointer, this.camera);
  const meshes = Array.from(this.meshMap.values());
  const hits = this.raycaster.intersectObjects(meshes, false);
  if (hits.length > 0) {
    const hitId = hits[0].object.userData.nodeId;
    this.onSelectNode(hitId);
  } else {
    this.onSelectNode(null);
  }
});
```
}
resetCamera() { this.camera.position.set(1.85, 1.55, 2.15); if (this.controls) { this.controls.target.set(0, 0.15, 0); this.controls.update(); } }
setBoundsVisible(visible) { this.guideGroup.visible = visible; }
setSelectionBoxVisible(visible) { this.showSelBox = visible; if (this.selBoxMesh) this.selBoxMesh.visible = visible; }
syncSelectionBox(sb) { if (this.selBoxMesh) { this.scene.remove(this.selBoxMesh); this.selBoxMesh.geometry.dispose(); this.selBoxMesh.material.dispose(); this.selBoxMesh = null; } if (!sb) return; const sx = Math.max(0.01, (sb.x2 - sb.x1) * UNIT_PER_PX); const sy = Math.max(0.01, (sb.y2 - sb.y1) * UNIT_PER_PX); const sz = Math.max(0.01, (sb.z2 - sb.z1) * UNIT_PER_PX); const geom = new THREE.BoxGeometry(sx, sy, sz); const edges = new THREE.EdgesGeometry(geom); geom.dispose(); this.selBoxMesh = new THREE.LineSegments( edges, new THREE.LineBasicMaterial({ color: 0x3bc9db }) ); this.selBoxMesh.position.set( ((sb.x1 + sb.x2) * 0.5) * UNIT_PER_PX - 0.5, ((sb.y1 + sb.y2) * 0.5) * UNIT_PER_PX - 0.5, ((sb.z1 + sb.z2) * 0.5) * UNIT_PER_PX - 0.5 ); this.selBoxMesh.visible = this.showSelBox; this.scene.add(this.selBoxMesh); }
setWireframe(enabled) { this.wireframe = enabled; for (const mesh of this.meshMap.values()) { if (Array.isArray(mesh.material)) { for (const m of mesh.material) m.wireframe = enabled; } else { mesh.material.wireframe = enabled; } } }
syncScene(nodes, selectedId, materials = [], selectionBox = null) { this.selectedId = selectedId; const validIds = new Set(nodes.map((n) => n.id));
```
for (const [id, mesh] of this.meshMap.entries()) {
  if (!validIds.has(id)) {
    this.scene.remove(mesh);
    mesh.geometry.dispose();
    disposeNodeMaterial(mesh.material);
    this.meshMap.delete(id);
  }
}

for (const node of nodes) {
  let mesh = this.meshMap.get(node.id);
  if (mesh) {
    this.scene.remove(mesh);
    mesh.geometry.dispose();
    disposeNodeMaterial(mesh.material);
  }

  const geom = buildGeometryForNode(node);
  const mat = createMaterialsForNode(node, materials, this.wireframe);
  mesh = new THREE.Mesh(geom, mat);
  mesh.userData.nodeId = node.id;

  const cx = (node.pos.x + node.size.x * 0.5) * UNIT_PER_PX - 0.5;
  const cy = (node.pos.y + node.size.y * 0.5) * UNIT_PER_PX - 0.5;
  const cz = (node.pos.z + node.size.z * 0.5) * UNIT_PER_PX - 0.5;
  mesh.position.set(cx, cy, cz);

  mesh.rotation.set(
    THREE.MathUtils.degToRad(node.rot.x || 0),
    THREE.MathUtils.degToRad(node.rot.y || 0),
    THREE.MathUtils.degToRad(node.rot.z || 0),
    'YXZ'
  );

  if (node.id === selectedId) {
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(geom),
      new THREE.LineBasicMaterial({ color: 0xffd43b })
    );
    mesh.add(outline);
  }

  this.scene.add(mesh);
  this.meshMap.set(node.id, mesh);
}

this.syncSelectionBox(selectionBox);
```
}
resize() { const parent = this.canvas.parentElement; if (!parent) return; const w = parent.clientWidth || 800; const h = parent.clientHeight || 600; this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h, false); }
_animate() { requestAnimationFrame(() => this._animate()); this.controls.update(); this.renderer.render(this.scene, this.camera); } }