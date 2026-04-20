---
description: Bump project version following SemVer based on change type
---

# Global Version Bump Workflow

This workflow handles semantic versioning (SemVer) by dynamically detecting project files.

## 1. Discovery
- Search for version-holding files: `VERSION.json`, `package.json`, `__init__.py`, `pyproject.toml`, etc.
- Present the current version(s) found to the user.

## 2. Classification
Determine the bump type based on changes:
- **MAJOR**: Breaking changes or heavy architectural shifts.
- **MINOR**: New features or significant additions that are backward-compatible.
- **PATCH**: Bug fixes, security updates, or documentation changes.

## 3. Execution
1. **Update Files**: Increment the version number in all detected files.
2. **Update Logs**: Update `CHANGELOG.md` or similar documentation.
3. **Commit & Tag**:
   ```bash
   git add .
   git commit -m "chore: bump version to v[NEW_VERSION]"
   git tag -a "v[NEW_VERSION]" -m "Release v[NEW_VERSION]"
   ```

## 4. Stewardship
- Always notify the user before applying the bump.
- Provide a summary of exactly what is being bumped and why.

> [!NOTE]
> If multiple packages exist in a monorepo, clarify which ones are being bumped.
