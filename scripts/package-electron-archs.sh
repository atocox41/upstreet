#!/bin/bash

echo "package electron archs..."

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# clean

rm -Rf "$DIR"/../dist
rm -Rf "$DIR"/../dist2

mkdir -p "$DIR"/../dist

# main install + package

rm -Rf node_modules package-lock.json
npm i --platform=win32 --arch=x64
"$DIR"/../node_modules/.bin/electron-packager . WebaverseApp --platform=win32 --arch=x64 --out="$DIR"/../dist2/
mv "$DIR"/../dist2/* "$DIR"/../dist/
rm -Rf dist2

rm -Rf node_modules package-lock.json
npm i --platform=darwin --arch=arm64
"$DIR"/../node_modules/.bin/electron-packager . WebaverseApp --platform=darwin --arch=arm64 --out="$DIR"/../dist2/
mv "$DIR"/../dist2/* "$DIR"/../dist/
rm -Rf dist2

rm -Rf node_modules package-lock.json
npm i --platform=darwin --arch=x64
"$DIR"/../node_modules/.bin/electron-packager . WebaverseApp --platform=darwin --arch=x64 --out="$DIR"/../dist2/
mv "$DIR"/../dist2/* "$DIR"/../dist/
rm -Rf dist2

rm -Rf node_modules package-lock.json
npm i --platform=linux --arch=x64
"$DIR"/../node_modules/.bin/electron-packager . WebaverseApp --platform=linux --arch=x64 --out="$DIR"/../dist2/
mv "$DIR"/../dist2/* "$DIR"/../dist/
rm -Rf dist2

# remove unnecessary files

rm -Rf "$DIR"/../dist/WebaverseApp-win32-x64/resources/app/dist
rm -Rf "$DIR"/../dist/WebaverseApp-win32-x64/resources/app/data
rm -Rf "$DIR"/../dist/WebaverseApp-win32-x64/resources/app/packages/gen
rm -Rf "$DIR"/../dist/WebaverseApp-win32-x64/resources/app/node_modules/gen
rm -Rf "$DIR"/../dist/WebaverseApp-win32-x64/resources/app/packages/wiki
rm -Rf "$DIR"/../dist/WebaverseApp-win32-x64/resources/app/node_modules/wiki
rm -Rf "$DIR"/../dist/WebaverseApp-win32-x64/resources/app/public/images/worldzines

rm -Rf "$DIR"/../dist/WebaverseApp-darwin-arm64/WebaverseApp.app/Contents/Resources/app/dist
rm -Rf "$DIR"/../dist/WebaverseApp-darwin-arm64/WebaverseApp.app/Contents/Resources/app/data
rm -Rf "$DIR"/../dist/WebaverseApp-darwin-arm64/WebaverseApp.app/Contents/Resources/app/packages/gen
rm -Rf "$DIR"/../dist/WebaverseApp-darwin-arm64/WebaverseApp.app/Contents/Resources/app/node_modules/gen
rm -Rf "$DIR"/../dist/WebaverseApp-darwin-arm64/WebaverseApp.app/Contents/Resources/app/packages/wiki
rm -Rf "$DIR"/../dist/WebaverseApp-darwin-arm64/WebaverseApp.app/Contents/Resources/app/node_modules/wiki
rm -Rf "$DIR"/../dist/WebaverseApp-darwin-arm64/WebaverseApp.app/Contents/Resources/app/public/images/worldzines

rm -Rf "$DIR"/../dist/WebaverseApp-darwin-x64/WebaverseApp.app/Contents/Resources/app/dist
rm -Rf "$DIR"/../dist/WebaverseApp-darwin-x64/WebaverseApp.app/Contents/Resources/app/data
rm -Rf "$DIR"/../dist/WebaverseApp-darwin-x64/WebaverseApp.app/Contents/Resources/app/packages/gen
rm -Rf "$DIR"/../dist/WebaverseApp-darwin-x64/WebaverseApp.app/Contents/Resources/app/node_modules/gen
rm -Rf "$DIR"/../dist/WebaverseApp-darwin-x64/WebaverseApp.app/Contents/Resources/app/packages/wiki
rm -Rf "$DIR"/../dist/WebaverseApp-darwin-x64/WebaverseApp.app/Contents/Resources/app/node_modules/wiki
rm -Rf "$DIR"/../dist/WebaverseApp-darwin-x64/WebaverseApp.app/Contents/Resources/app/public/images/worldzines

rm -Rf "$DIR"/../dist/WebaverseApp-linux-x64/resources/app/dist
rm -Rf "$DIR"/../dist/WebaverseApp-linux-x64/resources/app/data
rm -Rf "$DIR"/../dist/WebaverseApp-linux-x64/resources/app/packages/gen
rm -Rf "$DIR"/../dist/WebaverseApp-linux-x64/resources/app/node_modules/gen
rm -Rf "$DIR"/../dist/WebaverseApp-linux-x64/resources/app/packages/wiki
rm -Rf "$DIR"/../dist/WebaverseApp-linux-x64/resources/app/node_modules/wiki
rm -Rf "$DIR"/../dist/WebaverseApp-linux-x64/resources/app/public/images/worldzines