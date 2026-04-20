---
description: Orchestrates a complete project delivery cycle in a single workflow
---

# Global "Ship" Workflow (Super-Workflow)

Use this workflow when a feature or fix is complete and you are ready to "Ship" the changes. It chains multiple sub-workflows to minimize user interaction.

## 1. Quality & Health Phase
- Run the `@project-health` check.
- **Optimization**: Use `@auditor` to perform a deep scan of the changes in the background without polluting the main session.
- If there are failing tests or critical lint errors, report them and ask for fixes BEFORE proceeding.
- If it's a web project, run a quick `@lighthouse-audit`.

## 2. Documentation Phase
- Proactively suggest whether an **ADR** is needed (based on the impact of the changes).
- **Optimization**: Delegate to `@documentarian` to draft the technical walkthrough and ADR in isolation.
- Automatically generate the technical record using the `@documentation` template.

## 3. Versioning Phase
- Analyze the changes to determine the SemVer bump (Major/Minor/Patch).
- Run the `@version-bump` workflow to update files and changelogs.

## 4. Final Delivery Phase
- Generate a Conventional Commit message using the `@get-commits` logic.
- **Single Approval**: Present the summary of all the above (Version: X.X.X, ADR: Yes/No, Commit Msg) to the user for a single "GO" signal.
- **Action**: Upon approval, execute all file writes, git tags, and commits in a single batch.

> [!IMPORTANT]
> The goal is to move from four separate conversations to one. The AI should prepare all drafts (Walkthrough, ADR, Commit Message) first, then present them all at once.
