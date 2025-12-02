import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import { ChangedFile } from './file-detector';
import { FileDiff, formatDiffAsCodeBlock } from './diff-generator';

export interface TemplateContext {
  // File information
  filename: string;
  file_path: string;
  file_link: string;
  
  // Diff information
  diff: string;
  diff_raw: string;
  
  // Commit information
  commit_sha: string;
  commit_sha_short: string;
  commit_link: string;
  commit_message: string;
  commit_date: string;
  author: string;
  
  // Pull request information
  pull_request: boolean;
  pr_number: string;
  pr_link: string;
  pr_title: string;
  
  // Branch information
  branch: string;
  
  // Change information
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
  sanitizeDiff: boolean;
}

export interface RenderedIssue {
  title: string;
  body: string;
}

// Default issue body template
const DEFAULT_TEMPLATE = `## Specification Changed

A specification file has been modified and may require implementation changes.

**File:** {{ file_path }}
**Changed in:** {{ commit_sha_short }} ({{ commit_link }})
{{#if pull_request}}
**Pull Request:** {{ pr_link }}
{{/if}}
**Author:** @{{ author }}
**Date:** {{ commit_date }}

## Changes

{{{ diff }}}

## Checklist

- [ ] Reviewed specification change
- [ ] Determined if code changes are required
- [ ] Implementation complete (or confirmed no changes needed)

---
*This issue was automatically created by [spec-ops-action](https://github.com/spec-ops-method/spec-ops-action)*`;

/**
 * Renders issue title and body from templates
 */
export function renderIssue(
  fileDiff: FileDiff,
  options: RenderOptions,
  context: Partial<TemplateContext>
): RenderedIssue {
  // Build full template context
  const fullContext = buildTemplateContext(fileDiff, context, options);
  
  // Compile and render title
  const titleCompiled = Handlebars.compile(options.titleTemplate);
  const title = titleCompiled(fullContext);
  
  // Get body template
  const bodyTemplateContent = resolveBodyTemplate(options.bodyTemplate);
  
  // Compile and render body
  const bodyCompiled = Handlebars.compile(bodyTemplateContent);
  const body = bodyCompiled(fullContext);
  
  return { title, body };
}

/**
 * Builds the full template context with all available variables
 */
function buildTemplateContext(
  fileDiff: FileDiff,
  baseContext: Partial<TemplateContext>,
  options: RenderOptions
): TemplateContext {
  const { file } = fileDiff;
  
  // Get filename from path
  const filename = path.basename(file.path);
  
  // Format diff if included
  const formattedDiff = options.includeDiff ? formatDiffAsCodeBlock(fileDiff.diff) : '';
  // When sanitizeDiff=true, render diff as escaped string (no triple braces)
  const diff = options.sanitizeDiff ? formattedDiff : formattedDiff;
  const diff_raw = options.includeDiff ? fileDiff.diff : '';
  
  // Build file link
  const repoUrl = getRepoUrl();
  const commitSha = baseContext.commit_sha || process.env.GITHUB_SHA || '';
  const file_link = options.includeFileLink 
    ? `${repoUrl}/blob/${commitSha}/${file.path}`
    : '';
  
  // Build commit link
  const commit_link = options.includeCommitLink
    ? `${repoUrl}/commit/${commitSha}`
    : '';
  
  // Build PR link
  const prNumber = baseContext.pr_number || '';
  const pr_link = options.includePrLink && prNumber
    ? `${repoUrl}/pull/${prNumber}`
    : '';
  
  return {
    // File information
    filename,
    file_path: file.path,
    file_link,
    
    // Diff information
    diff,
    diff_raw,
    
    // Commit information
    commit_sha: commitSha,
    commit_sha_short: commitSha.substring(0, 7),
    commit_link,
    commit_message: baseContext.commit_message || '',
    commit_date: baseContext.commit_date || new Date().toISOString(),
    author: baseContext.author || '',
    
    // Pull request information
    pull_request: !!prNumber,
    pr_number: prNumber,
    pr_link,
    pr_title: baseContext.pr_title || '',
    
    // Branch information
    branch: baseContext.branch || process.env.GITHUB_REF_NAME || '',
    
    // Change information
    change_type: file.changeType,
    previous_path: file.previousPath || '',
  };
}

/**
 * Resolves the body template - either from a file path or returns inline template
 */
function resolveBodyTemplate(templateInput: string): string {
  if (!templateInput || templateInput.trim() === '') {
    return DEFAULT_TEMPLATE;
  }
  
  // Check if it's a file path
  if (templateInput.endsWith('.md') || templateInput.includes('/')) {
    try {
      const templatePath = path.resolve(process.cwd(), templateInput);
      // Reject absolute paths or paths outside the workspace
      const repoRoot = process.cwd();
      if (!templatePath.startsWith(repoRoot)) {
        core.warning(`Template path resolves outside repo root: ${templatePath}. Using default template.`);
        return DEFAULT_TEMPLATE;
      }
      if (fs.existsSync(templatePath)) {
        core.debug(`Loading template from file: ${templatePath}`);
        return fs.readFileSync(templatePath, 'utf-8');
      } else {
        core.warning(`Template file not found: ${templatePath}, using default template`);
        return DEFAULT_TEMPLATE;
      }
    } catch (error) {
      core.warning(`Error reading template file: ${error}, using default template`);
      return DEFAULT_TEMPLATE;
    }
  }
  
  // Treat as inline template
  return templateInput;
}

/**
 * Gets the repository URL from environment
 */
function getRepoUrl(): string {
  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const repository = process.env.GITHUB_REPOSITORY || '';
  return `${serverUrl}/${repository}`;
}

/**
 * Gets the default template content
 */
export function getDefaultTemplate(): string {
  return DEFAULT_TEMPLATE;
}
