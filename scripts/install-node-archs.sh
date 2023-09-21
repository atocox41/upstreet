#!/bin/bash

echo "install node archs..."

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

VERSION="v20.0.0"

# clean

rm -Rf "$DIR"/../dist/WebaverseApp-win32-x64/node/
rm -Rf "$DIR"/../dist/WebaverseApp-darwin-arm64/node/
rm -Rf "$DIR"/../dist/WebaverseApp-darwin-x64/node/
rm -Rf "$DIR"/../dist/WebaverseApp-linux-x64/node/

mkdir -p "$DIR"/../dist/WebaverseApp-win32-x64/node
mkdir -p "$DIR"/../dist/WebaverseApp-darwin-arm64/node
mkdir -p "$DIR"/../dist/WebaverseApp-darwin-x64/node
mkdir -p "$DIR"/../dist/WebaverseApp-linux-x64/node

# Download and extract Node.js distributions
curl -L https://nodejs.org/dist/${VERSION}/node-${VERSION}-win-x64.zip -o "$DIR"/../dist/WebaverseApp-win32-x64/node/node-${VERSION}-win-x64.zip
unzip "$DIR"/../dist/WebaverseApp-win32-x64/node/node-${VERSION}-win-x64.zip -d "$DIR"/../dist/WebaverseApp-win32-x64/node/
rm "$DIR"/../dist/WebaverseApp-win32-x64/node/node-${VERSION}-win-x64.zip

curl -L https://nodejs.org/dist/${VERSION}/node-${VERSION}-darwin-arm64.tar.xz -o "$DIR"/../dist/WebaverseApp-darwin-arm64/node/node-${VERSION}-darwin-arm64.tar.xz
tar -xJf "$DIR"/../dist/WebaverseApp-darwin-arm64/node/node-${VERSION}-darwin-arm64.tar.xz -C "$DIR"/../dist/WebaverseApp-darwin-arm64/node/
rm "$DIR"/../dist/WebaverseApp-darwin-arm64/node/node-${VERSION}-darwin-arm64.tar.xz

curl -L https://nodejs.org/dist/${VERSION}/node-${VERSION}-darwin-x64.tar.xz -o "$DIR"/../dist/WebaverseApp-darwin-x64/node/node-${VERSION}-darwin-x64.tar.xz
tar -xJf "$DIR"/../dist/WebaverseApp-darwin-x64/node/node-${VERSION}-darwin-x64.tar.xz -C "$DIR"/../dist/WebaverseApp-darwin-x64/node/
rm "$DIR"/../dist/WebaverseApp-darwin-x64/node/node-${VERSION}-darwin-x64.tar.xz

curl -L https://nodejs.org/dist/${VERSION}/node-${VERSION}-linux-x64.tar.xz -o "$DIR"/../dist/WebaverseApp-linux-x64/node/node-${VERSION}-linux-x64.tar.xz
tar -xJf "$DIR"/../dist/WebaverseApp-linux-x64/node/node-${VERSION}-linux-x64.tar.xz -C "$DIR"/../dist/WebaverseApp-linux-x64/node/
rm "$DIR"/../dist/WebaverseApp-linux-x64/node/node-${VERSION}-linux-x64.tar.xz