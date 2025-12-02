# GitHub Action Specification: Spec Change Issue Creator

## Overview

A reusable GitHub Action for the GitHub Marketplace that automatically creates issues when specification files are modified. This action supports the SpecOps methodology where version-controlled specifications are the source of truth for system behavior, and changes to specifications generate work items for implementation review.

> **Status**: v1.0 Implementation Complete (December 2025)

## Core Behavior

When specification files are modified in a commit or pull request, the action:

1. Detects which specification files changed
2. Extracts the diff for each changed file
3. Creates a new GitHub issue for each changed specification file
4. Populates the issue with the diff and relevant metadata

## Design Principles

- **Spec-first workflow**: Treats specification changes as the origin of work, not something to audit
- **One issue per file**: Each changed specification file generates its own discrete issue to keep work items atomic
- **Configurable**: Users can customize file patterns, issue templates, labels, and other behavior to fit their workflow
- **Minimal dependencies**: Should work with standard GitHub Actions infrastructure without requiring external services
- **Marketplace-ready**: Designed for publication on GitHub Marketplace as a reusable action

## Configuration Options

The action should accept the following inputs, all with sensible defaults:

### File Detection

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `file-pattern` | Glob pattern(s) for specification files | `**/*specification*.md` | No |
| `file-patterns` | Alternative: array of multiple glob patterns | `null` | No |
| `exclude-pattern` | Glob pattern(s) for files to exclude | `null` | No |
| `case-sensitive` | Whether file pattern matching is case-sensitive | `false` | No |

### Issue Content

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `issue-title-template` | Template for issue title | `Specification Change: {{ filename }}` | No |
| `issue-body-template` | Path to a markdown template file for issue body, or inline template | See default template below | No |
| `include-diff` | Whether to include the file diff in the issue body | `true` | No |
| `diff-context-lines` | Number of context lines to include in diff | `3` | No |
| `max-diff-lines` | Maximum lines of diff to include (truncate with note if exceeded) | `500` | No |
| `include-file-link` | Whether to include a link to the changed file | `true` | No |
| `include-commit-link` | Whether to include a link to the triggering commit | `true` | No |
| `include-pr-link` | Whether to include a link to the PR (if triggered by PR) | `true` | No |

### Issue Metadata

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `labels` | Comma-separated list of labels to apply to created issues | `spec-change` | No |
| `assignees` | Comma-separated list of GitHub usernames to assign | `null` | No |
| `milestone` | Milestone number or name to associate with issues | `null` | No |

### Behavior Control

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `create-on-new-files` | Create issues when new specification files are added | `true` | No |
| `create-on-deleted-files` | Create issues when specification files are deleted | `true` | No |
| `dry-run` | Log what would be created without actually creating issues | `false` | No |
| `github-token` | GitHub token for API access | `${{ github.token }}` | No |

## Default Issue Body Template

The action should include a sensible default template that users can override. The default template should use variable interpolation:

```markdown
## Specification Changed

A specification file has been modified and may require implementation changes.

**File:** {{ file_path }}
**Changed in:** {{ commit_sha_short }} ({{ commit_link }})
{{ #if pull_request }}
**Pull Request:** {{ pr_link }}
{{ /if }}
**Author:** @{{ author }}
**Date:** {{ commit_date }}

## Changes

{{ diff }}

## Checklist

- [ ] Reviewed specification change
- [ ] Determined if code changes are required
- [ ] Implementation complete (or confirmed no changes needed)

---
*This issue was automatically created by [spec-change-issue-creator](https://github.com/marketplace/actions/spec-change-issue-creator)*
```

### Template Variables

The following variables should be available for use in custom templates:

| Variable | Description |
|----------|-------------|
| `{{ filename }}` | Just the filename (e.g., `user-authentication-specification.md`) |
| `{{ file_path }}` | Full path to the file from repo root |
| `{{ file_link }}` | URL to the file in the repository |
| `{{ diff }}` | The git diff for this file, formatted as a code block |
| `{{ diff_raw }}` | The git diff without code block formatting |
| `{{ commit_sha }}` | Full commit SHA |
| `{{ commit_sha_short }}` | Short (7-character) commit SHA |
| `{{ commit_link }}` | URL to the commit |
| `{{ commit_message }}` | The commit message |
| `{{ commit_date }}` | Date of the commit |
| `{{ author }}` | GitHub username of the commit author |
| `{{ pull_request }}` | Boolean indicating if this was triggered by a PR |
| `{{ pr_number }}` | PR number (if applicable) |
| `{{ pr_link }}` | URL to the PR (if applicable) |
| `{{ pr_title }}` | PR title (if applicable) |
| `{{ branch }}` | Branch name |
| `{{ change_type }}` | One of: `modified`, `added`, `deleted`, `renamed` |
| `{{ previous_path }}` | For renamed files, the previous path |

## Outputs

The action should provide the following outputs for use in subsequent workflow steps:

