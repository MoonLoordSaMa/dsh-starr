import { spawn } from "node:child_process";
const children = [
  spawn(process.execPath, ["--watch", "src/server.mjs"], { stdio: "inherit" }),
  spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "17842",
      "--strictPort",
    ],
    { stdio: "inherit" },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((p) => p.kill());
  process.exitCode = code;
}
for (const p of children) p.on("exit", (c) => stop(c ?? 0));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
