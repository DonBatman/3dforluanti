3D for Luanti
A lightweight, purpose-built 3D modeling studio for Luanti (formerly Minetest), engineered around Luanti's 16 × 16 × 16 px node grid (1 node = 1.0 × 1.0 × 1.0 meters) and IrrlichtMt's 65,535-vertex mesh buffer ceiling.
Key Features
Starts Ready with a 1-Node Cube: Launches immediately with a 16 × 16 × 16 px ([-0.5, -0.5, -0.5] to [0.5, 0.5, 0.5]) cube placed in the center of a 3 × 2 × 3 node workspace (48 × 32 × 48 px—allowing 1 node higher and 1 node to every horizontal side, with zero space below).
Primitives & Rotation: Supports Boxes (with full X / Y / Z rotation and 22.5° angle snapping) plus Cylinders, Cones, and UV Spheres with adjustable radial/ring segment counts (6–32).
Pixel Grid Snapping & Copy/Paste: Snap to 1 px (1/16), 0.5 px (1/32), 0.25 px, or Free placement, with Ctrl+C, Ctrl+V, Ctrl+D, Ctrl+Z, and Ctrl+Y.
Luanti Engine Guardrails: Blocks adding primitives or raising segment counts if total vertices would exceed Luanti's hard 65,535 vertex limit, and warns above 2,000 triangles for world nodes.
Direct Luanti Exports: Exports Luanti Nodebox Lua (.lua), Wavefront Mesh (.obj + .mtl), glTF Binary (.glb), and native project files (.l3d.json).
Building & Installing the Linux .deb Package (Ubuntu / Debian)
Install the runtime dependencies:
```bash
sudo apt update
sudo apt install -y python3 python3-webview python3-gi gir1.2-webkit2-4.1 curl dpkg-dev
```
Run the automated .deb builder from the project root:
```bash
chmod +x packaging/build-deb.sh
./packaging/build-deb.sh
```
Install the generated package:
```bash
sudo apt install ./build/3d-for-luanti_1.0.0_all.deb
```
Launch 3D for Luanti from your GNOME Applications menu or run 3d-for-luanti in a terminal.
Web App Deployment (Phase 2)
The entire app/web/ directory is pure ES-module JavaScript + WebGL with zero server-side dependencies—copy app/web/ onto any static web host to run 3D for Luanti directly in a browser.