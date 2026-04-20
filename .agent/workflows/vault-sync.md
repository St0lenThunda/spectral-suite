---
description: Generates and synchronizes a project's Obsidian Vault directory structure
---

# Global Vault Sync Workflow

Use this workflow to ensure every project has a dedicated, structured space in your Obsidian Vault (`/mnt/c/Users/tonym/My Drive/Vault 2/01 Projects/`).

## 1. Directory Detection & Creation
- **Vault Root**: `/mnt/c/Users/tonym/My Drive/Vault 2/01 Projects/`
- Identify the current project name (e.g., `chess-project`, `NGO`).
- Check if the folder `[Project Name]` exists in the Vault Root.
- **If missing**: Create the following standardized structure:
  - `00 - Overview/`
  - `01 - Brand & Identity/`
  - `02 - Product/`
  - `03 - Technical Architecture/`
  - `04 - [Contextual Domain]/`:
    - **Step**: Analyze the project's README, code, and purpose.
    - **Action**: Propose a specific name for Folder 04 (e.g., "Chess Theory" for `chess-project`, "Community Impact" for `NGO`).
    - **Confirmation**: Present the suggested name to the user for approval or modification.
  - `05 - Sales & Outreach/`
  - `06 - Pricing & Monetization/`
  - `07 - UX & Language/`
  - `08 - Legal & Ethics/`
  - `09 - Notes & Iteration/`
  - `10 - Operations & Stewardship/`
  - `99 - clutter/`
  - `docs/`
  - `scripts/`
  - `styles/`
  - `zAttachments/`

## 2. Project Deep-Scan & Doc Generation
After creating the structure, analyze the repository to populate the templates:
- **Analyze**:
  - `package.json` / `requirements.txt`: Identify tech stack and version.
  - `README.md`: Identify vision, installation, and usage.
  - `src/` / `app/`: Identify core components and architectural patterns.
  - `.git`: Identify recent history for the Change Log.
- **Generate**:
  - Populate **MOC** with an index of the identified technical core.
  - Populate **Vision & Purpose** based on the README and project intent.
  - Populate **Project Status & Roadmap** by finding TODOs and recent commit gaps.
  - Populate **Change Log** by summarizing git history into "Added/Changed/Fixed" categories.
  - Populate **Decision Log** by inferring ADRs from the tech stack choices (e.g., "Choice of Vue 3 over React").

## 3. Core Template Structure
...

## 3. Workflow Integration
- **Sync with `@ship`**: When running the `@ship` workflow, it should automatically check and update the Vault's **Change Log** and **Roadmap**.
- **Sync with `@status-update`**: This workflow should prefer saving its updates to the Vault's **Project Status & Roadmap.md** if the vault directory is found.

## 4. Execution
- Create the directories using `mkdir -p`.
- Touch or populate the template files with basic headers.
- Report back with a success message showing the total folders and files created.
