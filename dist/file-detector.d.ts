export interface ChangedFile {
    path: string;
    changeType: 'added' | 'modified' | 'deleted' | 'renamed';
    previousPath?: string;
}
export interface FileDetectorOptions {
    patterns: string[];
    excludePatterns: string[];
    caseSensitive: boolean;
    createOnNewFiles: boolean;
    createOnDeletedFiles: boolean;
}
/**
 * Detects which specification files have changed in the current commit or PR
 */
export declare function detectChangedFiles(options: FileDetectorOptions): Promise<ChangedFile[]>;
/**
 * Parses input patterns from action inputs
 * Handles both single patterns and multi-line pattern lists
 */
export declare function parsePatterns(singlePattern: string | undefined, multiPattern: string | undefined): string[];
