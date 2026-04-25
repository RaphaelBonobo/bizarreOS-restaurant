#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
DESKTOP="$ROOT/desktop"

echo "=== 1/6 Génération de l'icône ==="
python3 "$ROOT/scripts/gen-icon.py"

echo "=== 2/6 Installation des dépendances backend ==="
cd "$BACKEND"
npm install

echo "=== 3/6 Build du backend (esbuild bundle) ==="
npm run build

echo "=== 4/6 Build du frontend ==="
cd "$FRONTEND"
npm install
VITE_API_URL=http://localhost:3000/api npm run build

echo "=== 5/6 Installation des dépendances desktop ==="
cd "$DESKTOP"
npm install

echo "=== 6/6 Packaging ==="

# Linux AppImage
echo "  -> Linux AppImage..."
npm run package:linux

# Windows: electron-builder creates win-unpacked even without wine,
# then we zip manually (wine is needed for icon embedding but not for the dir itself)
echo "  -> Windows portable..."
npm run package:windows 2>&1 || true
if [ -d "$DESKTOP/dist/win-unpacked" ]; then
  export DESKTOP_DIR="$DESKTOP"
  python3 - <<'PYEOF'
import zipfile, os, sys

desktop = os.environ.get('DESKTOP_DIR', '')
src = os.path.join(desktop, 'dist', 'win-unpacked')
out = os.path.join(desktop, 'dist', 'bizarre-restaurant-windows-x64.zip')

print(f'Zipping {src} -> {out}')
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    for root, dirs, files in os.walk(src):
        for file in files:
            filepath = os.path.join(root, file)
            arcname = filepath[len(src)+1:]  # strip src prefix
            zf.write(filepath, arcname)

size = os.path.getsize(out)
print(f'Créé: {out} ({size // 1024 // 1024} MB)')
PYEOF
fi

echo ""
echo "=== Packages créés ==="
ls -lh "$DESKTOP/dist/"*.AppImage "$DESKTOP/dist/"*.zip 2>/dev/null || ls "$DESKTOP/dist/"
