#!/bin/bash
# Package, install and launch Home Frame on a Samsung Tizen TV.
#
#   ./tools/deploy.sh <TV-IP> [--profile NAME] [--clean]
#
#   --profile NAME  Samsung certificate profile to sign with (default: the active profile)
#   --clean         uninstall first (refreshes a cached app icon, but resets saved settings)
#
# Needs the Tizen CLI in ~/tizen-studio (see docs/INSTALL-TIZEN-TOOLS.md), Developer Mode on the TV
# pointing at this computer's IP, and a Samsung certificate profile that includes the TV.
TV=""; PROFILE=""; CLEAN=""
while [ $# -gt 0 ]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2 ;;
    --clean) CLEAN=1; shift ;;
    *) TV="$1"; shift ;;
  esac
done
[ -n "$TV" ] || { echo "usage: deploy.sh <TV-IP> [--profile NAME] [--clean]"; exit 1; }

SDK="${TIZEN_STUDIO:-$HOME/tizen-studio}"
export PATH="$SDK/tools:$SDK/tools/ide/bin:$PATH"
command -v sdb >/dev/null || { echo "sdb not found. Install the Tizen CLI first (docs/INSTALL-TIZEN-TOOLS.md)."; exit 1; }

cd "$(dirname "$0")/.." || exit 1

if [ -z "$PROFILE" ]; then
  PROFILE="$(tizen security-profiles list 2>/dev/null | awk '$2 == "O" {print $1; exit}')"
  [ -n "$PROFILE" ] || { echo "No active certificate profile. Create one in Certificate Manager (docs/INSTALL-TIZEN-TOOLS.md)."; exit 1; }
fi
echo "Using certificate profile: $PROFILE"

sdb connect "$TV" | tail -1
sdb devices | grep -q "$TV" || { echo "Could not connect to $TV."; echo "Check: TV on, Developer Mode on, and its Host PC IP equals this computer's IP ($(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null))."; exit 1; }

./tools/update-media.sh >/dev/null

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
rsync -a --exclude='.git*' --exclude='.DS_Store' --exclude='README.md' --exclude='AGENTS.md' --exclude='CLAUDE.md' --exclude='LICENSE' --exclude='docs' --exclude='tools' ./ "$WORK/app/"
mkdir -p "$WORK/out"

# Match the TV's platform version so older TVs accept the package.
PLATFORM="$(sdb capability 2>/dev/null | awk -F: '/^platform_version/ {print $2}' | tr -d '\r ')"
if [ -n "$PLATFORM" ]; then
  sed -i.bak "s/required_version=\"[0-9.]*\"/required_version=\"$PLATFORM\"/" "$WORK/app/config.xml" && rm -f "$WORK/app/config.xml.bak"
  echo "TV platform version: $PLATFORM"
fi

tizen package -t wgt -s "$PROFILE" -o "$WORK/out" -- "$WORK/app" || exit 1
cp "$WORK/out/"*.wgt "$WORK/hf.wgt"

[ -n "$CLEAN" ] && sdb shell 0 vd_appuninstall HomeFrame1.HomeFrame
sdb push "$WORK/hf.wgt" /home/owner/share/tmp/sdk_tools/hf.wgt || exit 1
# `tizen install` often fails on consumer TVs without a reason; Samsung's own installer works.
sdb shell 0 vd_appinstall HomeFrame1 /home/owner/share/tmp/sdk_tools/hf.wgt | tail -2
sdb shell 0 was_execute HomeFrame1.HomeFrame
