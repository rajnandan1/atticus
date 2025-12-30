import type { RealtimeItem } from "@openai/agents/realtime";

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for the AI agent's behavior and personality.
 */
export interface AgentConfig {
    /** The name of the agent (used for display/logging purposes) */
    name: string;
    /** System instructions that define the agent's behavior and personality */
    instructions: string;
}

/**
 * D2Snap options for DOM compression.
 */
export interface D2SnapOptions {
    /** Maximum tokens for adaptive compression @default 4096 */
    maxTokens?: number;
    /** Assign unique IDs to interactive elements @default true */
    assignUniqueIDs?: boolean;
}

/**
 * Configuration for UI awareness.
 */
export interface UIConfig {
    /**
     * Whether to enable UI-aware interactions.
     * When enabled, the agent can understand and interact with the DOM.
     */
    enabled: boolean;

    /**
     * The root DOM element to capture.
     * The library will use element.innerHTML and compress it with d2snap.
     *
     * @example document.body
     * @example document.getElementById('app')
     */
    rootElement: Element;

    /**
     * D2Snap options for DOM compression.
     */
    d2SnapOptions?: D2SnapOptions;

    /**
     * Whether to automatically update DOM context periodically.
     * @default false
     */
    autoUpdate?: boolean;

    /**
     * Interval in milliseconds for auto-updating DOM context.
     * Only used if autoUpdate is true.
     * @default 5000
     */
    autoUpdateInterval?: number;
}

/**
 * Configuration options for Aven Voice Agent.
 */
export interface AvenConfig {
    /**
     * The OpenAI client secret (ephemeral key) for the Realtime API.
     * Obtain this from your backend server.
     *
     * @example 'ek_...'
     */
    clientSecret: string;

    /**
     * Configuration for the AI agent.
     */
    agent: AgentConfig;

    /**
     * The language for the voice conversation.
     * The agent will speak and understand this language.
     *
     * @example 'en' (English)
     * @example 'hi' (Hindi)
     * @example 'es' (Spanish)
     * @example 'fr' (French)
     * @default 'en'
     */
    language?: string;

    /**
     * The OpenAI model to use for realtime conversations.
     * @default 'gpt-4o-realtime-preview'
     */
    model?: string;

    /**
     * Whether to automatically send a greeting message when connected.
     * @default true
     */
    autoGreet?: boolean;

    /**
     * The initial message to send when connected (if autoGreet is true).
     * @default 'Hello!'
     */
    greetingMessage?: string;

    /**
     * Enable debug logging.
     * @default false
     */
    debug?: boolean;

    /**
     * If true, UI actions will not be automatically executed.
     * The 'action' event will still be emitted for you to handle manually.
     * @default false
     */
    doNotExecuteActions?: boolean;

    /**
     * Configuration for UI-aware interactions.
     * When enabled, the agent can understand and interact with the page's DOM.
     */
    ui?: UIConfig;
}

// ============================================================================
// State Types
// ============================================================================

/**
 * The connection status of the voice agent.
 *
 * - `idle`: Not connected, ready to connect
 * - `connecting`: Currently establishing connection
 * - `connected`: Successfully connected and ready for conversation
 * - `error`: Connection failed or encountered an error
 */
export type AvenStatus = "idle" | "connecting" | "connected" | "error";

/**
 * The current state of the conversation.
 *
 * - `idle`: No active conversation
 * - `ai_speaking`: The AI assistant is currently speaking
 * - `user_turn`: Waiting for the user to speak
 * - `user_speaking`: The user is currently speaking
 */
export type ConversationState =
    | "idle"
    | "ai_speaking"
    | "user_turn"
    | "user_speaking";

/**
 * The complete state of the voice agent at any given moment.
 */
export interface AvenState {
    /** Current connection status */
    status: AvenStatus;
    /** Current conversation state */
    conversationState: ConversationState;
    /** Error message if status is 'error', null otherwise */
    error: string | null;
    /** Conversation history */
    history: Message[];
    /** Whether the agent is currently connected */
    isConnected: boolean;
    /** Whether the AI is currently speaking */
    isAiSpeaking: boolean;
    /** Whether the user is currently speaking */
    isUserSpeaking: boolean;
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Content types that can appear in a message.
 */
export type MessageContent =
    | { type: "text"; text: string }
    | { type: "audio"; transcript: string | null };

/**
 * A parsed message from the conversation history.
 */
export interface Message {
    /** Unique identifier for this message */
    id: string;
    /** Who sent this message */
    role: "user" | "assistant";
    /** The content of the message */
    content: MessageContent;
    /** The original raw item from the API */
    raw: RealtimeItem;
    /** Timestamp when this message was created */
    timestamp: Date;
}

// ============================================================================
// UI Action Types
// ============================================================================

/**
 * A UI action requested by the agent.
 * Contains both the spoken response and executable code.
 */
export interface UIAction {
    /** Unique identifier for this action */
    id: string;
    /** The text the agent spoke (explanation of the action) */
    outputText: string;
    /** JavaScript code to execute the UI interaction */
    outputCode: string | null;
    /** Description of what the code does */
    actionDescription: string | null;
    /** The element selector/identifier being targeted */
    targetElement: string | null;
    /** Type of action (click, type, scroll, etc.) */
    actionType: UIActionType | null;
    /** Timestamp when this action was created */
    timestamp: Date;
}

/**
 * Types of UI actions the agent can perform.
 */
export type UIActionType =
    | "click"
    | "type"
    | "scroll"
    | "focus"
    | "hover"
    | "select"
    | "navigate"
    | "read"
    | "other";

// ============================================================================
// Event Types
// ============================================================================

/**
 * All events emitted by Aven.
 *
 * Subscribe to these events using `aven.on(eventName, callback)`.
 */
export interface AvenEvents {
    /**
     * Emitted when the connection status changes.
     * @param status - The new status
     */
    statusChange: (status: AvenStatus) => void;

    /**
     * Emitted when the conversation state changes.
     * @param state - The new conversation state
     */
    conversationStateChange: (state: ConversationState) => void;

    /**
     * Emitted when an error occurs.
     * @param error - The error message
     */
    error: (error: string) => void;

    /**
     * Emitted when a new message is added to the history.
     * @param message - The new message
     */
    message: (message: Message) => void;

    /**
     * Emitted when the conversation history is updated.
     * @param history - The complete conversation history
     */
    historyChange: (history: Message[]) => void;

    /**
     * Emitted when the complete state changes.
     * Useful for frameworks that want a single state object.
     * @param state - The complete current state
     */
    stateChange: (state: AvenState) => void;

    /**
     * Emitted when the agent starts speaking.
     */
    agentStart: () => void;

    /**
     * Emitted when the agent stops speaking.
     */
    agentEnd: () => void;

    /**
     * Emitted when user audio is detected.
     */
    userAudio: () => void;

    /**
     * Emitted when successfully connected.
     */
    connected: () => void;

    /**
     * Emitted when disconnected.
     */
    disconnected: () => void;

    /**
     * Emitted when the agent requests a UI action.
     * The developer should execute the code or handle the action.
     * @param action - The UI action to perform
     */
    action: (action: UIAction) => void;
}

/**
 * Event names for Aven.
 */
export type AvenEventName = keyof AvenEvents;
