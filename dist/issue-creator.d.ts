import { RenderedIssue } from './template-renderer';
export interface IssueOptions {
    labels: string[];
    assignees: string[];
    milestone?: number;
}
export interface CreatedIssue {
    number: number;
    url: string;
    title: string;
}
export interface IssueCreationResult {
    success: boolean;
    issue?: CreatedIssue;
    error?: string;
    filePath: string;
}
/**
 * Creates GitHub issues for the rendered issues
 */
export declare function createIssues(token: string, issues: Array<{
    rendered: RenderedIssue;
    filePath: string;
}>, options: IssueOptions, dryRun: boolean): Promise<IssueCreationResult[]>;
/**
 * Resolves a milestone name to its number
 */
export declare function resolveMilestone(token: string, milestoneInput: string): Promise<number | undefined>;
/**
 * Parses comma-separated list into array, trimming whitespace
 */
export declare function parseCommaSeparatedList(input: string | undefined): string[];
