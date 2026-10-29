const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const rootDir = __dirname;
const backendDir = path.join(rootDir, "backend");
const frontendDir = path.join(rootDir, "frontend");

console.log("\x1b[1m\x1b[36m================================================================\x1b[0m");
console.log("\x1b[1m\x1b[36m       Starting ProxiSpeak Ecosystem (Backend + Frontend)       \x1b[0m");
console.log("\x1b[1m\x1b[36m================================================================\x1b[0m\n");

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, () => resolve(true));
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function pipeOutput(proc, prefix, color) {
  proc.stdout.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`${color}${prefix}\x1b[0m ${line}`);
      }
    }
  });

  proc.stderr.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.error(`${color}${prefix}\x1b[0m ${line}`);
      }
    }
  });
}

async function start() {
  const backendAlreadyRunning = await checkPort(3000);
  let backendProcess = null;

  if (backendAlreadyRunning) {
    console.log("\x1b[32m[Backend ]\x1b[0m Backend server is already running and listening on http://localhost:3000");
  } else {
    backendProcess = spawn(npmCmd, ["start"], {
      cwd: backendDir,
      shell: true,
      env: { ...process.env, FORCE_COLOR: "1" }
    });
    pipeOutput(backendProcess, "[Backend ]", "\x1b[32m");
  }

  // Spawn frontend dev server
  const frontendProcess = spawn(npmCmd, ["run", "dev"], {
    cwd: frontendDir,
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1" }
  });
  pipeOutput(frontendProcess, "[Frontend]", "\x1b[35m");

  console.log("\n\x1b[32m✔ Frontend URL:\x1b[0m http://localhost:5173");
  console.log("\x1b[32m✔ Backend URL:\x1b[0m  http://localhost:3000\n");

  function shutdown() {
    console.log("\n\x1b[33mShutting down ProxiSpeak Ecosystem...\x1b[0m");
    if (isWin) {
      if (backendProcess && backendProcess.pid) spawn("taskkill", ["/pid", backendProcess.pid, "/f", "/t"]);
      if (frontendProcess && frontendProcess.pid) spawn("taskkill", ["/pid", frontendProcess.pid, "/f", "/t"]);
    } else {
      if (backendProcess) backendProcess.kill("SIGTERM");
      frontendProcess.kill("SIGTERM");
    }
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start();
