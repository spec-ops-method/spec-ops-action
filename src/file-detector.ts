import * as core from '@actions/core';
import { exec } from 'child_process';
import { promisify } from 'util';
import micromatch from 'micromatch';

const execAsync = promisify(exec);

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
export async function detectChangedFiles(
  options: FileDetectorOptions
): Promise<ChangedFile[]> {
  const { patterns, excludePatterns, caseSensitive, createOnNewFiles, createOnDeletedFiles } = options;

  // Get the list of changed files from git
  const changedFiles = await getChangedFilesFromGit();
  
  core.debug(`Found ${changedFiles.length} changed files in git`);
  changedFiles.forEach(f => core.debug(`  ${f.changeType}: ${f.path}`));

  // Filter files based on patterns
  const matchedFiles = filterFilesByPatterns(
    changedFiles,
    patterns,
    excludePatterns,
    caseSensitive
  );

  core.debug(`After pattern filtering: ${matchedFiles.length} files match`);

  // Filter based on change type settings
  const filteredFiles = matchedFiles.filter(file => {
    if (file.changeType === 'added' && !createOnNewFiles) {
      core.debug(`Skipping new file (create-on-new-files=false): ${file.path}`);
      return false;
    }
    if (file.changeType === 'deleted' && !createOnDeletedFiles) {
      core.debug(`Skipping deleted file (create-on-deleted-files=false): ${file.path}`);
      return false;
    }
    return true;
  });

  return filteredFiles;
}

/**
 * Gets the list of changed files from git based on the event context
 */
async function getChangedFilesFromGit(): Promise<ChangedFile[]> {
  const eventName = process.env.GITHUB_EVENT_NAME;
  const baseSha = process.env.GITHUB_BASE_REF 
    ? `origin/${process.env.GITHUB_BASE_REF}` 
    : 'HEAD~1';
  
  let diffCommand: string;
  
  if (eventName === 'pull_request') {
    // For PRs, diff against the base branch
    // First fetch the base ref to ensure we have it
    try {
      await execAsync(`git fetch origin ${process.env.GITHUB_BASE_REF} --depth=1`);
    } catch (error) {
      core.debug(`Could not fetch base ref, continuing with existing refs: ${error}`);
    }
    diffCommand = `git diff --name-status ${baseSha}...HEAD`;
  } else {
    // For push events, diff against the parent commit
    diffCommand = 'git diff --name-status HEAD~1 HEAD';
  }

  core.debug(`Running: ${diffCommand}`);

  try {
    const { stdout } = await execAsync(diffCommand);
    return parseGitDiffNameStatus(stdout);
  } catch (error) {
    // If there's no parent commit (initial commit), get all files
    core.debug(`Diff command failed, trying to list all files: ${error}`);
    const { stdout } = await execAsync('git ls-files');
    return stdout
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(path => ({ path, changeType: 'added' as const }));
  }
}

/**
 * Parses the output of git diff --name-status
 */
function parseGitDiffNameStatus(output: string): ChangedFile[] {
  const lines = output.trim().split('\n').filter(line => line.length > 0);
  const files: ChangedFile[] = [];

  for (const line of lines) {
    const parts = line.split('\t');
    const status = parts[0];
    const path = parts[1];

    if (!path) continue;

    let changeType: ChangedFile['changeType'];
    let previousPath: string | undefined;

    if (status.startsWith('R')) {
      // Renamed file: R100\told-name\tnew-name
      changeType = 'renamed';
      previousPath = path;
      const newPath = parts[2];
      if (newPath) {
        files.push({ path: newPath, changeType, previousPath });
      }
      continue;
    } else if (status === 'A') {
      changeType = 'added';
    } else if (status === 'D') {
      changeType = 'deleted';
    } else if (status === 'M' || status.startsWith('M')) {
      changeType = 'modified';
    } else {
      // Default to modified for other statuses (C for copied, etc.)
      changeType = 'modified';
    }

    files.push({ path, changeType, previousPath });
  }

  return files;
}

/**
 * Filters files based on include and exclude glob patterns
 */
function filterFilesByPatterns(
  files: ChangedFile[],
  includePatterns: string[],
  excludePatterns: string[],
  caseSensitive: boolean
): ChangedFile[] {
  const matchOptions = { nocase: !caseSensitive };

  return files.filter(file => {
    // Check if file matches any include pattern
    const included = micromatch.isMatch(file.path, includePatterns, matchOptions);
    
    if (!included) {
      return false;
    }

    // Check if file matches any exclude pattern
    if (excludePatterns.length > 0) {
      const excluded = micromatch.isMatch(file.path, excludePatterns, matchOptions);
      if (excluded) {
        core.debug(`File excluded by pattern: ${file.path}`);
        return false;
      }
    }

    return true;
  });
}

/**
 * Parses input patterns from action inputs
 * Handles both single patterns and multi-line pattern lists
 */
export function parsePatterns(
  singlePattern: string | undefined,
  multiPattern: string | undefined
): string[] {
  const patterns: string[] = [];

  if (multiPattern) {
    // Multi-line patterns take precedence
    const lines = multiPattern.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    patterns.push(...lines);
  } else if (singlePattern) {
    patterns.push(singlePattern);
  }

  return patterns;
}
