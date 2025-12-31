// Type declarations for @webfuse-com/d2snap
declare module "@webfuse-com/d2snap" {
    export interface D2SnapOptions {
        assignUniqueIDs?: boolean;
        debug?: boolean;
        skipMarkdownTranslation?: boolean;
        keepUnknownElements?: boolean;
    }

    export interface Snapshot {
        serializedHtml: string;
        tokenCount?: number;
    }

    export function adaptiveD2Snap(
        element: Dom | Element | string,
        maxTokens: number,
        maxIterations?: number,
        options?: D2SnapOptions
    ): Promise<Snapshot>;

    export function d2snap(
        html: string,
        options?: D2SnapOptions
    ): Promise<Snapshot>;
}
