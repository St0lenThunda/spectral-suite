---
description: Find TODOs, dead code, and large files
---

# Tech Debt Scan Workflow

1. **Grep Scan**: Search for `TODO`, `FIXME`, `BUG`, `HACK` across the codebase.
2. **Complexity Scan**: Identify the largest 5 files (binary excluded) and the most deeply nested code blocks.
3. **Dead Code**:
   - For Node/TS: Suggest running `ts-prune` or looking for unused exports.
   - For Python: Look for unused imports or functions.
4. **Dependencies**: Identify "bloated" dependencies (large bundle size impact).
5. **Prioritization**: Report the findings as a prioritized list based on "Risk" vs. "Effort to Fix".
