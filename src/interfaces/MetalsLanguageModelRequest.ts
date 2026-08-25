import { RequestType } from "vscode-languageclient";

/**
 * The Metals language model request is sent from the server to the client to
 * let Metals invoke a language model (LLM) and get a response. This enables
 * AI-powered features in Metals by leveraging the user's available language
 * models (e.g., GitHub Copilot).
 */
export const MetalsLanguageModelRequestType = new RequestType<
  MetalsLanguageModelParams,
  MetalsLanguageModelResult,
  void
>("metals/languageModelRequest");

export interface MetalsLanguageModelMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MetalsLanguageModelParams {
  /**
   * The messages to send to the language model.
   */
  messages: MetalsLanguageModelMessage[];
  /**
   * Optional model family to use (e.g., "gpt-4o", "claude-sonnet").
   * If not specified, the default model will be used.
   */
  modelFamily?: string;
  /**
   * Optional system prompt to set the context for the model.
   */
  systemPrompt?: string;
}

export interface MetalsLanguageModelResult {
  /**
   * The response text from the language model.
   */
  text?: string;
  /**
   * Error message if the request failed.
   */
  error?: string;
}
