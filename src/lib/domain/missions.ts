export type MissionProgressState = {
  target: number;
  progress: number;
  isComplete: boolean;
};

export type MissionProgressUpdate = {
  progress: number;
  isComplete: boolean;
  shouldReward: boolean;
};

/**
 * Calculates the only transition that can award a daily mission.
 * The persistence layer must apply the returned transition atomically.
 */
export function updateMissionProgress(mission: MissionProgressState, observedProgress: number): MissionProgressUpdate {
  const progress = Math.max(0, Math.floor(observedProgress));
  const reachesTarget = progress >= mission.target;
  return {
    progress,
    isComplete: mission.isComplete || reachesTarget,
    shouldReward: !mission.isComplete && reachesTarget,
  };
}
