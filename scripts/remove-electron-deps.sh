#!/bin/bash

echo "removing electron-deps..."

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # MacOS
    sed -i '' '/robotjs/d' "$DIR"/../package.json
else
    # Assume Linux
    sed -i '/robotjs/d' "$DIR"/../package.json
fi
# rm "$DIR"/../package-lock.json
