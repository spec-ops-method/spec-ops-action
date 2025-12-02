# Spec Ops Action

[![CI](https://github.com/spec-ops-method/spec-ops-action/actions/workflows/ci.yml/badge.svg)](https://github.com/spec-ops-method/spec-ops-action/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A GitHub Action that automatically creates issues when specification files are modified. This action supports the **SpecOps methodology** where version-controlled specifications are the source of truth for system behavior, and changes to specifications generate work items for implementation review.

## Features

- 🔍 **Automatic Detection** - Detects when specification files change in commits or PRs
- 📝 **One Issue Per File** - Creates discrete, atomic issues for each changed spec
- 🎨 **Customizable Templates** - Use Handlebars templates for issue titles and bodies
- 🏷️ **Flexible Metadata** - Configure labels, assignees, and milestones
- 🔧 **Highly Configurable** - Customize file patterns, diff settings, and behavior
- 🧪 **Dry Run Mode** - Test your configuration without creating issues

## Quick Start

```yaml
name: Create Issues for Spec Changes

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  issues: write

jobs:
  spec-change-issues:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2  # Need history for diff
      
      - uses: spec-ops-method/spec-ops-action@v1
```

> **Note**: The `issues: write` permission is required for the action to create issues.

## Security Notes

- Use the `pull_request` event (not `pull_request_target`) to avoid elevated permissions on forked PRs.
- Configure minimal permissions: `issues: write`, `contents: read`.
- Consider adjusting `max-diff-lines` to limit large diffs from being posted.
- By default, diff content is rendered inside fenced code blocks. If needed, set `sanitize-diff: 'true'` (default) to avoid rendering raw HTML.
- Custom templates must be located inside the repository path; paths resolving outside the workspace are rejected.

## Configuration

### File Detection

| Input | Description | Default |
|-------|-------------|---------|
| `file-pattern` | Glob pattern for specification files | `**/*specification*.md` |
| `file-patterns` | Multiple glob patterns (one per line) | - |
| `exclude-pattern` | Glob pattern(s) for files to exclude | - |
| `case-sensitive` | Whether pattern matching is case-sensitive | `false` |

### Issue Content

| Input | Description | Default |
|-------|-------------|---------|
| `issue-title-template` | Handlebars template for issue title | `Specification Change: {{ filename }}` |
| `issue-body-template` | Path to template file or inline template | Built-in template |
| `include-diff` | Include file diff in issue body | `true` |
| `diff-context-lines` | Lines of context in diff | `3` |
| `max-diff-lines` | Maximum diff lines (truncates if exceeded) | `500` |
| `include-file-link` | Include link to the changed file | `true` |
| `include-commit-link` | Include link to the commit | `true` |
| `include-pr-link` | Include link to the PR (if applicable) | `true` |

### Issue Metadata

| Input | Description | Default |
|-------|-------------|---------|
| `labels` | Comma-separated list of labels | `spec-change` |
| `assignees` | Comma-separated list of assignees | - |
| `milestone` | Milestone number or name | - |

### Behavior Control

| Input | Description | Default |
|-------|-------------|---------|
| `create-on-new-files` | Create issues for new spec files | `true` |
| `create-on-deleted-files` | Create issues for deleted spec files | `true` |
| `dry-run` | Log without creating issues | `false` |
| `github-token` | GitHub token for API access | `${{ github.token }}` |

## Outputs

| Output | Description |
|--------|-------------|
| `issues-created` | JSON array of created issue numbers |
| `issues-count` | Number of issues created |
| `files-detected` | JSON array of detected spec files |
| `files-count` | Number of spec files detected |

## Examples

### Custom File Patterns

```yaml
- uses: spec-ops-method/spec-ops-action@v1
  with:
    file-patterns: |
      specifications/**/*.md
      docs/specs/**/*.md
      **/*-spec.md
    exclude-pattern: '**/drafts/**'
```

### Custom Labels and Assignees

```yaml
- uses: spec-ops-method/spec-ops-action@v1
  with:
    labels: 'spec-change,needs-review,priority-high'
    assignees: 'tech-lead,product-owner'
    milestone: 'v2.0'
```

### Custom Issue Title

```yaml
- uses: spec-ops-method/spec-ops-action@v1
  with:
    issue-title-template: '[SPEC] {{ filename }} ({{ change_type }})'
```

### Custom Issue Body Template

Create a template file (e.g., `.github/spec-issue-template.md`):

```markdown
## Specification Updated: {{ filename }}

**Change Type:** {{ change_type }}
**Author:** @{{ author }}
**Branch:** {{ branch }}

### Diff

{{{ diff }}}

### Action Required

- [ ] Review the specification change
- [ ] Update implementation if needed
- [ ] Update tests if needed
```

Then reference it:

```yaml
- uses: spec-ops-method/spec-ops-action@v1
  with:
    issue-body-template: '.github/spec-issue-template.md'
```

### Using Outputs

```yaml
- uses: spec-ops-method/spec-ops-action@v1
  id: spec-ops

- name: Report Results
  run: |
    echo "Created ${{ steps.spec-ops.outputs.issues-count }} issues"
    echo "Issue numbers: ${{ steps.spec-ops.outputs.issues-created }}"
```

### Dry Run for Testing

```yaml
- uses: spec-ops-method/spec-ops-action@v1
  with:
    dry-run: 'true'
```

## Template Variables

The following variables are available in Handlebars templates:

| Variable | Description |
|----------|-------------|
| `{{ filename }}` | Just the filename |
| `{{ file_path }}` | Full path from repo root |
| `{{ file_link }}` | URL to the file |
| `{{ diff }}` | Git diff as code block |
| `{{ diff_raw }}` | Raw git diff |
| `{{ commit_sha }}` | Full commit SHA |
| `{{ commit_sha_short }}` | Short (7-char) commit SHA |
| `{{ commit_link }}` | URL to the commit |
| `{{ commit_message }}` | Commit message |
| `{{ commit_date }}` | Date of the commit |
| `{{ author }}` | GitHub username |
| `{{ pull_request }}` | Boolean: true if PR-triggered |
| `{{ pr_number }}` | PR number (if applicable) |
| `{{ pr_link }}` | URL to the PR |
| `{{ pr_title }}` | PR title |
| `{{ branch }}` | Branch name |
| `{{ change_type }}` | `added`, `modified`, `deleted`, or `renamed` |
| `{{ previous_path }}` | Previous path (for renames) |

Use triple braces `{{{ }}}` for variables containing HTML/Markdown (like `diff`) to prevent escaping.

## Supported Events

- `push` - Direct pushes to branches
- `pull_request` - Pull request events

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