| Output | Description |
|--------|-------------|
| `issues-created` | JSON array of issue numbers that were created |
| `issues-count` | Number of issues created |
| `files-detected` | JSON array of specification files that were detected as changed |
| `files-count` | Number of specification files detected |

## Trigger Events

The action should work with these GitHub event triggers:

- `push` - Direct pushes to branches
- `pull_request` - Pull request events (opened, synchronize, reopened)

The action should gracefully handle being triggered by other events by logging a warning and exiting successfully without creating issues.

## Example Usage

### Basic Usage

```yaml
name: Create Issues for Spec Changes

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  spec-change-issues:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2  # Need history for diff
      
      - uses: your-org/spec-change-issue-creator@v1
```

### Custom Configuration

```yaml
name: Create Issues for Spec Changes

on:
  push:
    branches: [main]

jobs:
  spec-change-issues:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      
      - uses: your-org/spec-change-issue-creator@v1
        with:
          file-pattern: 'specs/**/*.md'
          labels: 'spec-change,needs-review'
          assignees: 'tech-lead,product-owner'
          issue-title-template: '[SPEC] {{ filename }} updated'
          create-on-deleted-files: false
```

### Multiple File Patterns

```yaml
- uses: your-org/spec-change-issue-creator@v1
  with:
    file-patterns: |
      specifications/**/*.md
      docs/specs/**/*.md
      **/*-spec.md
    exclude-pattern: '**/drafts/**'
```

### Custom Issue Template

```yaml
- uses: your-org/spec-change-issue-creator@v1
  with:
    issue-body-template: '.github/spec-issue-template.md'
```

### Using Outputs

```yaml
- uses: your-org/spec-change-issue-creator@v1
  id: spec-issues
  
- name: Report Results
  run: |
    echo "Created ${{ steps.spec-issues.outputs.issues-count }} issues"
    echo "Issues: ${{ steps.spec-issues.outputs.issues-created }}"
```

## Implementation Notes

### Diff Generation

- Use `git diff` to generate diffs between the current commit and its parent
- For pull requests, diff against the base branch
- Handle merge commits appropriately (diff against first parent)
- Format diffs as markdown code blocks with `diff` syntax highlighting

### File Detection

- Use a glob library (like `minimatch` or `micromatch` for JavaScript actions) for pattern matching
- Support both single patterns and arrays of patterns
- Apply exclusion patterns after inclusion patterns

### Issue Creation

- Use the GitHub REST API or `@actions/github` toolkit to create issues
- Handle rate limiting gracefully
- Fail gracefully if issue creation fails for one file (continue with others, report failures)

### Duplicate Prevention

Consider adding optional duplicate detection:
- Check if an open issue already exists for the same file with the same label
- Configuration option: `prevent-duplicates: true/false`
- If duplicate detected, optionally add a comment to existing issue instead of creating new one

### Error Handling

- Provide clear error messages when configuration is invalid
- Log warnings for non-fatal issues (e.g., file pattern matched no files)
- Exit with appropriate status codes
- Support `dry-run` mode for testing configuration

## Testing Considerations

The action should be tested against:

- Single file changes
- Multiple file changes in one commit
- New file additions
- File deletions
- File renames
- Merge commits
- Pull request triggers vs push triggers
- Various file pattern configurations
- Custom templates with all variable types
- Large diffs (truncation behavior)
- Rate limiting scenarios

## Repository Structure

Suggested structure for the action repository:

```
spec-change-issue-creator/
├── action.yml              # Action metadata and input definitions
├── src/
│   ├── index.js            # Main entry point
│   ├── file-detector.js    # Logic for detecting changed spec files
│   ├── diff-generator.js   # Logic for generating diffs
│   ├── issue-creator.js    # Logic for creating GitHub issues
│   └── template-renderer.js # Logic for rendering issue templates
├── templates/
│   └── default-issue.md    # Default issue body template
├── dist/                   # Compiled/bundled action (if using build step)
├── tests/
├── README.md
├── LICENSE
└── package.json
```

## Marketplace Listing

For GitHub Marketplace publication, the action should include:

- Clear, concise name (e.g., "Spec Change Issue Creator")
- Description emphasizing the spec-first workflow it enables
- Icon and color for visual identification
- Comprehensive README with examples
- Link to SpecOps methodology for context

## Related Projects

- **[Spectr](https://github.com/connerohnesorge/spectr)** - A CLI tool for validatable spec-driven development with a full workflow for proposals, validation, and archiving. Spectr is more comprehensive and opinionated, enforcing specific formats and a structured three-stage workflow (propose → implement → archive). Consider Spectr if you want a complete methodology-in-a-box; consider this action if you want lightweight automation that fits into your existing workflow without adopting new conventions.

## Future Considerations

Features that could be added in future versions but are out of scope for v1:

- Project board integration (add created issues to a specified project board)
- Slack/Discord notifications when issues are created
- Integration with GitHub Discussions as an alternative to Issues
- Support for GitLab/Bitbucket (separate actions or configurable)
- AI-powered summary of spec changes (rather than just showing diff)
- Linking related issues (if spec change references an existing issue number)