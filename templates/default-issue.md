## Specification Changed

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
*This issue was automatically created by [spec-ops-action](https://github.com/spec-ops-method/spec-ops-action)*
