3D for Luanti — Architecture & Design Blueprint
Project Overview
App Name: 3D for Luanti
Package ID: 3d-for-luanti
Target Platforms:
Phase 1 (Primary): Lightweight Linux .deb desktop app (Python 3 + WebKitGTK / pywebview wrapper around a modular HTML5/WebGL Three.js engine).
Phase 2: Standalone browser/website embed (same web/ asset bundle hosted directly on the web).
Phase 3 (Future): Windows .exe installer (same web/ bundle via pywebview / Edge WebView2) and optional Electron wrapper if requested.
Notebook Policy: Every file—no matter how small or insignificant (.py, .js, .html, .css, .desktop, control, postinst, build-deb.sh, README.md, etc.)—is archived and kept synced in the 3D for Luanti notebook.
--------------------------------------------------------------------------------
1. Spatial Grid & Coordinate System
Luanti Native Unit: 1 node = 1.0 × 1.0 × 1.0 meters (-0.5 to +0.5 on X, Y, Z), subdivided into a 16 × 16 × 16 pixel grid (1 px = 0.0625 units).
Working Volume (3 × 2 × 3 nodes = 48 × 32 × 48 px):
Origin Node: Starts pre-populated with a standard 16 × 16 × 16 px (1 × 1 × 1 node) base cube at (-0.5, -0.5, -0.5) to (+0.5, +0.5, +0.5).
Horizontal Bounds: Extends 1 node (16 px) outward on all 4 horizontal sides (X and Z from -1.5 to +1.5, or -16 px to +32 px relative to origin).
Vertical Bounds: Extends 1 node (16 px) higher (Y from -0.5 to +1.5, or 0 px to 32 px), with no space below (Y = -0.5 floor plane).
Pixel Snap Modes: 1 px (0.0625), 0.5 px (0.03125), and 0.25 px (0.015625), plus Free mode.
--------------------------------------------------------------------------------
2. Primitives, Editing & Copy/Paste
Startup State: Opens immediately with a default 16 × 16 × 16 px cube selected so you can immediately resize, carve, duplicate, or build on top of it.
Supported Shapes:
Box / Cuboid: Supports position, size (1 px minimum), and X / Y / Z rotation (free or 15° / 22.5° / 45° snap).
Cylinder, Cone & UV Sphere: Configurable radial/ring segments (6 to 32, defaulting to low-poly 8 or 12) with live vertex/triangle cost preview.
Copy, Paste & Duplicate (Ctrl+C, Ctrl+V, Ctrl+D):
Full clipboard support for single or multi-selected shapes/nodes, preserving dimensions, rotation, color, and texture/UV settings.
Paste automatically offsets by +1 px (or +16 px when duplicating a full node) clamped inside the 48 × 32 × 48 px workspace bounds.
Undo / Redo (Ctrl+Z, Ctrl+Y): Full command history stack.
--------------------------------------------------------------------------------
3. Luanti Poly & Vertex Budget Guardrails
Hard IrrlichtMt Engine Cap (65,535 vertices): Luanti's 16-bit (u16) index buffer limit per mesh buffer. Adding shapes or increasing sphere/cylinder segments is blocked if total vertices would exceed 65,535.
Node Performance Warning (2,000 triangles): Live counter turns amber above 2,000 triangles to flag heavy models for repeatable world nodes.
--------------------------------------------------------------------------------
4. Texturing & Export Formats
Color & Texture Mapping: Solid hex color picker + 16×16 / 32×32 PNG texture loader (per-object or per-face for boxes) with pixel-accurate UV scaling.
Supported Exports:
Luanti Nodebox Lua (.lua): Exports node_box = { type = "fixed", fixed = { ... } } (available whenever all shapes are unrotated boxes; alerts user if rotated boxes or curved primitives require mesh export).
Wavefront OBJ + MTL (.obj + .mtl): Scaled to Luanti units with proper Y-up orientation and UV coordinates.
glTF Binary (.glb): Self-contained binary glTF 2.0 with embedded materials/textures for Luanti 5.10+.
Project Save File (.l3d.json): Native JSON project format storing scene graph, snap settings, and embedded PNG data URLs.
--------------------------------------------------------------------------------
5. Planned File Layout (Phase 1: Linux .deb)
```text
3d-for-luanti/
├── app/
│   ├── main.py                  # Python 3 + WebKitGTK / pywebview desktop host + native file save bridge
│   └── web/
│       ├── index.html           # Studio layout (toolbar, 3D viewport, outliner, inspector, status bar)
│       ├── styles.css           # Dark GNOME/Adwaita-inspired UI theme
│       ├── vendor/
│       │   └── three.module.js  # Bundled Three.js (offline-ready for .deb & web)
│       └── src/
│           ├── main.js          # App bootstrap, keyboard shortcuts (Ctrl+C/V/D/Z), state sync
│           ├── viewport.js      # Three.js scene, 3x2x3 node grid, orbit/pan/zoom, gizmos
│           ├── shapes.js        # Box, Cylinder, Cone, Sphere factories & vertex budget calculator
│           ├── clipboard.js     # Copy, paste, duplicate, and undo/redo history manager
│           ├── textures.js      # Color swatches, PNG texture uploader, pixel-accurate UV mapper
│           └── exporters.js     # Luanti Nodebox .lua, Wavefront .obj/.mtl, and binary .glb writers
├── packaging/
│   ├── 3d-for-luanti.desktop    # GNOME desktop launcher entry
│   ├── 3d-for-luanti.svg        # Application icon
│   ├── control                  # Debian package metadata (Depends: python3, python3-webview / gir1.2-webkit2-4.1)
│   └── build-deb.sh             # Automated script to build 3d-for-luanti_1.0.0_amd64.deb
└── README.md                    # Build, install, and usage guide
```