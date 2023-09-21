#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

#

_term() { 
  # echo "Caught SIGTERM signal!" 
  kill -TERM "$child"
}
_int() { 
  # echo "Caught SIGTERM signal!" 
  kill -INT "$child"
}
trap _term SIGTERM
trap _int SIGINT

#

ARCH=$(arch)
RUN_DIR=""
if [ "$ARCH" == "arm64" ]; then
  RUN_DIR="WebaverseApp-darwin-arm64"
else
  RUN_DIR="WebaverseApp-darwin-x64"
fi

echo "starting app:" "$DIR"/../"$RUN_DIR"/WebaverseApp.app/Contents/MacOS/WebaverseApp
"$DIR"/../"$RUN_DIR"/WebaverseApp.app/Contents/MacOS/WebaverseApp &
child=$!
wait "$child"