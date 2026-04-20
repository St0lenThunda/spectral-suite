---
description: Generate Conventional Commits for all repositories in the workspace
---

# Global Get Commits Workflow

This workflow automatically identifies all git repositories in the current workspace and generates detailed commit messages following the **Conventional Commits** specification.

## 1. Discovery
- Recursively find all `.git` directories in the workspace (excluding common ignored directories like `node_modules`).
- For each unique repository found:
  - Run `git status` to identify modified, deleted, and untracked files.
  - Run `git diff` and `git diff --cached` to inspect the actual changes.

## 2. Analysis
- Analyze the code changes to understand the **intent** and **impact**.
- If multiple logically separate changes are found in one repo, suggest splitting the commit.

## 3. Message Generation
Generate a comprehensive commit message for each repo with changes:
- **Header**: `<type>(<scope>): <short summary>` (e.g., `feat(ui): add volume slider`)
  - Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`.
- **Body**: Detailed bullet points explaining **what** changed and **why**.
- **Footer**: Include breaking change notes or issue references if applicable.

## 4. Review & Execution
- Present the generated commit messages to the user for each modified repository.
- **Upon user approval**, execute the following for each repo:
  ```bash
  git add . && git commit -m "<generated_message>"
  ```

## 5. Tips
- Use imperative mood ("Add", "Fix", "Update") in the summary.
- Be concise but descriptive.
- If a repo is clean, simply report "Clean".
