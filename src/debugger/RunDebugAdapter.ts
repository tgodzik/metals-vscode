import * as vscode from "vscode";
import { DebugProtocol } from "@vscode/debugprotocol";

export class Message implements DebugProtocol.ProtocolMessage {
  seq: number;
  type: string;

  public constructor(type: string) {
    this.seq = 0;
    this.type = type;
  }
}

export class Event extends Message implements DebugProtocol.Event {
  event: string;

  public constructor(event: string, body?: any) {
    super("event");
    this.event = event;
    if (body) {
      (<any>this).body = body;
    }
  }
}

class ExitedEvent extends Event implements DebugProtocol.ExitedEvent {
  body: {
    exitCode: number;
  };

  public constructor(exitCode: number) {
    super("exited");
    this.body = {
      exitCode: exitCode,
    };
  }
}

export class TerminatedEvent
  extends Event
  implements DebugProtocol.TerminatedEvent
{
  public constructor(restart?: any) {
    super("terminated");
    if (typeof restart === "boolean" || restart) {
      const e: DebugProtocol.TerminatedEvent = this;
      e.body = {
        restart: restart,
      };
    }
  }
}

class Response extends Message implements DebugProtocol.Response {
  request_seq: number;
  success: boolean;
  command: string;

  public constructor(request: DebugProtocol.Request, message?: string) {
    super("response");
    this.request_seq = request.seq;
    this.command = request.command;
    if (message) {
      this.success = false;
      (<any>this).message = message;
    } else {
      this.success = true;
    }
  }
}

export class RunDebugAdapter implements vscode.DebugAdapter {
  private messageEmitter =
    new vscode.EventEmitter<DebugProtocol.ProtocolMessage>();
  private sequence: number = 1;
  constructor() {
    this.onDidSendMessage = this.messageEmitter.event;
  }

  onDidSendMessage: vscode.Event<DebugProtocol.ProtocolMessage>;

  handleMessage(message: DebugProtocol.ProtocolMessage): void {
    if (message.type === "request") {
      this.dispatchRequest(<DebugProtocol.Request>message);
    }
  }

  private sendResponse(message: DebugProtocol.Response): void {
    message.type = "response";
    message.seq = this.sequence++;
    this.messageEmitter.fire(message);
  }

  private sendEvent(message: DebugProtocol.Event): void {
    message.type = "event";
    message.seq = this.sequence++;
    this.messageEmitter.fire(message);
  }

  protected dispatchRequest(request: DebugProtocol.Request): void {
    const response = new Response(request);
    if (request.command === "initialize") {
      const initializeResponse = <DebugProtocol.InitializeResponse>response;
      initializeResponse.body = {};
      this.sendResponse(initializeResponse);
    } else if (request.command === "launch") {
      const launchResponse = <DebugProtocol.LaunchResponse>response;
      this.sendResponse(launchResponse);
      this.sendEvent(new ExitedEvent(0));
      this.sendEvent(new TerminatedEvent(false));
    } else if (request.command === "disconnect") {
      const disconnectResponse = <DebugProtocol.DisconnectResponse>response;
      this.sendResponse(disconnectResponse);
    } else if (request.command === "terminate") {
      const terminateResponse = <DebugProtocol.TerminateResponse>response;
      this.sendResponse(terminateResponse);
    }
  }

  dispose() {}
}
