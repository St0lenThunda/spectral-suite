---
description: Scan for outdated or vulnerable dependencies
---

# Dependency Audit Workflow

1. **Detection**: Identify the package manager(s) used in the project (`npm`, `yarn`, `pnpm`, `pip`, `poetry`, `go mod`, etc.).
2. **Scan**:
   - For Node: Run `npm audit` or `npm outdated`.
   - For Python: Run `safety check` or `pip list --outdated`.
3. **Analyze**: Identify critical or high-severity vulnerabilities.
4. **Report**: Present a table of vulnerable or outdated dependencies with:
   - Package name.
   - Current version.
   - Latest version.
   - Severity / Risk.
5. **Action**: Offer to update the dependencies (one by one or all at once) and run tests to verify stability.
