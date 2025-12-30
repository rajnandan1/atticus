/**
 * Aven - A framework-agnostic voice agent library for voice-controlled UI interactions
 *
 * @packageDocumentation
 */

export { Aven } from "./aven";
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
    AgentConfig,
    AvenVoice,
} from "./types";

export {
    LANGUAGE_NAMES,
    LANGUAGE_GREETINGS,
    SUPPORTED_TRANSCRIPTION_LANGUAGES,
    getLanguageName,
    getLanguageGreeting,
    isTranscriptionSupported,
} from "./languages";
