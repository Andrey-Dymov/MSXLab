#!/bin/zsh
set -e
cd "$(dirname "$0")"
if [[ ! -f dist/index.html || ! -d node_modules/electron/dist/Electron.app ]]; then
  print 'MSXLab needs dependencies and a build. Run npm install && npm run build in this folder.'
  read '?Press Enter to close...'
  exit 1
fi
open -n "$PWD/node_modules/electron/dist/Electron.app" --args "$PWD"
