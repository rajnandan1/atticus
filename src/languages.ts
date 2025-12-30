// ============================================================================
// Language Code Mapping
// ============================================================================

/**
 * Map of language codes to their full names.
 */
export const LANGUAGE_NAMES: Record<string, string> = {
    en: "English",
    hi: "Hindi",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    ar: "Arabic",
    bn: "Bengali",
    pa: "Punjabi",
    ta: "Tamil",
    te: "Telugu",
    mr: "Marathi",
    gu: "Gujarati",
    kn: "Kannada",
    ml: "Malayalam",
    th: "Thai",
    vi: "Vietnamese",
    id: "Indonesian",
    ms: "Malay",
    tr: "Turkish",
    pl: "Polish",
    nl: "Dutch",
    sv: "Swedish",
    da: "Danish",
    no: "Norwegian",
    fi: "Finnish",
    cs: "Czech",
    sk: "Slovak",
    hu: "Hungarian",
    ro: "Romanian",
    bg: "Bulgarian",
    uk: "Ukrainian",
    el: "Greek",
    he: "Hebrew",
    fa: "Persian",
    ur: "Urdu",
    sw: "Swahili",
};

/**
 * Languages officially supported by OpenAI's transcription API.
 * Only these language codes can be passed to inputAudioTranscription.language
 */
export const SUPPORTED_TRANSCRIPTION_LANGUAGES = new Set([
    "af",
    "ar",
    "az",
    "be",
    "bg",
    "bs",
    "ca",
    "cs",
    "cy",
    "da",
    "de",
    "el",
    "en",
    "es",
    "et",
    "fa",
    "fi",
    "fr",
    "gl",
    "he",
    "hi",
    "hr",
    "hu",
    "hy",
    "id",
    "is",
    "it",
    "iw",
    "ja",
    "kk",
    "kn",
    "ko",
    "lt",
    "lv",
    "mi",
    "mk",
    "mr",
    "ms",
    "ne",
    "nl",
    "no",
    "pl",
    "pt",
    "ro",
    "ru",
    "sk",
    "sl",
    "sr",
    "sv",
    "sw",
    "ta",
    "th",
    "tl",
    "tr",
    "uk",
    "ur",
    "vi",
    "zh",
]);

/**
 * Native greetings for each supported language.
 */
export const LANGUAGE_GREETINGS: Record<string, string> = {
    en: "Hello!",
    hi: "नमस्ते!",
    es: "¡Hola!",
    fr: "Bonjour!",
    de: "Hallo!",
    it: "Ciao!",
    pt: "Olá!",
    ru: "Привет!",
    ja: "こんにちは!",
    ko: "안녕하세요!",
    zh: "你好!",
    ar: "مرحبا!",
    bn: "নমস্কার!",
    pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ!",
    ta: "வணக்கம்!",
    te: "నమస్కారం!",
    mr: "नमस्कार!",
    gu: "નમસ્તે!",
    kn: "ನಮಸ್ಕಾರ!",
    ml: "നമസ്കാരം!",
    th: "สวัสดี!",
    vi: "Xin chào!",
    id: "Halo!",
    ms: "Hai!",
    tr: "Merhaba!",
    pl: "Cześć!",
    nl: "Hallo!",
    sv: "Hej!",
    da: "Hej!",
    no: "Hei!",
    fi: "Hei!",
    cs: "Ahoj!",
    sk: "Ahoj!",
    hu: "Szia!",
    ro: "Salut!",
    bg: "Здравей!",
    uk: "Привіт!",
    el: "Γεια!",
    he: "שלום!",
    fa: "سلام!",
    ur: "السلام علیکم!",
    sw: "Jambo!",
};

/**
 * Get the full name of a language from its code.
 * @param code - Language code (e.g., 'en', 'hi')
 * @returns The full language name or the code if not found
 */
export function getLanguageName(code: string): string {
    return LANGUAGE_NAMES[code] || code;
}

/**
 * Get the native greeting for a language.
 * @param code - Language code (e.g., 'en', 'hi')
 * @returns The native greeting or "Hello!" if not found
 */
export function getLanguageGreeting(code: string): string {
    return LANGUAGE_GREETINGS[code] || "Hello!";
}

/**
 * Check if a language is supported for transcription.
 * @param code - Language code to check
 * @returns True if the language is supported for transcription
 */
export function isTranscriptionSupported(code: string): boolean {
    return SUPPORTED_TRANSCRIPTION_LANGUAGES.has(code);
}
