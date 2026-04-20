---
description: Get a quick snapshot of the project's current health
---

# Project Health Workflow

1. **Git State**: Check for uncommitted changes, staged files, and branch sync status.
2. **Build Status**: Attempt a quick build if appropriate (e.g., `npm run build --dry-run`).
3. **Test Results**: Run a subset of tests or report the latest test run status.
4. **Code Quality**:
   - Count TODOs, FIXMEs, and XXXs in the codebase.
   - Count lint errors/warnings.
5. **Dependencies**: Check if `package.json` or equivalent has been modified recently without a lockfile update.
6. **Summary**: Provide a "Health Card" with a green/yellow/red status for each category and a prioritized list of actions to improve the score.
