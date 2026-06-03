#!/usr/bin/env bash

set -euo pipefail # realpath or dirname failure should abort

PROJECT_DIR="$(realpath "$1")" # Read-only project source
shift
WORK_DIR="$(realpath "$1")"    # Task-specific temporary directory
shift



GIT_PATH=$(dirname $(realpath $(which git)))
DIRNAME_PATH=$(dirname $(realpath $(which dirname)))



cd $PROJECT_DIR
LEAN_ROOT="$(lean --print-prefix)"


SH=$(realpath $(which sh))
SCRIPT=$(cat <<EOF
ulimit -t 60       # 60 seconds
ulimit -u 65536    # 65536 subprocesses spawnable (lake can use a lot here!)
ulimit -f 524288   # File output size limits
exec /lean/bin/lake exe challenge-thms
EOF
)

# We want $PROJECT_DIR to be on top in the overlay so that there's no risk of
# the challenge modifying what `lake exe challenge-thms` does, but if the
# challenge has a Challenge.olean, this means we won't see the user's
# Challenge.olean. Detect this condition and abort.
if [[ -e "$PROJECT_DIR/.lake/build/lib/lean/Challenge.olean" ]]; then
     echo "error: $PROJECT_DIR contains a Challenge.olean" >&2
     echo "This prevents theorems from being collected" >&2
     exit 1
fi
mkdir -p $WORK_DIR/ChallengeThms
mkdir -p $WORK_DIR/ChallengeThms-staging


exec bwrap \
     --ro-bind /nix /nix \
     --ro-bind "$LEAN_ROOT" /lean \
     \
     \
     --dev /dev \
     --tmpfs /tmp \
     --proc /proc \
     \
     --clearenv \
     --setenv HOME "/tmp" \
     --setenv LEAN_NUM_THREADS "4" \
     --setenv PATH "$GIT_PATH:$DIRNAME_PATH" \
     \
     --ro-bind "$PROJECT_DIR" /project \
     --ro-bind "$WORK_DIR/Challenge/Challenge.lean" /project/Challenge.lean \
     --overlay-src "$WORK_DIR/Challenge/.lake/build" \
     --overlay-src "$PROJECT_DIR/.lake/build" \
     --overlay "$WORK_DIR/ChallengeThms" "$WORK_DIR/ChallengeThms-staging" /project/.lake/build \
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
