export interface DebugDiscoveryParams {
  path: string | undefined;
  mainClass: string | undefined;
  buildTarget: string | undefined;
  runType: RunType;
}

export enum RunType {
  Run = "run",
  RunOrTestFile = "runOrTestFile",
  TestFile = "testFile",
  TestTarget = "testTarget",
}
