import * as vscode from "vscode";
import {
  commands,
  DebugConfiguration,
  Disposable,
  ProviderResult,
  WorkspaceFolder,
  DebugAdapterDescriptor,
  DebugConfigurationProviderTriggerKind,
  workspace,
  tasks,
  Task,
  ShellExecution,
} from "vscode";
import {
  DebugDiscoveryParams,
  RunType,
  ServerCommands,
} from "metals-languageclient";
import { ScalaRunMain } from "./testExplorer/types";

const configurationType = "scala";

export function initialize(outputChannel: vscode.OutputChannel): Disposable[] {
  outputChannel.appendLine("Initializing Scala Debugger");
  return [
    vscode.debug.registerDebugConfigurationProvider(
      configurationType,
      new ScalaMainConfigProvider(),
      DebugConfigurationProviderTriggerKind.Initial
    ),
    vscode.debug.registerDebugAdapterDescriptorFactory(
      configurationType,
      new ScalaDebugServerFactory()
    ),
  ];
}

function isScalaRunMain(object: any): object is ScalaRunMain {
  return object.dataKind === "scala-main-class";
}

function runMain(main: ScalaRunMain): Thenable<boolean> {
  if (workspace.workspaceFolders) {
    const initialObj: { [key: string]: string } = {};
    const env = main.data.environmentVariables.reduce((obj, e) => {
      const split = e.split("=");
      const key = split[0];
      return (obj[key] = split[1]), obj;
    }, initialObj);
    return tasks
      .executeTask(
        new Task(
          { type: "scala", task: "run" },
          workspace.workspaceFolders[0],
          "Scala run",
          "Metals",
          new ShellExecution(main.data.shellCommand, { env: env })
        )
      )
      .then((_a) => true);
  }
  return Promise.resolve(false);
}

export async function start(
  noDebug: boolean,
  ...parameters: any[]
): Promise<boolean> {
  if (noDebug) {
    const main = parameters[0];
    if (isScalaRunMain(main)) {
      return runMain(main);
    } else {
      return vscode.commands
        .executeCommand<ScalaRunMain>("discover-jvm-run-command", ...parameters)
        .then((response) => {
          if (response) {
            return runMain(response);
          } else {
            return debug(noDebug, ...parameters);
          }
        });
    }
  } else {
    return debug(noDebug, ...parameters);
  }
}

async function debug(noDebug: boolean, ...parameters: any[]): Promise<boolean> {
  return commands
    .executeCommand("workbench.action.files.save")
    .then(() =>
      vscode.commands.executeCommand<DebugSession>(
        ServerCommands.DebugAdapterStart,
        ...parameters
      )
    )
    .then((response) => {
      if (response === undefined) {
        return false;
      }

      const port = debugServerFromUri(response.uri).port;

      const configuration: vscode.DebugConfiguration = {
        type: configurationType,
        name: response.name,
        noDebug: noDebug,
        request: "launch",
        debugServer: port, // note: MUST be a number. vscode magic - automatically connects to the server
      };
      commands.executeCommand("workbench.panel.repl.view.focus");
      return vscode.debug.startDebugging(undefined, configuration);
    });
}

class ScalaMainConfigProvider implements vscode.DebugConfigurationProvider {
  resolveDebugConfiguration(
    _folder: WorkspaceFolder | undefined,
    debugConfiguration: DebugConfiguration
  ): ProviderResult<DebugConfiguration> {
    const editor = vscode.window.activeTextEditor;
    // debugConfiguration.type is undefined if there are no configurations
    // we are running whatever is in the file
    if (debugConfiguration.type === undefined && editor) {
      const args: DebugDiscoveryParams = {
        path: editor.document.uri.toString(true),
        runType: RunType.RunOrTestFile,
      };
      return start(debugConfiguration.noDebug, args).then(() => {
        return debugConfiguration;
      });
    } else {
      return debugConfiguration;
    }
  }
}

class ScalaDebugServerFactory implements vscode.DebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(
    session: vscode.DebugSession
  ): ProviderResult<DebugAdapterDescriptor> {
    if (
      session.configuration.mainClass !== undefined ||
      session.configuration.testClass !== undefined ||
      session.configuration.hostName !== undefined
    ) {
      return vscode.commands
        .executeCommand<DebugSession>(
          ServerCommands.DebugAdapterStart,
          session.configuration
        )
        .then((debugSession) => {
          if (debugSession === undefined) {
            return null;
          }
          return debugServerFromUri(debugSession.uri);
        });
    }
    return null;
  }
}

export function debugServerFromUri(uri: string): vscode.DebugAdapterServer {
  const debugServer = vscode.Uri.parse(uri);
  const segments = debugServer.authority.split(":");
  const host = segments[0];
  const port = parseInt(segments[segments.length - 1]);
  return new vscode.DebugAdapterServer(port, host);
}

export interface DebugSession {
  name: string;
  uri: string;
}
