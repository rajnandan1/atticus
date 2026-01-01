/**
 * Atticus - A framework-agnostic voice agent library for voice-controlled UI interactions
 *
 * @packageDocumentation
 */

export { Atticus } from "./atticus";
export type {
    AtticusConfig,
    AtticusStatus,
    ConversationState,
    AtticusState,
    Message,
    MessageContent,
    AtticusEvents,
    AtticusEventName,
    UIAction,
    UIActionType,
    D2SnapOptions,
    UIConfig,
    AgentConfig,
    AtticusVoice,
} from "./types";

export {
    LANGUAGE_NAMES,
    LANGUAGE_GREETINGS,
    SUPPORTED_TRANSCRIPTION_LANGUAGES,
    getLanguageName,
    getLanguageGreeting,
    isTranscriptionSupported,
} from "./languages";
