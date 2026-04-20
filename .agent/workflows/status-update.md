---
description: Updates the project's STATUS.md file to maintain context between sessions
---

# Status Update Workflow

Use this workflow at the end of every significant coding session or task to provide a "handoff" for the next session.

## 1. Scan Current State
- Identify completed tasks from the session.
- Identify remaining TODOs or technical debt introduced.
- Determine the "Next Priority" for the project.

## 2. Update STATUS.md / Roadmap
1. **Identify Vault Location**: Check if `/mnt/c/Users/tonym/My Drive/Vault 2/01 Projects/[Project Name]/09 - Notes & Iteration/Project Status & Roadmap.md` exists.
2. **Preference**:
   - If Vault exists: Update the roadmap in the Vault.
   - If Vault does NOT exist: Create/update `STATUS.md` at the project root as a fallback.

## 3. Structure
Update the target file with the following structure:

```markdown
# Project Status: [Project Name]

**Last Updated**: [YYYY-MM-DD HH:MM]
**Current Version**: [vX.X.X]

## 🎯 Recent Accomplishments
- [Feature/Fix 1]
- [Feature/Fix 2]

## 🚧 In Progress / Next Priorities
1. [Highest Priority Item]
2. [Secondary Item]

## ⚠️ Known Debt / Blockers
- [Debt 1]
- [Blocker 2]

## 🧠 Brain Context (Handoff)
Quick summary of the internal logic state for the next AI session (e.g., "The auth hook is currently using a mock provider; needs real Firebase integration next").
```

## 3. Review
- Present the updated `STATUS.md` to the user and save it to the project root.
