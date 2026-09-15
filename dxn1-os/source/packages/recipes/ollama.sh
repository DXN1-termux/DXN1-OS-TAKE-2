#!/bin/sh
# DXN1-OS package build recipe: ollama 0.3.14
# Run LLMs locally (Llama 3, Mistral, CodeLlama, etc.) — AI-native dev tool
# https://ollama.com
set -e

PKG="ollama"
VER="0.3.14"
SRC_URL="https://github.com/ollama/ollama/releases/download/v${VER}/ollama-linux-amd64.tgz"

echo "[recipe] building ${PKG}-${VER} (AI-native dev tool)..."

CACHE="/var/cache/dxn1-pkg"
mkdir -p "$CACHE"
if [ ! -f "$CACHE/ollama-${VER}.tgz" ]; then
    wget -q "$SRC_URL" -O "$CACHE/ollama-${VER}.tgz"
fi

cd /tmp
tar xf "$CACHE/ollama-${VER}.tgz"

mkdir -p "$DESTDIR/usr/bin"
cp -a ollama "$DESTDIR/usr/bin/ollama"
chmod +x "$DESTDIR/usr/bin/ollama"

# systemd-free service script for DXN1-OS (OpenRC-style)
mkdir -p "$DESTDIR/etc/init.d"
cat > "$DESTDIR/etc/init.d/ollama" <<'EOF'
#!/bin/sh
# Ollama LLM service for DXN1-OS
case "$1" in
    start)
        echo "[ollama] starting LLM server on :11434..."
        ollama serve &
        ;;
    stop)   killall ollama 2>/dev/null ;;
    status) pgrep -x ollama > /dev/null && echo "running (port 11434)" || echo "stopped" ;;
    restart) $0 stop; sleep 1; $0 start ;;
esac
EOF
chmod +x "$DESTDIR/etc/init.d/ollama"

# pre-pull popular dev models (manifest only — actual pull happens on first use)
mkdir -p "$DESTDIR/usr/share/dxn1/models"
cat > "$DESTDIR/usr/share/dxn1/models/recommended.txt" <<EOF
# AI-native dev models recommended for DXN1-OS
# pull with: ollama pull <name>
qwen2.5-coder:7b      # code completion / generation
llama3.2:3b           # fast general chat
nomic-embed-text      # codebase embeddings (for RAG)
deepseek-coder-v2     # advanced code reasoning
EOF

# desktop entry
mkdir -p "$DESTDIR/usr/share/applications"
cat > "$DESTDIR/usr/share/applications/ollama.desktop" <<'DESK'
[Desktop Entry]
Type=Application
Name=Ollama
Comment=Run LLMs locally
Exec=ollama serve
Icon=ollama
Terminal=true
Categories=Development;AI;
DESK

cat > "$DESTDIR/MANIFEST" <<EOF
/usr/bin/ollama
/etc/init.d/ollama
/usr/share/dxn1/models/recommended.txt
/usr/share/applications/ollama.desktop
EOF

echo "[recipe] ${PKG}-${VER} built (AI LLM runtime)"
echo "    start service: /etc/init.d/ollama start"
echo "    run a model:    ollama run qwen2.5-coder:7b"
