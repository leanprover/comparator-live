#!/usr/bin/env bash

set -euo pipefail # realpath or dirname failure should abort

PROJECT_DIR="$(realpath "$1")" # Read-only project source
shift
WORK_DIR="$(realpath "$1")"    # Task-specific temporary directory
shift
LANDRUN_ROOT="$(realpath "$1")"  # Where's Landrun?
shift

GIT_PATH=$(dirname $(realpath $(which git)))
DIRNAME_PATH=$(dirname $(realpath $(which dirname)))
WHICH_PATH=$(dirname $(realpath $(which which)))


cd $PROJECT_DIR
LEAN_ROOT="$(lean --print-prefix)"


SH=$(realpath $(which sh))
SCRIPT=$(cat <<EOF
ulimit -t 60       # 60 seconds
ulimit -u 65536    # 65536 subprocesses spawnable (lake can use a lot here!)
ulimit -f 524288   # File output size limits
exec /lean/bin/lake env comparator/.lake/build/bin/comparator config.json
EOF
)

mkdir -p "$WORK_DIR/Comparator"
mkdir -p "$WORK_DIR/Comparator-staging"


exec bwrap \
     --ro-bind /nix /nix \
     --ro-bind "$LEAN_ROOT" /lean \
     --ro-bind "$LANDRUN_ROOT" /landrun \
     \
     --dev /dev \
     --tmpfs /tmp \
     --proc /proc \
     \
     --clearenv \
     --setenv HOME "/tmp" \
     --setenv LEAN_NUM_THREADS "4" \
     --setenv PATH "/lean/bin:$GIT_PATH:$DIRNAME_PATH:$WHICH_PATH" \
     --setenv COMPARATOR_LEAN4EXPORT "/project/lean4export/.lake/build/bin/lean4export" \
     --setenv COMPARATOR_LANDRUN "/landrun/landrun" \
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
