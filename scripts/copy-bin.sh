#!/bin/bash

echo "copying bin..."

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

tar -xf "$DIR"/bin/napi-3-win32-unknown-ia32.tar -C "$DIR"/../dist/WebaverseApp-win32-x64/resources/app/node_modules/active-win/lib/binding
tar -xf "$DIR"/bin/napi-3-win32-unknown-x64.tar -C "$DIR"/../dist/WebaverseApp-win32-x64/resources/app/node_modules/active-win/lib/binding
tar -xf "$DIR"/bin/napi-6-win32-unknown-ia32.tar -C "$DIR"/../dist/WebaverseApp-win32-x64/resources/app/node_modules/active-win/lib/binding
tar -xf "$DIR"/bin/napi-6-win32-unknown-x64.tar -C "$DIR"/../dist/WebaverseApp-win32-x64/resources/app/node_modules/active-win/lib/binding
cp "$DIR"/bin/robotjs.node "$DIR"/../dist/WebaverseApp-win32-x64/resources/app/node_modules/robotjs/build/Release
rm -Rf "$DIR"/../dist/bin
mkdir "$DIR"/../dist/bin
cp -R "$DIR"/bin/start-macos.sh "$DIR"/../dist/bin/