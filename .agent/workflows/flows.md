---
description: List and short description of available workflows
---

# Flows Workflow

Use this workflow to get a quick overview of all available automation workflows in the `.agent/workflows` directory.

## 📋 Available Workflows

| Name | Description | Purpose |
| :--- | :--- | :--- |
| **@flows** | List Workflows | Provides this summary of all available workflows. |
| **@adr-interview** | ADR Creator | Guided interview to create Architecture Decision Records. |
| **@analyze-n-suggest** | Code Auditor | Scans for efficiency, clarity, and best practices. |
| **@brainstorm** | Idea Generator | Brainstorms multiple approaches with pros/cons. |
| **@dependency-audit** | Dep Scanner | Checks for outdated or vulnerable packages. |
| **@documentation** | Tech Writer | Generates post-implementation walkthroughs and docs. |
| **@genesis** | Project Starter | End-to-end guided setup for brand new projects. |
| **@get-commits** | Commit Master | Generates Conventional Commits across the workspace. |
| **@lighthouse-audit** | Perf Auditor | Runs production builds and Lighthouse checks. |
| **@improve-lighthouse** | Perf Fixer | Parses Lighthouse reports and suggests optimizations. |
| **@onboard** | Context Builder | Briefs the AI on a new project's architecture and status. |
| **@project-health** | Health Check | Quick snapshot of git state, build, tests, and debt. |
| **@ship** | Release Cycle | Chains health, docs, versioning, and commits into one GO. |
| **@status-update** | Roadmap Sync | Updates STATUS.md or Obsidian Roadmap files. |
| **@tech-debt-scan** | Debt Finder | Finds TODOs, dead code, and complexity hotspots. |
| **@vault-sync** | Vault Manager | Builds and updates the 13-folder Obsidian structure. |
| **@version-bump** | SemVer Tool | Handles semantic versioning and changelog updates. |

## 🤖 Expert Subagent Team
Specialized agents that run in isolated context windows for deep focus.

| Name | Role | Core Strength |
| :--- | :--- | :--- |
| **@auditor** | Code Specialist | Efficiency, Clarity, Security, and Code Smells. |
| **@debt-collector** | Tech Debt Tracker | Finding TODOs, Complexity, and Dead Code. |
| **@documentarian** | Tech Writer | Crafting Walkthroughs, ADRs, and Project Briefings. |
| **@generalist** | Batch Executor | High-volume tasks and repetitive refactoring. |
| **@codebase_investigator** | Explorer | Root-cause analysis and system-wide mapping. |

## 🛠️ Usage
To trigger a workspace, simply mention it using the `@` symbol followed by the workflow name (e.g., `@brainstorm`).
