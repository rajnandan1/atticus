import {
    RealtimeAgent,
    RealtimeSession,
    tool,
    type RealtimeItem,
} from "@openai/agents/realtime";
import { z } from "zod";
import { adaptiveD2Snap } from "@webfuse-com/d2snap";
import type {
    AvenConfig,
    AvenStatus,
    ConversationState,
    AvenState,
    Message,
    MessageContent,
    AvenEvents,
    AvenEventName,
    UIAction,
    UIActionType,
    D2SnapOptions,
    UIConfig,
    AvenVoice,
} from "./types";
import {
    LANGUAGE_NAMES,
    LANGUAGE_GREETINGS,
    SUPPORTED_TRANSCRIPTION_LANGUAGES,
    getLanguageName,
    getLanguageGreeting,
    isTranscriptionSupported,
} from "./languages";

// Re-export types
export type {
    AvenConfig,
    AvenStatus,
    ConversationState,
    AvenState,
    Message,
    MessageContent,
    AvenEvents,
    AvenEventName,
    UIAction,
    UIActionType,
    D2SnapOptions,
    UIConfig,
    AvenVoice,
};

// Re-export language utilities
export {
    LANGUAGE_NAMES,
    LANGUAGE_GREETINGS,
    SUPPORTED_TRANSCRIPTION_LANGUAGES,
    getLanguageName,
    getLanguageGreeting,
    isTranscriptionSupported,
};

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG = {
    model: "gpt-4o-realtime-preview",
    voice: "alloy" as const,
    language: "en",
    autoGreet: true,
    greetingMessage: "Hello!",
    debug: false,
    doNotExecuteActions: false,
} as const;

const DEFAULT_UI_CONFIG = {
    enabled: false,
    autoUpdate: false,
    autoUpdateInterval: 5000,
    d2SnapOptions: {
        maxTokens: 4096,
        assignUniqueIDs: true,
    },
} as const;

// ============================================================================
// Aven Class
// ============================================================================

/**
 * Aven - A framework-agnostic voice agent for voice-controlled UI interactions.
 *
 * @example
 * ```ts
 * import { Aven } from 'aven';
 *
 * const agent = new Aven({
 *   clientSecret: 'ek_...',
 *   agent: {
 *     name: 'Assistant',
 *     instructions: 'You are a helpful assistant.'
 *   }
 * });
 *
 * agent.on('connected', () => console.log('Connected!'));
 * agent.on('message', (msg) => console.log('Message:', msg));
 *
 * await agent.connect();
 * ```
 */
export class Aven {
    private config: Required<
        Omit<AvenConfig, "ui"> & {
            ui: Required<UIConfig> & { d2SnapOptions: Required<D2SnapOptions> };
        }
    >;
    private agent: RealtimeAgent;
    private session: RealtimeSession | null = null;
    private listeners: Map<string, Set<Function>> = new Map();

    // State
    private _status: AvenStatus = "idle";
    private _conversationState: ConversationState = "idle";
    private _error: string | null = null;
    private _history: Message[] = [];
    private _messageIdCounter = 0;
    private _actionIdCounter = 0;

    // UI State
    private _currentDOM: string | null = null;
    private _autoUpdateTimer: ReturnType<typeof setInterval> | null = null;

