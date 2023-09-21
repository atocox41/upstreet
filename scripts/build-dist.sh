#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

rm -Rf "$DIR"/../dist
"$DIR"/package-electron-archs.sh && \
  "$DIR"/install-node-archs.sh && \
  "$DIR"/install-platform-node-modules.sh && \
  "$DIR"/copy-bin.sh \
