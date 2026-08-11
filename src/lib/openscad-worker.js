function makeDirRecursive(fs, absolutePath) {
  const segments = absolutePath.split("/").filter(Boolean);
  let current = "";

  for (const segment of segments) {
    current += `/${segment}`;
    const analysis = fs.analyzePath(current);

    if (analysis.exists) {
      const mode = analysis.object?.mode ?? analysis.stat?.mode;
      if (mode != null && !fs.isDir(mode)) {
        throw new Error(`${current} is not a directory.`);
      }
      continue;
    }

    fs.mkdir(current);
  }
}

function getParentDir(path) {
  const segments = path.split("/").filter(Boolean);
  if (segments.length <= 1) {
    return "/";
  }

  return `/${segments.slice(0, -1).join("/")}`;
}

// Importing the runtime is the expensive part - it fetches and compiles ~9.6MB
// of WebAssembly. A pooled worker runs many jobs, so the module is imported
// once and only the (cheap) instance is rebuilt per job, which keeps each job
// isolated in its own filesystem and heap.
let runtimeModulePromise = null;
let runtimeModuleUrl = "";

async function loadRuntime(runtimeUrl) {
  if (!runtimeModulePromise || runtimeModuleUrl !== runtimeUrl) {
    runtimeModuleUrl = runtimeUrl;
    runtimeModulePromise = import(/* @vite-ignore */ runtimeUrl);
  }

  const { default: OpenSCAD } = await runtimeModulePromise;
  return OpenSCAD;
}

async function runJob({ runtimeUrl, files, args, outputPaths = [] }) {
  const OpenSCAD = await loadRuntime(runtimeUrl);
  const logs = [];
  const instance = await OpenSCAD({
    noInitialRun: true,
    print(text) {
      logs.push({ stream: "stdout", text });
    },
    printErr(text) {
      logs.push({ stream: "stderr", text });
    },
  });

  const start = performance.now();

  for (const file of files) {
    makeDirRecursive(instance.FS, getParentDir(file.path));
    instance.FS.writeFile(file.path, file.content);
  }

  for (const outputPath of outputPaths) {
    makeDirRecursive(instance.FS, getParentDir(outputPath));
  }

  const exitCode = instance.callMain(args);
  const elapsedMs = performance.now() - start;

  const outputs = outputPaths.map((path) => ({
    path,
    bytes: instance.FS.readFile(path),
  }));

  return {
    result: { exitCode, elapsedMs, logs, outputs },
    transfer: outputs.map((output) => output.bytes.buffer),
  };
}

self.addEventListener("message", async (event) => {
  const { data } = event;
  // Pooled jobs carry an id and expect it echoed back so the client can match
  // the reply; the original one-shot protocol has neither and is unchanged.
  const jobId = data?.jobId;

  try {
    const { result, transfer } = await runJob(data);
    self.postMessage(
      jobId === undefined ? { ok: true, result } : { ok: true, jobId, result },
      transfer,
    );
  } catch (error) {
    const details = error instanceof Error && error.stack
      ? `${error.name}: ${error.message}\n${error.stack}`
      : `${error}`;
    self.postMessage(jobId === undefined ? { ok: false, error: details } : { ok: false, jobId, error: details });
  }
});
