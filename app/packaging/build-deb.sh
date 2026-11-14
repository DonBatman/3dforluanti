#!/usr/bin/env bash set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG_NAME="3d-for-luanti"
VERSION="1.0.0"
ARCH="all"
BUILD_DIR="$ROOT_DIR/build/${PKG_NAME}_${VERSION}_${ARCH}"
echo "==> Cleaning previous build..." rm -rf "$ROOT_DIR/build"
mkdir -p "$BUILD_DIR/DEBIAN" mkdir -p "$BUILD_DIR/usr/bin"
mkdir -p "$BUILD_DIR/usr/share/$PKG_NAME"
mkdir -p "$BUILD_DIR/usr/share/applications" mkdir -p "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps"
echo "==> Checking offline Three.js vendor files..." VENDOR_DIR="$ROOT_DIR/app/web/vendor"
ADDONS_DIR="$VENDOR_DIR/addons" mkdir -p "$ADDONS_DIR/controls" "$ADDONS_DIR/exporters"
if [ ! -f "$VENDOR_DIR/three.module.js" ]; then
echo "Downloading Three.js r170 runtime for offline .deb bundling..."
curl -fsSL "https://unpkg.com/three@0.170.0/build/three.module.js" -o "$VENDOR_DIR/three.module.js" curl -fsSL "https://unpkg.com/three@0.170.0/examples/jsm/controls/OrbitControls.js" -o "$ADDONS_DIR/controls/OrbitControls.js"
curl -fsSL "https://unpkg.com/three@0.170.0/examples/jsm/exporters/GLTFExporter.js" -o "$ADDONS_DIR/exporters/GLTFExporter.js" fi
echo "==> Copying application files..." cp -r "$ROOT_DIR/app/"* "$BUILD_DIR/usr/share/$PKG_NAME/"
cat << 'EOF' > "$BUILD_DIR/usr/bin/3d-for-luanti"
#!/usr/bin/env bash
exec python3 /usr/share/3d-for-luanti/main.py "$@" EOF chmod 0755 "$BUILD_DIR/usr/bin/3d-for-luanti"
echo "==> Copying desktop launcher, icon, and Debian metadata..." cp "$ROOT_DIR/packaging/3d-for-luanti.desktop" "$BUILD_DIR/usr/share/applications/" cp "$ROOT_DIR/packaging/3d-for-luanti.svg" "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps/" cp "$ROOT_DIR/packaging/control" "$BUILD_DIR/DEBIAN/control" chmod 0644 "$BUILD_DIR/DEBIAN/control"
echo "==> Building .deb package..." dpkg-deb --build --root-owner-group "$BUILD_DIR"
DEB_OUT="$ROOT_DIR/build/${PKG_NAME}_${VERSION}_${ARCH}.deb" echo "==> Done! Package created at: $DEB_OUT"
echo "    Install with: sudo apt install \"$DEB_OUT""