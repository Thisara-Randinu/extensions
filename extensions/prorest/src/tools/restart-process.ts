import { Tool } from "@raycast/api";
import { Process } from "../types";
import { getAppName, getProcessType, hasRestartLaunchPath } from "../utils/platform";
import { fetchRunningProcesses, restartProcess as restartSelectedProcess } from "../utils/process";

/**
 * Input type for restarting a process
 */
type Input = {
  /**
   * App name to restart
   */
  processName?: string;

  /**
   * Process ID to restart
   */
  id: number;

  /**
   * Path to the process to restart
   */
  path?: string;

  /**
   * Whether to force restart the process (requires elevated privileges)
   */
  force?: boolean;
};

/**
 * Restart a process.
 * Provide the process ID to restart.
 * If the process is not found, the tool will return an error.
 */
export default async function restartProcess(input: Input) {
  const process = input.path ? buildProcessFromInput(input) : await findProcessById(input.id);
  if (!process) {
    throw new Error(`Process with PID ${input.id} was not found.`);
  }

  if (!hasRestartLaunchPath(process)) {
    throw new Error("The selected process cannot be restarted because its launch path is unavailable.");
  }

  await restartSelectedProcess(process, input.force);

  const processInfo = process.processName ? `${process.processName} ` : "";
  return {
    success: true,
    message: `Restarted process: ${processInfo}(PID: ${input.id})`,
  };
}

/**
 * Because forcibly restarting a process can cause data loss or undesired system changes,
 * let's ask for user confirmation before proceeding.
 */
export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  const info: { name: string; value: string }[] = [];

  // Only add Process Name if it's provided and non-empty
  if (input.processName) {
    info.push({ name: "Process Name", value: input.processName });
  }

  // Always add PID as it's required
  info.push({ name: "PID", value: String(input.id) });

  // Only add Path if it's provided and non-empty
  if (input.path) {
    info.push({ name: "Path", value: input.path });
  }

  return { info };
};

async function findProcessById(processId: number): Promise<Process | undefined> {
  const processes = await fetchRunningProcesses();
  return processes.find((process) => process.id === processId);
}

function buildProcessFromInput(input: Input): Process {
  const path = input.path?.trim();
  if (!path) {
    throw new Error("A valid process path is required to restart the process.");
  }

  const processName = input.processName ?? path.split("/").pop() ?? "";
  const type = getProcessType(path);
  return {
    id: input.id,
    pid: 0,
    cpu: 0,
    mem: 0,
    type,
    path,
    processName,
    appName: type === "app" ? getAppName(path, processName) : undefined,
  };
}