    /**
     * Create a new Aven instance.
     *
     * @param config - Configuration options
     */
    constructor(config: AvenConfig) {
        // Merge with defaults
        const uiConfig = config.ui
            ? {
                  enabled: config.ui.enabled,
                  rootElement: config.ui.rootElement,
                  autoUpdate:
                      config.ui.autoUpdate ?? DEFAULT_UI_CONFIG.autoUpdate,
                  autoUpdateInterval:
                      config.ui.autoUpdateInterval ??
                      DEFAULT_UI_CONFIG.autoUpdateInterval,
                  d2SnapOptions: {
                      maxTokens:
                          config.ui.d2SnapOptions?.maxTokens ??
                          DEFAULT_UI_CONFIG.d2SnapOptions.maxTokens,
                      assignUniqueIDs:
                          config.ui.d2SnapOptions?.assignUniqueIDs ??
                          DEFAULT_UI_CONFIG.d2SnapOptions.assignUniqueIDs,
                  },
              }
            : {
                  enabled: false,
                  rootElement: null as unknown as Element,
                  autoUpdate: DEFAULT_UI_CONFIG.autoUpdate,
                  autoUpdateInterval: DEFAULT_UI_CONFIG.autoUpdateInterval,
                  d2SnapOptions: DEFAULT_UI_CONFIG.d2SnapOptions,
              };

        this.config = {
            clientSecret: config.clientSecret,
            agent: config.agent,
            model: config.model ?? DEFAULT_CONFIG.model,
            voice: config.voice ?? DEFAULT_CONFIG.voice,
            language: config.language ?? DEFAULT_CONFIG.language,
            autoGreet: config.autoGreet ?? DEFAULT_CONFIG.autoGreet,
            greetingMessage:
                config.greetingMessage ?? DEFAULT_CONFIG.greetingMessage,
            debug: config.debug ?? DEFAULT_CONFIG.debug,
            doNotExecuteActions:
                config.doNotExecuteActions ??
                DEFAULT_CONFIG.doNotExecuteActions,
            ui: uiConfig as Required<UIConfig> & {
                d2SnapOptions: Required<D2SnapOptions>;
            },
        };

        // Build complete instructions
        const instructions = this.buildInstructions();

        // Create UI action tool if UI is enabled
        const tools = this.config.ui.enabled ? [this.createUIActionTool()] : [];

        // Create the RealtimeAgent
        this.agent = new RealtimeAgent({
            name: this.config.agent.name,
            instructions,
            tools,
            voice: this.config.voice,
        });

        this.log("Aven initialized with config:", {
            model: this.config.model,
            voice: this.config.voice,
            language: this.config.language,
            uiEnabled: this.config.ui.enabled,
        });
    }

    // ========================================================================
    // UI Action Tool
    // ========================================================================

    private createUIActionTool() {
        return tool({
            name: "execute_ui_action",
            description: `Execute a UI action on the page. Use this tool whenever the user asks you to interact with the UI (click buttons, fill forms, scroll, etc.). 
            
IMPORTANT: 
- Always provide outputText with a natural language explanation of what you're doing
- Provide outputCode with valid JavaScript that will execute the action
- The code will be executed in the browser context with access to document and all DOM APIs
- Use the element IDs or selectors from the UI context to target elements`,
            parameters: z.object({
                outputText: z
                    .string()
                    .describe(
                        "The natural language response to speak to the user explaining what action you are taking"
                    ),
                outputCode: z
                    .string()
                    .nullable()
                    .describe(
                        "JavaScript code to execute the UI action. Use document.getElementById, querySelector, etc. Set to null if no code execution is needed (e.g., just reading information)"
                    ),
                actionDescription: z
                    .string()
                    .nullable()
                    .describe("Brief description of what the code does"),
                targetElement: z
                    .string()
                    .nullable()
                    .describe("The element ID or selector being targeted"),
                actionType: z
                    .enum([
                        "click",
                        "type",
                        "scroll",
                        "focus",
                        "hover",
                        "select",
                        "navigate",
                        "read",
                        "other",
                    ])
                    .nullable()
                    .describe("The type of UI action being performed"),
            }),
            execute: async (params) => {
                const action: UIAction = {
                    id: `action_${++this._actionIdCounter}`,
                    outputText: params.outputText,
                    outputCode: params.outputCode,
                    actionDescription: params.actionDescription,
                    targetElement: params.targetElement,
                    actionType: params.actionType as UIActionType | null,
                    timestamp: new Date(),
                };

                this.log("UI Action requested:", action);
                this.emit("action", action);

                // Auto-execute the action unless doNotExecuteActions is true
                if (!this.config.doNotExecuteActions && action.outputCode) {
                    const result = await this.executeAction(action);
                    if (result.success) {
                        this.log("Action auto-executed successfully");
                    } else {
                        this.log("Action auto-execution failed:", result.error);
                    }
                }

                return params.outputText;
            },
        });
    }

