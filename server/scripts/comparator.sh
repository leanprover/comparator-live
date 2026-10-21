#!/usr/bin/env bash

set -euo pipefail # realpath or dirname failure should abort

PROJECT_DIR="$(realpath "$1")" # Read-only project source
shift
WORK_DIR="$(realpath "$1")"    # Task-specific temporary directory
shift



GIT_PATH=$(dirname $(realpath $(which git)))
DIRNAME_PATH=$(dirname $(realpath $(which dirname)))
WHICH_PATH=$(dirname $(realpath $(which which)))
BWRAP_PATH=$(dirname $(realpath $(which bwrap)))

cd $PROJECT_DIR
LEAN_ROOT="$(lean --print-prefix)"


SH=$(realpath $(which sh))
SCRIPT=$(cat <<EOF
ulimit -t 60       # 60 seconds
ulimit -u 65536    # 65536 subprocesses spawnable (lake can use a lot here!)
ulimit -f 524288   # File output size limits
exec /lean/bin/lake comparator --paranoid --config=config.json
EOF
)











mkdir -p "$WORK_DIR/Comparator"
mkdir -p "$WORK_DIR/Comparator-staging"

exec bwrap \
     --ro-bind /nix /nix \
     --ro-bind "$LEAN_ROOT" /lean \
     \
     --dev /dev \
     --tmpfs /tmp \
     --proc /proc \
     --dir /home --dir /root --dir /run/user --dir /var \
     \
     --clearenv \
     --setenv HOME "/tmp" \
     --setenv LEAN_NUM_THREADS "4" \
     --setenv PATH "$GIT_PATH:$DIRNAME_PATH:/lean/bin:$WHICH_PATH:$BWRAP_PATH" \
     \
     --ro-bind "$PROJECT_DIR" /project \
     --ro-bind "$WORK_DIR/Challenge/config.json" /project/config.json \
     --ro-bind "$WORK_DIR/Challenge/Challenge.lean" /project/Challenge.lean \
     --ro-bind "$WORK_DIR/Solution/Solution.lean" /project/Solution.lean \
     --overlay-src "$PROJECT_DIR/.lake/build" \
     --overlay-src "$WORK_DIR/Solution/.lake/build" \
     --overlay-src "$WORK_DIR/Challenge/.lake/build" \
     --overlay "$WORK_DIR/Comparator" "$WORK_DIR/Comparator-staging" /project/.lake/build \
     \
     --unshare-all \
     --new-session \
     --die-with-parent \
     --hostname sandbox \
     --uid 65534 \
     --gid 65534 \
     --cap-drop ALL \
     --chdir /project \
     \
     "$SH" -c "$SCRIPT"
