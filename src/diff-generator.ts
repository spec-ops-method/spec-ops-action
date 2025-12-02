import * as core from '@actions/core';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ChangedFile } from './file-detector';

const execAsync = promisify(exec);

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
export async function generateDiffs(
  files: ChangedFile[],
  options: DiffOptions
): Promise<FileDiff[]> {
  const diffs: FileDiff[] = [];

  for (const file of files) {
    const diff = await generateDiffForFile(file, options);
    diffs.push(diff);
  }

  return diffs;
}

/**
 * Generates a diff for a single file
 */
async function generateDiffForFile(
  file: ChangedFile,
  options: DiffOptions
): Promise<FileDiff> {
  const { contextLines, maxLines } = options;
  
  try {
    let diffCommand: string;
    const baseSha = getBaseSha();

    if (file.changeType === 'deleted') {
      // For deleted files, show the content that was removed
      diffCommand = `git diff -U${contextLines} ${baseSha} HEAD -- "${file.path}"`;
    } else if (file.changeType === 'added') {
      // For new files, show the entire content as added
      diffCommand = `git diff -U${contextLines} ${baseSha} HEAD -- "${file.path}"`;
    } else if (file.changeType === 'renamed' && file.previousPath) {
      // For renamed files, diff between old and new paths
      diffCommand = `git diff -U${contextLines} ${baseSha} HEAD -- "${file.previousPath}" "${file.path}"`;
    } else {
      // For modified files
      diffCommand = `git diff -U${contextLines} ${baseSha} HEAD -- "${file.path}"`;
    }

    core.debug(`Running: ${diffCommand}`);
    
    const { stdout } = await execAsync(diffCommand, { maxBuffer: 10 * 1024 * 1024 });
    
    return processDiffOutput(file, stdout, maxLines);
  } catch (error) {
    core.warning(`Failed to generate diff for ${file.path}: ${error}`);
    return {
      file,
      diff: `Unable to generate diff for this file.`,
      truncated: false,
      lineCount: 0,
    };
  }
}

/**
 * Determines the base SHA for diff comparisons
 */
function getBaseSha(): string {
  const eventName = process.env.GITHUB_EVENT_NAME;
  
  if (eventName === 'pull_request') {
    const baseRef = process.env.GITHUB_BASE_REF;
    return baseRef ? `origin/${baseRef}` : 'HEAD~1';
  }
  
  return 'HEAD~1';
}

/**
 * Processes diff output, handling truncation if needed
 */
function processDiffOutput(
  file: ChangedFile,
  rawDiff: string,
  maxLines: number
): FileDiff {
  const lines = rawDiff.split('\n');
  const lineCount = lines.length;
  
  let diff: string;
  let truncated = false;

  if (lineCount > maxLines) {
    // Truncate the diff and add a note
    const truncatedLines = lines.slice(0, maxLines);
    truncatedLines.push('');
    truncatedLines.push(`... (diff truncated, ${lineCount - maxLines} more lines)`);
    diff = truncatedLines.join('\n');
    truncated = true;
    core.debug(`Diff for ${file.path} truncated from ${lineCount} to ${maxLines} lines`);
  } else {
    diff = rawDiff;
  }

  return {
    file,
    diff,
    truncated,
    lineCount,
  };
}

/**
 * Formats a diff as a markdown code block
 */
export function formatDiffAsCodeBlock(diff: string): string {
  if (!diff || diff.trim().length === 0) {
    return '```\nNo changes detected.\n```';
  }
  return '```diff\n' + diff + '\n```';
}
