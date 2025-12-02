import * as core from '@actions/core';
import * as github from '@actions/github';
import { exec } from 'child_process';
import { promisify } from 'util';
import { detectChangedFiles, parsePatterns, FileDetectorOptions } from './file-detector';
import { generateDiffs, DiffOptions } from './diff-generator';
import { renderIssue, RenderOptions, TemplateContext } from './template-renderer';
import { createIssues, resolveMilestone, parseCommaSeparatedList, IssueOptions } from './issue-creator';

const execAsync = promisify(exec);

interface ActionInputs {
  // File detection
  filePattern: string;
  filePatterns: string;
  excludePattern: string;
  caseSensitive: boolean;
  
  // Issue content
  issueTitleTemplate: string;
  issueBodyTemplate: string;
  includeDiff: boolean;
  diffContextLines: number;
  maxDiffLines: number;
  includeFileLink: boolean;
  includeCommitLink: boolean;
  includePrLink: boolean;
  
  // Issue metadata
  labels: string;
  assignees: string;
  milestone: string;
  
  // Behavior
  createOnNewFiles: boolean;
  createOnDeletedFiles: boolean;
  dryRun: boolean;
  githubToken: string;
}

async function run(): Promise<void> {
  try {
    // Validate event type
    const eventName = github.context.eventName;
    if (eventName !== 'push' && eventName !== 'pull_request') {
      core.warning(`This action is designed for 'push' and 'pull_request' events. Current event: '${eventName}'. Exiting gracefully.`);
      setEmptyOutputs();
      return;
    }

    core.info(`🚀 Spec Ops Action running on '${eventName}' event`);

    // Parse inputs
    const inputs = parseInputs();
    
    // Build file detection options
    const patterns = parsePatterns(inputs.filePattern, inputs.filePatterns);
    if (patterns.length === 0) {
      patterns.push('**/*specification*.md'); // Default pattern
    }
    
    const excludePatterns = inputs.excludePattern 
      ? parsePatterns(inputs.excludePattern, undefined)
      : [];

    core.info(`📁 Looking for files matching: ${patterns.join(', ')}`);
    if (excludePatterns.length > 0) {
      core.info(`   Excluding: ${excludePatterns.join(', ')}`);
    }

    const fileDetectorOptions: FileDetectorOptions = {
      patterns,
      excludePatterns,
      caseSensitive: inputs.caseSensitive,
      createOnNewFiles: inputs.createOnNewFiles,
      createOnDeletedFiles: inputs.createOnDeletedFiles,
    };

    // Detect changed specification files
    const changedFiles = await detectChangedFiles(fileDetectorOptions);
    
    if (changedFiles.length === 0) {
      core.info('📭 No specification files changed. Nothing to do.');
      setEmptyOutputs();
      return;
    }

    core.info(`📋 Found ${changedFiles.length} changed specification file(s):`);
    changedFiles.forEach(f => core.info(`   - ${f.path} (${f.changeType})`));

    // Set files-detected output early
    core.setOutput('files-detected', JSON.stringify(changedFiles.map(f => f.path)));
    core.setOutput('files-count', changedFiles.length.toString());

    // Generate diffs
    const diffOptions: DiffOptions = {
      contextLines: inputs.diffContextLines,
      maxLines: inputs.maxDiffLines,
    };
    
    const diffs = await generateDiffs(changedFiles, diffOptions);

    // Get context for templates
    const templateContext = await buildContextFromEnvironment();

    // Render issues
    const renderOptions: RenderOptions = {
      titleTemplate: inputs.issueTitleTemplate,
      bodyTemplate: inputs.issueBodyTemplate,
      includeDiff: inputs.includeDiff,
      includeFileLink: inputs.includeFileLink,
      includeCommitLink: inputs.includeCommitLink,
      includePrLink: inputs.includePrLink,
    };

    const issuesToCreate = diffs.map(fileDiff => ({
      rendered: renderIssue(fileDiff, renderOptions, templateContext),
      filePath: fileDiff.file.path,
    }));

    // Resolve milestone if provided
    const milestoneNumber = inputs.milestone
      ? await resolveMilestone(inputs.githubToken, inputs.milestone)
      : undefined;

    // Create issues
    const issueOptions: IssueOptions = {
      labels: parseCommaSeparatedList(inputs.labels),
      assignees: parseCommaSeparatedList(inputs.assignees),
      milestone: milestoneNumber,
    };

    const results = await createIssues(
      inputs.githubToken,
      issuesToCreate,
      issueOptions,
      inputs.dryRun
    );

    // Process results
    const successfulIssues = results.filter(r => r.success && r.issue);
    const failedIssues = results.filter(r => !r.success);

    // Set outputs
    const issueNumbers = successfulIssues.map(r => r.issue!.number);
    core.setOutput('issues-created', JSON.stringify(issueNumbers));
    core.setOutput('issues-count', successfulIssues.length.toString());

    // Summary
    core.info('');
    core.info('📊 Summary:');
    core.info(`   Files detected: ${changedFiles.length}`);
    core.info(`   Issues created: ${successfulIssues.length}`);
    
    if (failedIssues.length > 0) {
      core.warning(`   Failed to create: ${failedIssues.length}`);
      failedIssues.forEach(f => core.warning(`      - ${f.filePath}: ${f.error}`));
    }

    if (inputs.dryRun) {
      core.info('   (Dry run mode - no actual issues were created)');
    }

    // Fail if all issues failed to create
    if (successfulIssues.length === 0 && changedFiles.length > 0 && !inputs.dryRun) {
      core.setFailed('Failed to create any issues. Check the logs for details.');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Action failed: ${errorMessage}`);
  }
}

function parseInputs(): ActionInputs {
  return {
    // File detection
    filePattern: core.getInput('file-pattern'),
    filePatterns: core.getInput('file-patterns'),
    excludePattern: core.getInput('exclude-pattern'),
    caseSensitive: core.getBooleanInput('case-sensitive'),
    
    // Issue content
    issueTitleTemplate: core.getInput('issue-title-template') || 'Specification Change: {{ filename }}',
    issueBodyTemplate: core.getInput('issue-body-template'),
    includeDiff: core.getBooleanInput('include-diff'),
    diffContextLines: parseInt(core.getInput('diff-context-lines') || '3', 10),
    maxDiffLines: parseInt(core.getInput('max-diff-lines') || '500', 10),
    includeFileLink: core.getBooleanInput('include-file-link'),
    includeCommitLink: core.getBooleanInput('include-commit-link'),
    includePrLink: core.getBooleanInput('include-pr-link'),
    
    // Issue metadata
    labels: core.getInput('labels') || 'spec-change',
    assignees: core.getInput('assignees'),
    milestone: core.getInput('milestone'),
    
    // Behavior
    createOnNewFiles: core.getBooleanInput('create-on-new-files'),
    createOnDeletedFiles: core.getBooleanInput('create-on-deleted-files'),
    dryRun: core.getBooleanInput('dry-run'),
    githubToken: core.getInput('github-token') || process.env.GITHUB_TOKEN || '',
  };
}

async function buildContextFromEnvironment(): Promise<Partial<TemplateContext>> {
  const context: Partial<TemplateContext> = {
    commit_sha: github.context.sha,
    commit_sha_short: github.context.sha.substring(0, 7),
    branch: process.env.GITHUB_REF_NAME || github.context.ref.replace('refs/heads/', ''),
  };

  // Get commit information
  try {
    const { stdout: commitMessage } = await execAsync('git log -1 --format=%s');
    context.commit_message = commitMessage.trim();
    
    const { stdout: commitDate } = await execAsync('git log -1 --format=%ci');
    context.commit_date = commitDate.trim();
    
    const { stdout: authorName } = await execAsync('git log -1 --format=%an');
    // Try to get GitHub username from the commit, fall back to author name
    context.author = process.env.GITHUB_ACTOR || authorName.trim();
  } catch (error) {
    core.debug(`Could not get commit info: ${error}`);
  }

  // Get PR information if this is a pull request
  if (github.context.eventName === 'pull_request') {
    const prNumber = github.context.payload.pull_request?.number;
    if (prNumber) {
      context.pr_number = prNumber.toString();
      context.pr_title = github.context.payload.pull_request?.title || '';
    }
  }

  return context;
}

function setEmptyOutputs(): void {
  core.setOutput('issues-created', '[]');
  core.setOutput('issues-count', '0');
  core.setOutput('files-detected', '[]');
  core.setOutput('files-count', '0');
}

run();
