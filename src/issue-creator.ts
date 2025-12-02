import * as core from '@actions/core';
import * as github from '@actions/github';
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
export async function createIssues(
  token: string,
  issues: Array<{ rendered: RenderedIssue; filePath: string }>,
  options: IssueOptions,
  dryRun: boolean
): Promise<IssueCreationResult[]> {
  const results: IssueCreationResult[] = [];
  
  if (dryRun) {
    core.info('🔍 Dry run mode - no issues will be created');
    for (const { rendered, filePath } of issues) {
      core.info(`\n📄 Would create issue for: ${filePath}`);
      core.info(`   Title: ${rendered.title}`);
      core.info(`   Labels: ${options.labels.join(', ')}`);
      if (options.assignees.length > 0) {
        core.info(`   Assignees: ${options.assignees.join(', ')}`);
      }
      if (options.milestone) {
        core.info(`   Milestone: ${options.milestone}`);
      }
      // Avoid logging body preview to reduce risk of exposing sensitive content
      
      results.push({
        success: true,
        filePath,
        issue: {
          number: 0,
          url: '(dry run)',
          title: rendered.title,
        },
      });
    }
    return results;
  }

  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;

  for (const { rendered, filePath } of issues) {
    try {
      core.info(`Creating issue for: ${filePath}`);
      
      const createParams: Parameters<typeof octokit.rest.issues.create>[0] = {
        owner,
        repo,
        title: rendered.title,
        body: rendered.body,
        labels: options.labels,
      };

      // Add assignees if provided
      if (options.assignees.length > 0) {
        createParams.assignees = options.assignees;
      }

      // Add milestone if provided
      if (options.milestone) {
        createParams.milestone = options.milestone;
      }

      const response = await octokit.rest.issues.create(createParams);

      const createdIssue: CreatedIssue = {
        number: response.data.number,
        url: response.data.html_url,
        title: response.data.title,
      };

      core.info(`✅ Created issue #${createdIssue.number}: ${createdIssue.url}`);

      results.push({
        success: true,
        issue: createdIssue,
        filePath,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.warning(`❌ Failed to create issue for ${filePath}: ${errorMessage}`);
      
      results.push({
        success: false,
        error: errorMessage,
        filePath,
      });
    }
  }

  return results;
}

/**
 * Resolves a milestone name to its number
 */
export async function resolveMilestone(
  token: string,
  milestoneInput: string
): Promise<number | undefined> {
  if (!milestoneInput) {
    return undefined;
  }

  // If it's already a number, use it directly
  const milestoneNumber = parseInt(milestoneInput, 10);
  if (!isNaN(milestoneNumber)) {
    return milestoneNumber;
  }

  // Otherwise, look up by name
  try {
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    const { data: milestones } = await octokit.rest.issues.listMilestones({
      owner,
      repo,
      state: 'open',
    });

    const milestone = milestones.find(
      m => m.title.toLowerCase() === milestoneInput.toLowerCase()
    );

    if (milestone) {
      core.debug(`Resolved milestone "${milestoneInput}" to number ${milestone.number}`);
      return milestone.number;
    } else {
      core.warning(`Milestone "${milestoneInput}" not found`);
      return undefined;
    }
  } catch (error) {
    core.warning(`Failed to resolve milestone: ${error}`);
    return undefined;
  }
}

/**
 * Parses comma-separated list into array, trimming whitespace
 */
export function parseCommaSeparatedList(input: string | undefined): string[] {
  if (!input || input.trim() === '') {
    return [];
  }
  return input.split(',').map(item => item.trim()).filter(item => item.length > 0);
}
