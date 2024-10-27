#/bin/bash
deno run --allow-read --allow-write --allow-env --allow-net\
  ./build.ts dev\
  ./examples/src/app.ts\
  ./examples/app.bundle.js\
  ./examples