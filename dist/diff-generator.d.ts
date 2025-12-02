import { ChangedFile } from './file-detector';
export interface DiffOptions {
    contextLines: number;
    maxLines: number;
}
export interface FileDiff {
    file: ChangedFile;
    diff: string;
    truncated: boolean;
    lineCount: number;
}
/**
 * Generates git diffs for the specified changed files
 */
export declare function generateDiffs(files: ChangedFile[], options: DiffOptions): Promise<FileDiff[]>;
/**
 * Formats a diff as a markdown code block
 */
export declare function formatDiffAsCodeBlock(diff: string): string;