    // ========================================================================
    // Instruction Building
    // ========================================================================

    private buildInstructions(): string {
        let instructions = this.config.agent.instructions;

        // Add language directive
        const languageDirective = this.getLanguageDirective();
        if (languageDirective) {
            instructions = `${languageDirective}\n\n${instructions}`;
        }

        // Add UI directive if enabled
        if (this.config.ui.enabled) {
            instructions = `${instructions}\n\n${this.getUIDirective()}`;
        }

        return instructions;
    }

    private getLanguageDirective(): string | null {
        const lang = this.config.language;

        // Always add a language directive to ensure consistent language
        const languageName = getLanguageName(lang || "en");
        return `IMPORTANT: You MUST speak and respond ONLY in ${languageName}. All your responses should be in ${languageName}. If the user speaks in any other language, still respond in ${languageName}.`;
    }

    private getUIDirective(): string {
        return `
## UI Interaction Capabilities

You have access to the current UI state of the page. When the user asks you to interact with the UI:

1. Use the \`execute_ui_action\` tool to perform UI actions
2. Always provide a natural \`outputText\` explaining what you're doing
3. Provide \`outputCode\` with valid JavaScript to execute the action
4. The code runs in browser context with full DOM access

### Available Actions:
- **click**: Click buttons, links, or any clickable element
- **type**: Enter text into input fields (use element.value = 'text' or element.focus() then simulate typing)
- **scroll**: Scroll the page or specific elements
- **focus**: Focus on form elements
- **select**: Select options from dropdowns
- **navigate**: Navigate to different pages or sections
- **read**: Read and report information from the UI (no code needed)

### Code Examples:
- Click: \`document.getElementById('btn').click()\`
- Type: \`document.getElementById('input').value = 'Hello'\`
- Scroll: \`window.scrollTo(0, 500)\`
- Focus: \`document.getElementById('field').focus()\`
- Select: \`document.getElementById('select').value = 'option1'\`

IMPORTANT: Always use the execute_ui_action tool for UI interactions. Do not try to describe actions in plain text.
`;
    }

    // ========================================================================
    // Event Handling
    // ========================================================================

    /**
     * Subscribe to an event.
     *
     * @param event - The event name
     * @param callback - The callback function
     * @returns A function to unsubscribe
     */
    on<T extends AvenEventName>(event: T, callback: AvenEvents[T]): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event for one invocation only.
     *
     * @param event - The event name
     * @param callback - The callback function
     * @returns A function to unsubscribe
     */
    once<T extends AvenEventName>(
        event: T,
        callback: AvenEvents[T]
    ): () => void {
        const wrappedCallback = ((...args: any[]) => {
            this.off(event, wrappedCallback as AvenEvents[T]);
            (callback as Function)(...args);
        }) as AvenEvents[T];

        return this.on(event, wrappedCallback);
    }

