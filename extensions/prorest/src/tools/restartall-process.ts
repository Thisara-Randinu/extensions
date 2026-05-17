import { Tool } from "@raycast/api";
import { hasRestartLaunchPath } from "../utils/platform";
import { fetchRunningProcesses, restartProcess } from "../utils/process";

type Input = {
  /**
   * Exact process name to restart all instances of (e.g. "node", "Google Chrome Helper")
   */
  processName: string;

  /**
   * Whether to force restart with elevated privileges
   */
  force?: boolean;
};

/**
 * Restart all processes matching a given name by terminating and relaunching them.
 * Provide the exact process name. All running instances with that name will be restarted.
 */
export default async function restartAllProcesses(input: Input) {
  const processName = input.processName.trim();
  if (!processName || processName === "-") {
    throw new Error("A valid process name is required");
  }

  const processes = await fetchRunningProcesses();
  const matchingProcesses = processes.filter((process) => process.processName === processName);
  if (matchingProcesses.length === 0) {
    throw new Error(`No running processes found with the name "${processName}".`);
  }

  const restartableProcesses = matchingProcesses.filter((process) => hasRestartLaunchPath(process));
  if (restartableProcesses.length === 0) {
    throw new Error(`No restartable processes found with the name "${processName}".`);
  }

  const results = await Promise.allSettled(restartableProcesses.map((process) => restartProcess(process, input.force)));

  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    throw new Error(
      `Failed to restart ${failures.length} of ${restartableProcesses.length} "${processName}" processes.`,
    );
  }

  return {
    success: true,
    message: `Restarted ${restartableProcesses.length} "${processName}" processes`,
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  const info: { name: string; value: string }[] = [{ name: "Process Name", value: input.processName }];

  if (input.force) {
    info.push({ name: "Force", value: "Yes (elevated privileges)" });
  }

  return { info };
};
