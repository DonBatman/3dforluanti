import * as THREE from '../vendor/three.module.js';
import { getFacesForType } from './shapes.js';

const baseImageCache = new Map();

function getBaseImage(dataUrl) {
let img = baseImageCache.get(dataUrl);
if (!img) {
img = new Image();
img.src = dataUrl;
baseImageCache.set(dataUrl, img);
}
return img;
}

function createConfiguredTexture(dataUrl, uvCfg = {}) {
const img = getBaseImage(dataUrl);
const tex = new THREE.Texture(img);
tex.magFilter = THREE.NearestFilter;
tex.minFilter = THREE.NearestFilter;
tex.colorSpace = THREE.SRGBColorSpace;
tex.wrapS = THREE.RepeatWrapping;
tex.wrapT = THREE.RepeatWrapping;
tex.center.set(0.5, 0.5);
tex.rotation = THREE.MathUtils.degToRad(uvCfg.rot || 0);
tex.repeat.set(uvCfg.rx || 1, uvCfg.ry || 1);

if (img.complete) {
tex.needsUpdate = true;
} else {
img.addEventListener('load', () => {
tex.needsUpdate = true;
});
}
return tex;
}

function buildSingleMaterial(matDef, fallbackColor, wireframe = false, uvCfg = {}) {
if (matDef && matDef.dataUrl) {
return new THREE.MeshStandardMaterial({
map: createConfiguredTexture(matDef.dataUrl, uvCfg),
color: new THREE.Color('#ffffff'),
roughness: 0.78,
metalness: 0.05,
wireframe,
});
}
const colorHex = (matDef && matDef.color) ? matDef.color : (fallbackColor || '#6ea8fe');
return new THREE.MeshStandardMaterial({
color: new THREE.Color(colorHex),
roughness: 0.78,
metalness: 0.05,
wireframe,
});
}

export function createMaterialsForNode(node, materialsLibrary = [], wireframe = false) {
const matById = new Map(materialsLibrary.map((m) => [m.id, m]));
const baseMat = node.materialId ? matById.get(node.materialId) : null;
const faceMap = node.faceMaterials || {};
const faceUV = node.faceUV || {};

if (node.type === 'cone') {
const sideMat = faceMap['Side'] ? (matById.get(faceMap['Side']) || baseMat) : baseMat;
const botMat = faceMap['-Y'] ? (matById.get(faceMap['-Y']) || baseMat) : baseMat;
return [
buildSingleMaterial(sideMat, node.color, wireframe, faceUV['Side']),
buildSingleMaterial(sideMat, node.color, wireframe, faceUV['Side']),
buildSingleMaterial(botMat, node.color, wireframe, faceUV['-Y']),
];
}

const faces = getFacesForType(node.type, Boolean(node.half));
if (faces.length > 0) {
return faces.map((faceKey) => {
const fMatId = faceMap[faceKey];
const resolvedMat = fMatId ? (matById.get(fMatId) || baseMat) : baseMat;
return buildSingleMaterial(resolvedMat, node.color, wireframe, faceUV[faceKey]);
});
}

return buildSingleMaterial(baseMat, node.color, wireframe);
}

export function disposeNodeMaterial(matOrArray) {
if (Array.isArray(matOrArray)) {
for (const m of matOrArray) {
if (m.map) m.map.dispose();
m.dispose();
}
} else if (matOrArray) {
if (matOrArray.map) matOrArray.map.dispose();
matOrArray.dispose();
}
}

export function readImageFileAsDataUrl(file) {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = () => resolve(reader.result);
reader.onerror = () => reject(reader.error);
reader.readAsDataURL(file);
});
}
