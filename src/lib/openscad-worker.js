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

self.addEventListener("message", async (event) => {
  const { runtimeUrl, files, args, outputPaths = [] } = event.data;

  try {
    const { default: OpenSCAD } = await import(/* @vite-ignore */ runtimeUrl);
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

    const outputs = outputPaths.map((path) => {
      const bytes = instance.FS.readFile(path);
      return {
        path,
        bytes,
      };
    });

    const transfer = outputs.map((output) => output.bytes.buffer);

    self.postMessage(
      {
        ok: true,
        result: {
          exitCode,
          elapsedMs,
          logs,
          outputs,
        },
      },
      transfer,
    );
  } catch (error) {
    const details =
      error instanceof Error && error.stack ? `${error.name}: ${error.message}\n${error.stack}` : `${error}`;
    self.postMessage({
      ok: false,
      error: details,
    });
  }
});
