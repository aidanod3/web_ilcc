#!/bin/bash
# Build cuh63.zip — one course package for every platform — from the four
# per-OS zips + executables.zip.
#
# Research (2026-08): the four cuh63*.zip files are byte-identical in all 725
# sample files; only the top-level `ilcc` (22–41 MB, platform-specific) and
# `lcc`/`lcc.exe` differ. Every zip already ships per-platform lcc under
# lnx/ mac/ macm/ rasp/ win/. The Windows zip has a stray Mac `lcc` at top
# level (upstream bug) — we don't copy it.
#
#   scripts/build-unified-cuh63.sh [srcdir=/home/infra] [out=/home/infra/cuh63.zip]
set -euo pipefail
SRC="${1:-/home/infra}"
OUT="${2:-/home/infra/cuh63.zip}"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"

echo "==> samples (from Linux zip, minus binaries)"
unzip -q "$SRC/cuh63Linux.zip" -d src
mkdir -p cuh63/bin/{linux-x64,macos-x64,macos-arm64,win-x64}
rsync -a --exclude 'lcc' --exclude 'ilcc' --exclude 'lcc.exe' --exclude '__MACOSX' src/cuh63Linux/ cuh63/

echo "==> per-platform binaries"
unzip -p "$SRC/cuh63Linux.zip"    cuh63Linux/lcc       > cuh63/bin/linux-x64/lcc
unzip -p "$SRC/cuh63Linux.zip"    cuh63Linux/ilcc      > cuh63/bin/linux-x64/ilcc
unzip -p "$SRC/cuh63MacIntel.zip" cuh63MacIntel/lcc    > cuh63/bin/macos-x64/lcc
unzip -p "$SRC/cuh63MacIntel.zip" cuh63MacIntel/ilcc   > cuh63/bin/macos-x64/ilcc
unzip -p "$SRC/cuh63MacArm.zip"   cuh63MacArm/lcc      > cuh63/bin/macos-arm64/lcc
unzip -p "$SRC/cuh63MacArm.zip"   cuh63MacArm/ilcc     > cuh63/bin/macos-arm64/ilcc
unzip -p "$SRC/cuh63Windows.zip"  cuh63Windows/lcc.exe > cuh63/bin/win-x64/lcc.exe
unzip -p "$SRC/cuh63Windows.zip"  cuh63Windows/ilcc.exe> cuh63/bin/win-x64/ilcc.exe
chmod +x cuh63/bin/*/lcc cuh63/bin/*/ilcc 2>/dev/null || true

echo "==> dispatchers"
for tool in lcc ilcc; do
cat > "cuh63/$tool" <<EOF
#!/bin/sh
# $tool — picks the right binary for this machine. Run from the cuh63 folder.
here="\$(cd "\$(dirname "\$0")" && pwd)"
case "\$(uname -s)-\$(uname -m)" in
  Linux-x86_64)   bin="\$here/bin/linux-x64/$tool" ;;
  Darwin-x86_64)  bin="\$here/bin/macos-x64/$tool" ;;
  Darwin-arm64)   bin="\$here/bin/macos-arm64/$tool" ;;
  *) echo "Unsupported platform: \$(uname -s) \$(uname -m). Use ILCC in the browser: https://hydra.newpaltz.edu/ilcc" >&2; exit 1 ;;
esac
[ -x "\$bin" ] || chmod +x "\$bin" 2>/dev/null
# macOS: clear the quarantine flag Safari/Chrome add to downloads (Gatekeeper)
command -v xattr >/dev/null 2>&1 && xattr -d com.apple.quarantine "\$bin" 2>/dev/null
exec "\$bin" "\$@"
EOF
chmod +x "cuh63/$tool"
printf '@echo off\r\n"%%~dp0bin\\win-x64\\%s.exe" %%*\r\n' "$tool" > "cuh63/$tool.cmd"
done

cat > cuh63/README-FIRST.txt <<'EOF'
cuh63 — course software package (all platforms)

  macOS / Linux:   ./lcc a1test.a        ./ilcc a1test.a -n
  Windows:         .\lcc a1test.a        .\ilcc a1test.a -n

The lcc / ilcc launchers pick the right binary from bin/ for your machine.
If your OS says "permission denied":  chmod +x lcc ilcc
If macOS says the app can't be verified: the launcher clears that; otherwise
System Settings → Privacy & Security → Open Anyway.

Full setup guide + FAQ: https://hydra.newpaltz.edu/ilcc/setup
Run LCC in your browser (no install): https://hydra.newpaltz.edu/ilcc
EOF

echo "==> checksums + zip"
(cd cuh63 && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
rm -f "$OUT"
zip -qr -X "$OUT" cuh63
echo "==> $OUT  ($(du -h "$OUT" | cut -f1))"
unzip -l "$OUT" | tail -1
