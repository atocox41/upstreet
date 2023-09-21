#!/bin/bash

export NODE_ENV=development
rm -Rf node_modules/.vite
node index.mjs $@
