import { FileDiff } from './diff-generator';
export interface TemplateContext {
    filename: string;
    file_path: string;
    file_link: string;
    diff: string;
    diff_raw: string;
    commit_sha: string;
    commit_sha_short: string;
    commit_link: string;
    commit_message: string;
    commit_date: string;
    author: string;
    pull_request: boolean;
    pr_number: string;
    pr_link: string;
    pr_title: string;
    branch: string;
    change_type: string;
    previous_path: string;
}
export interface RenderOptions {
    titleTemplate: string;
    bodyTemplate: string;
    includeDiff: boolean;
    includeFileLink: boolean;
    includeCommitLink: boolean;
    includePrLink: boolean;
}
export interface RenderedIssue {
    title: string;
    body: string;
}
/**
 * Renders issue title and body from templates
 */
export declare function renderIssue(fileDiff: FileDiff, options: RenderOptions, context: Partial<TemplateContext>): RenderedIssue;
/**
 * Gets the default template content
 */
export declare function getDefaultTemplate(): string;
