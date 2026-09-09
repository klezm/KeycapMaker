import { parentPort, workerData } from "node:worker_threads";

import { renderJob } from "./batch.mjs";

if (!parentPort) throw new Error("worker.mjs must be started as a worker thread");

parentPort.on("message", async (message) => {
  if (message.type === "stop") {
    parentPort.close();
    return;
  }
  try {
    const result = await renderJob(message.job, workerData);
    parentPort.postMessage({ type: "result", result });
  } catch (error) {
    parentPort.postMessage({ type: "error", error: `${message.job.name}: ${error.message}` });
  }
});

parentPort.postMessage({ type: "ready" });
