#/bin/bash
export APP_DEV=true
export APP_DEV_TIMEOUT=100
export APP_LOG=true
export APP_PORT=8000
export APP_PUBLIC=./
export APP_WRITE=false
export APP_HTML=./examples/index.html
export APP_TARGET=/examples/app.bundle.js
export APP_SOURCE=./examples/src/app.ts
export APP_SOURCE_ROOT=./examples/src
export APP_IMPORT_MAP=./import_map.json

while true
do
  deno run -A deploy.ts
  sleep 5
done