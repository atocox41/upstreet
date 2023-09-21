#!/bin/bash

echo "install platform node modules..."

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

version=$(cat node_modules/esbuild/package.json | grep version | awk -F'"' '{print $4}' | tr -d ',')

rm -Rf /tmp/electron-deps
mkdir -p /tmp/electron-deps
pushd /tmp/electron-deps;
npm init -y
npm i -f @esbuild/win32-x64@"$version" @esbuild/darwin-arm64@"$version" @esbuild/linux-x64@"$version" @esbuild/darwin-x64@"$version"
popd

cp -R /tmp/electron-deps/node_modules/@esbuild/win32-x64/ "$DIR"/../dist/WebaverseApp-win32-x64/resources/app/node_modules/@esbuild/win32-x64/
cp -R /tmp/electron-deps/node_modules/@esbuild/darwin-arm64/ "$DIR"/../dist/WebaverseApp-darwin-arm64/WebaverseApp.app/Contents/Resources/app/node_modules/@esbuild/darwin-arm64/
cp -R /tmp/electron-deps/node_modules/@esbuild/darwin-x64/ "$DIR"/../dist/WebaverseApp-darwin-x64/WebaverseApp.app/Contents/Resources/app/node_modules/@esbuild/darwin-x64/
cp -R /tmp/electron-deps/node_modules/@esbuild/linux-x64/ "$DIR"/../dist/WebaverseApp-linux-x64/resources/app/node_modules/@esbuild/linux-x64/

# # to run the app:
# BASE_DIR="$DIR"/../dist/WebaverseApp-darwin-arm64/WebaverseApp.app/Contents/Resources/app/
# ELECTRON_PATH="$DIR"/../dist/WebaverseApp-darwin-arm64/WebaverseApp.app/Contents/MacOS/WebaverseApp
# STEAM_APP_PATH="/Users/a/Library/Application Support/Steam/steamapps/common/Moemate"
# STEAM_APP_ELECTRON_PATH="/Users/a/Library/Application Support/Steam/steamapps/common/Moemate/WebaverseApp.app/Contents/MacOS/WebaverseApp"