---
description: Post-implementation documentation workflow
---

# Global Documentation Workflow

Maintain project clarity by documenting implementations immediately after completion.

## 1. Technical Walkthrough
Create a record of what was changed and why.

**Template**:
```markdown
# [Feature/Fix Name]

**Date**: [YYYY-MM-DD]
**Status**: Completed ✅

## Summary
What was implemented and why?

## Changes
- Feature 1
- Bug fix 2

## Implementation Details
Key technical choices, architectural impacts, or interesting logic.

## Files
- `path/to/file` - Short description

## Verification
How was it tested?
```

## 2. Directory Structure
- Store walkthroughs in `docs/walkthroughs/` or equivalent.
- Maintain an index in `docs/walkthroughs/README.md`.

## 3. Supplementary Documentation
- Update **JSDoc** comments in the code.
- Update **API docs** or **README** files if the external interface changed.
- Update **Environment Templates** (`.env.example`).

> [!TIP]
> Use the `ADR Interview` workflow for significant architectural changes.
