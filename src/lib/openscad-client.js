import workerUrl from "./openscad-worker.js?worker&url";

function resolveRuntimeUrl() {
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL("vendor/openscad/openscad.js", baseUrl).toString();
}

export function runOpenScad(job) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerUrl, { type: "module" });

    worker.addEventListener("message", (event) => {
      const { data } = event;
      worker.terminate();

      if (data.ok) {
        resolve(data.result);
        return;
      }

      reject(new Error(data.error || "OpenSCAD worker failed."));
    });

    worker.addEventListener("error", (event) => {
      worker.terminate();
      reject(event.error || new Error("OpenSCAD worker crashed."));
    });

    worker.postMessage({
      runtimeUrl: resolveRuntimeUrl(),
      ...job,
    });
  });
}

// Each OpenSCAD instance carries its own WASM heap, and instances are only
// reclaimed when the GC gets round to it. Recycling a worker after a bounded
// number of jobs keeps peak memory predictable across a 100+ job board render,
// while still amortising the expensive module compile over many jobs.
const DEFAULT_JOBS_PER_WORKER = 20;

// Board rendering is CPU-bound WASM, so it scales with cores. The cap keeps
// peak memory sane: each busy worker holds a live OpenSCAD heap.
const MAX_POOL_SIZE = 8;

function resolveDefaultPoolSize() {
  const cores = typeof navigator === "undefined" ? 4 : (navigator.hardwareConcurrency ?? 4);
  return Math.max(1, Math.min(cores, MAX_POOL_SIZE));
}

function createPooledWorker(runtimeUrl, jobsPerWorker) {
  let worker = null;
  let jobsRun = 0;
  let nextJobId = 0;

  const spawn = () => {
    worker = new Worker(workerUrl, { type: "module" });
    jobsRun = 0;
  };

  const recycle = () => {
    worker?.terminate();
    worker = null;
  };

  return {
    async run(job) {
      if (!worker) {
        spawn();
      }

      const jobId = nextJobId;
      nextJobId += 1;
      const activeWorker = worker;

      const result = await new Promise((resolve, reject) => {
        const handleMessage = (event) => {
          if (event.data?.jobId !== jobId) {
            return;
          }
          cleanup();
          if (event.data.ok) {
            resolve(event.data.result);
          } else {
            reject(new Error(event.data.error || "OpenSCAD worker failed."));
          }
        };
        const handleError = (event) => {
          cleanup();
          reject(event.error || new Error("OpenSCAD worker crashed."));
        };
        const cleanup = () => {
          activeWorker.removeEventListener("message", handleMessage);
          activeWorker.removeEventListener("error", handleError);
        };

        activeWorker.addEventListener("message", handleMessage);
        activeWorker.addEventListener("error", handleError);
        activeWorker.postMessage({ jobId, runtimeUrl, ...job });
      }).catch((error) => {
        // A crashed worker cannot be trusted for the next job.
        recycle();
        throw error;
      });

      jobsRun += 1;
      if (jobsRun >= jobsPerWorker) {
        recycle();
      }

      return result;
    },
    dispose: recycle,
  };
}

/**
 * A small pool of reusable OpenSCAD workers.
 *
 * `runOpenScad` spawns and tears down a worker per call, which is fine for one
 * keycap but means re-fetching and re-compiling the runtime for each of the
 * ~125 jobs a full board needs. Pooled workers stay alive across jobs and run
 * in parallel.
 */
export function createOpenScadPool({ size = resolveDefaultPoolSize(), jobsPerWorker = DEFAULT_JOBS_PER_WORKER } = {}) {
  const runtimeUrl = resolveRuntimeUrl();
  const poolSize = Math.max(1, size);
  const workers = Array.from({ length: poolSize }, () => createPooledWorker(runtimeUrl, jobsPerWorker));
  const idle = [...workers];
  const waiting = [];
  let disposed = false;

  const acquire = () => {
    const available = idle.pop();
    if (available) {
      return Promise.resolve(available);
    }
    return new Promise((resolve) => {
      waiting.push(resolve);
    });
  };

  const release = (pooledWorker) => {
    const next = waiting.shift();
    if (next) {
      next(pooledWorker);
      return;
    }
    idle.push(pooledWorker);
  };

  return {
    size: poolSize,
    async run(job) {
      if (disposed) {
        throw new Error("The OpenSCAD pool has been disposed.");
      }

      const pooledWorker = await acquire();
      try {
        return await pooledWorker.run(job);
      } finally {
        release(pooledWorker);
      }
    },
    dispose() {
      disposed = true;
      for (const pooledWorker of workers) {
        pooledWorker.dispose();
      }
    },
  };
}