    /**
     * Unsubscribe from an event.
     *
     * @param event - The event name
     * @param callback - The callback function to remove
     */
    off<T extends AvenEventName>(event: T, callback: AvenEvents[T]): void {
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    /**
     * Remove all event listeners.
     */
    removeAllListeners(): void {
        this.listeners.clear();
    }

    // ========================================================================
    // Public API - Getters
    // ========================================================================

    /**
     * Get the current connection status.
     */
    get status(): AvenStatus {
        return this._status;
    }

    /**
     * Get the current conversation state.
     */
    get conversationState(): ConversationState {
        return this._conversationState;
    }

    /**
     * Get the current error message (if any).
     */
    get error(): string | null {
        return this._error;
    }

    /**
     * Get the conversation history.
     */
    get history(): Message[] {
        return [...this._history];
    }

    /**
     * Check if the agent is currently connected.
     */
    get isConnected(): boolean {
        return this._status === "connected" && this.session !== null;
    }

    /**
     * Check if the AI is currently speaking.
     */
    get isAiSpeaking(): boolean {
        return this._conversationState === "ai_speaking";
    }

    /**
     * Check if the user is currently speaking.
     */
    get isUserSpeaking(): boolean {
        return this._conversationState === "user_speaking";
    }

    /**
     * Get the configured language code.
     */
    get language(): string {
        return this.config.language;
    }

    /**
     * Get the complete current state as a single object.
     */
    getState(): AvenState {
        return {
            status: this._status,
            conversationState: this._conversationState,
            error: this._error,
            history: [...this._history],
            isConnected: this.isConnected,
            isAiSpeaking: this.isAiSpeaking,
            isUserSpeaking: this.isUserSpeaking,
        };
    }

    // ========================================================================
    // Public API - Actions
    // ========================================================================

    /**
     * Connect to the voice agent and start a conversation.
     *
     * @throws Error if connection fails
     */
    async connect(): Promise<void> {
        if (this.session) {
            this.log("Already connected, ignoring connect call");
            return;
        }

        try {
            this.setStatus("connecting");
            this._error = null;

            // Create session with the agent
            // Only pass language to transcription if it's supported by OpenAI's API
            const transcriptionConfig = isTranscriptionSupported(
                this.config.language
            )
                ? {
                      inputAudioTranscription: {
                          model: "gpt-4o-mini-transcribe" as const,
                          language: this.config.language,
                      },
                  }
                : {
                      inputAudioTranscription: {
                          model: "gpt-4o-mini-transcribe" as const,
                      },
                  };

            this.session = new RealtimeSession(this.agent, {
                model: this.config.model,
                config: transcriptionConfig,
            });

            // Set up event listeners
            this.setupSessionListeners();

            // Connect using WebRTC with the provided client secret
            this.log("Connecting to OpenAI Realtime API...");
            await this.session.connect({ apiKey: this.config.clientSecret });

            this.setStatus("connected");
            this.emit("connected");

            // Initialize UI context if enabled
            if (this.config.ui.enabled) {
                await this.refreshDOM();

                // Start auto-update if configured (just stores context, doesn't send messages)
                if (this.config.ui.autoUpdate) {
                    this.startAutoUpdate();
                }
            }

            // Send greeting if configured (include UI context in greeting)
            if (this.config.autoGreet) {
                this.log("Sending greeting message");

                // Get language-specific greeting or use configured greeting
                const langGreeting = getLanguageGreeting(this.config.language);
                const languageName = getLanguageName(this.config.language);

                // Build greeting with language reinforcement
                let greeting =
                    this.config.greetingMessage ===
                    DEFAULT_CONFIG.greetingMessage
                        ? `[IMPORTANT: Respond in ${languageName} only. Say your greeting in ${languageName}.]\n\n${langGreeting}`
                        : `[IMPORTANT: Respond in ${languageName} only.]\n\n${this.config.greetingMessage}`;

                // Include DOM context with the greeting so AI has UI awareness
                if (this.config.ui.enabled && this._currentDOM) {
                    greeting = `${greeting}\n\n[Current UI state for reference - do not read this aloud, just use it to understand the page:]\n\`\`\`html\n${this._currentDOM}\n\`\`\``;
                }

                this.session.sendMessage(greeting);
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Failed to connect";
            this.log("Connection error:", errorMessage);
            this._error = errorMessage;
            this.setStatus("error");
            this.emit("error", errorMessage);
            throw error;
        }
    }

    /**
     * Disconnect from the voice agent and end the conversation.
     */
    disconnect(): void {
        if (this.session) {
            this.log("Disconnecting...");
            this.session.close();
            this.session = null;
        }

        this._history = [];
        this.setStatus("idle");
        this.setConversationState("idle");
        this.emit("disconnected");
        this.emit("historyChange", []);
    }

    /**
     * Interrupt the AI while it's speaking.
     */
    interrupt(): void {
        if (this.session) {
            this.log("Interrupting...");
            this.session.interrupt();
        }
    }

    /**
     * Send a text message to the agent.
     *
     * @param message - The text message to send
     */
    sendMessage(message: string): void {
        if (this.session) {
            this.log("Sending message:", message);
            this.session.sendMessage(message);
        } else {
            this.log("Cannot send message: not connected");
        }
    }

    /**
     * Toggle the connection state.
     */
    async toggle(): Promise<void> {
        if (this.isConnected) {
            this.disconnect();
        } else if (this._status === "idle" || this._status === "error") {
            await this.connect();
        }
    }

    /**
     * Destroy the agent instance and clean up all resources.
     */
    destroy(): void {
        this.stopAutoUpdate();
        this.disconnect();
        this.removeAllListeners();
    }

    // ========================================================================
    // Public API - UI Methods
    // ========================================================================

    /**
     * Update the DOM context manually.
     *
     * @param dom - The DOM Element or HTML string
     */
    async updateDOM(dom: string | Element): Promise<void> {
        if (typeof dom === "string") {
            this._currentDOM = dom;
        } else {
            this._currentDOM = await this.captureDOM(dom);
        }

        this.log("DOM updated:", this._currentDOM?.substring(0, 200) + "...");

        if (this.session && this._currentDOM) {
            this.sendDOMContext();
        }
    }

    /**
     * Refresh the DOM context from the configured root element.
     */
    async refreshDOM(): Promise<void> {
        if (!this.config.ui.enabled || !this.config.ui.rootElement) {
            this.log(
                "UI is not enabled or no root element, skipping DOM refresh"
            );
            return;
        }

        await this.updateDOM(this.config.ui.rootElement);
    }

    /**
     * Start auto-updating the DOM context.
     */
    startAutoUpdate(): void {
        if (this._autoUpdateTimer) {
            return;
        }

        this._autoUpdateTimer = setInterval(() => {
            this.refreshDOM();
        }, this.config.ui.autoUpdateInterval);

        this.log(
            "Auto-update started with interval:",
            this.config.ui.autoUpdateInterval
        );
    }

    /**
     * Stop auto-updating the DOM context.
     */
    stopAutoUpdate(): void {
        if (this._autoUpdateTimer) {
            clearInterval(this._autoUpdateTimer);
            this._autoUpdateTimer = null;
            this.log("Auto-update stopped");
        }
    }

    /**
     * Get the current DOM context.
     */
    get currentDOM(): string | null {
        return this._currentDOM;
    }

    /**
     * Check if UI mode is enabled.
     */
    get isUIEnabled(): boolean {
        return this.config.ui.enabled;
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    private setupSessionListeners(): void {
        if (!this.session) return;

        this.session.on("history_updated", (rawHistory: RealtimeItem[]) => {
            this.handleHistoryUpdate(rawHistory);
        });

        this.session.on("error", (error) => {
            let errorMessage: string;
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === "object" && error !== null) {
                errorMessage = JSON.stringify(error);
            } else {
                errorMessage = String(error) || "An error occurred";
            }
            this.log("Session error:", errorMessage);
            this._error = errorMessage;
            this.emit("error", errorMessage);
        });

        this.session.on("agent_start", () => {
            this.log("Agent started speaking");
            this.setConversationState("ai_speaking");
            this.emit("agentStart");
        });

        this.session.on("agent_end", () => {
            this.log("Agent stopped speaking");
            this.setConversationState("user_turn");
            this.emit("agentEnd");
        });

        this.session.on("audio", () => {
            this.setConversationState("user_speaking");
            this.emit("userAudio");
        });
    }

    private handleHistoryUpdate(rawHistory: RealtimeItem[]): void {
        const newHistory: Message[] = [];

        for (const item of rawHistory) {
            if (item.type === "message") {
                const content = item.content?.[0];
                if (!content) continue;

                let messageContent: MessageContent;

                if (
                    content.type === "input_text" ||
                    content.type === "output_text"
                ) {
                    messageContent = { type: "text", text: content.text || "" };
                } else if (
                    content.type === "input_audio" ||
                    content.type === "output_audio"
                ) {
                    messageContent = {
                        type: "audio",
                        transcript: content.transcript || null,
                    };
                } else {
                    continue;
                }

                const message: Message = {
                    id: item.itemId || `msg_${++this._messageIdCounter}`,
                    role: item.role as "user" | "assistant",
                    content: messageContent,
                    raw: item,
                    timestamp: new Date(),
                };

                newHistory.push(message);
            }
        }

        const previousLength = this._history.length;
        this._history = newHistory;

        if (newHistory.length > previousLength) {
            const newMessages = newHistory.slice(previousLength);
            for (const msg of newMessages) {
                const messageText = this.getMessageText(msg);
                this.log(`[${msg.role.toUpperCase()}]:`, messageText);
                this.emit("message", msg);
            }
        }

        this.emit("historyChange", [...newHistory]);
        this.emitStateChange();
    }

    private setStatus(status: AvenStatus): void {
        if (this._status !== status) {
            this._status = status;
            this.emit("statusChange", status);
            this.emitStateChange();

            if (status === "idle" || status === "error") {
                this.setConversationState("idle");
            }
        }
    }

    private setConversationState(state: ConversationState): void {
        if (this._conversationState !== state) {
            this._conversationState = state;
            this.emit("conversationStateChange", state);
            this.emitStateChange();
        }
    }

    private emitStateChange(): void {
        this.emit("stateChange", this.getState());
    }

    private emit<T extends AvenEventName>(
        event: T,
        ...args: Parameters<AvenEvents[T]>
    ): void {
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.forEach((callback) => {
                try {
                    (callback as Function)(...args);
                } catch (error) {
                    console.error(`Error in ${event} listener:`, error);
                }
            });
        }
    }

    private log(...args: unknown[]): void {
        if (this.config.debug) {
            console.log("[Aven]", ...args);
        }
    }

    // ========================================================================
    // Private UI Methods
    // ========================================================================

    private async captureDOM(element: Element): Promise<string | null> {
        try {
            const html = element.innerHTML;
            const result = await adaptiveD2Snap(
                html,
                this.config.ui.d2SnapOptions.maxTokens,
                5,
                {
                    assignUniqueIDs:
                        this.config.ui.d2SnapOptions.assignUniqueIDs,
                    debug: this.config.debug,
                }
            );

            return result.serializedHtml;
        } catch (error) {
            this.log("d2snap error, falling back to raw HTML:", error);
            return element.innerHTML;
        }
    }

    private sendDOMContext(): void {
        if (!this.session || !this._currentDOM) {
            return;
        }

        // Store DOM context - it will be included when user speaks
        // Don't send as a message that triggers a response
        this.log("DOM context updated (stored for next interaction)");
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    /**
     * Get the text content of a message.
     *
     * @param message - The message to extract text from
     * @returns The text content or transcript
     */
    getMessageText(message: Message): string {
        if (message.content.type === "text") {
            return message.content.text;
        }
        return message.content.transcript || "(audio)";
    }

    /**
     * Execute a UI action's code.
     *
     * @param action - The UI action to execute
     * @returns The result of the execution or error
     */
    async executeAction(
        action: UIAction
    ): Promise<{ success: boolean; result?: unknown; error?: string }> {
        if (!action.outputCode) {
            return { success: true, result: null };
        }

        try {
            const fn = new Function(action.outputCode);
            const result = fn();
            this.log("Action executed:", action.actionDescription, result);
            return { success: true, result };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            this.log("Action execution failed:", errorMessage);
            return { success: false, error: errorMessage };
        }
    }
}
