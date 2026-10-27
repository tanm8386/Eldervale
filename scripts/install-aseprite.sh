#!/usr/bin/env bash
set -euo pipefail

# Official sources, locally built. No prebuilt paid Aseprite binary is redistributed.
VERSION=1.3.18.6
ROOT="${HOME}/.local/share/eldervale-tools"
CACHE="${HOME}/tmp/opencode/aseprite-build"
mkdir -p "$ROOT" "$CACHE" "${HOME}/.local/bin"

if [ -x "${HOME}/.local/bin/aseprite" ]; then
  "${HOME}/.local/bin/aseprite" --version
  exit 0
fi

if ! [ -x "$ROOT/cmake/bin/cmake" ]; then
  curl --fail --location --retry 3 --silent --show-error \
    https://github.com/Kitware/CMake/releases/download/v3.31.8/cmake-3.31.8-linux-x86_64.tar.gz \
    -o "$CACHE/cmake.tar.gz"
  mkdir -p "$ROOT/cmake"
  tar -xzf "$CACHE/cmake.tar.gz" --strip-components=1 -C "$ROOT/cmake"
fi

if ! [ -f "$CACHE/source/CMakeLists.txt" ]; then
  curl --fail --location --retry 3 --silent --show-error \
    "https://github.com/aseprite/aseprite/releases/download/v${VERSION}/Aseprite-v${VERSION}-Source.zip" \
    -o "$CACHE/aseprite-source.zip"
  mkdir -p "$CACHE/source"
  unzip -q -o "$CACHE/aseprite-source.zip" -d "$CACHE/source"
fi

if ! [ -f "$ROOT/deps/usr/include/X11/Xlib.h" ]; then
  mkdir -p "$CACHE/debs" "$ROOT/deps"
  pushd "$CACHE/debs" >/dev/null
  apt-get download libx11-dev libx11-6 libxext-dev libxext6 \
    libxi-dev libxi6 libxcursor-dev libxcursor1 libxrandr-dev libxrandr2 \
    libxrender-dev libxrender1 libxfixes-dev libxfixes3 libxcb1-dev libxcb1 \
    libxau-dev libxdmcp-dev x11proto-dev xtrans-dev
  for package in ./*.deb; do dpkg-deb -x "$package" "$ROOT/deps"; done
  popd >/dev/null
fi

"$ROOT/cmake/bin/cmake" -S "$CACHE/source" -B "$CACHE/build" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_PREFIX_PATH="$ROOT/deps/usr" \
  -DCMAKE_LIBRARY_PATH="$ROOT/deps/usr/lib/x86_64-linux-gnu" \
  -DCMAKE_INCLUDE_PATH="$ROOT/deps/usr/include" \
  -DCMAKE_C_FLAGS="-I$ROOT/deps/usr/include" \
  -DCMAKE_CXX_FLAGS="-I$ROOT/deps/usr/include" \
  -DCMAKE_EXE_LINKER_FLAGS="-L$ROOT/deps/usr/lib/x86_64-linux-gnu" \
  -DLAF_BACKEND=none -DLAF_WITH_CLIP=ON -DLAF_WITH_EXAMPLES=OFF \
  -DENABLE_NEWS=OFF -DENABLE_UPDATER=OFF -DENABLE_WEBSOCKET=OFF \
  -DENABLE_WEBP=OFF -DENABLE_TESTS=OFF -DENABLE_SCRIPTING=ON \
  -DENABLE_CCACHE=OFF

"$ROOT/cmake/bin/cmake" --build "$CACHE/build" --target aseprite --parallel 4
mkdir -p "$ROOT/aseprite"
cp -a "$CACHE/build/bin/." "$ROOT/aseprite/"
ln -sfn "$ROOT/aseprite/aseprite" "${HOME}/.local/bin/aseprite"
"${HOME}/.local/bin/aseprite" --version
