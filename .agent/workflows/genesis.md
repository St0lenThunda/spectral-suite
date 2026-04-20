---
description: An end-to-end interview workflow to initialize new projects from scratch
---

# Project Genesis Workflow (New Project Initiative)

Use this workflow to start a brand-new project. It handles discovery, architecture, repository creation, and Vault synchronization in one guided session.

## 1. Discovery Interview
The AI will ask the user for:
- **Name**: The canonical name for the repo and vault folder.
- **Vision**: What problem are we solving? Who is it for?
- **Domain**: Is it Gaming, AI, NGO, Audio, etc. (for Folder 04).
- **Tech Stack Preference**: Frontend (Vue/React), Backend (Supabase/Firebase/Node), Styling (Vanilla/Tailwind).

## 2. Architectural Brainstorming
- Automatically trigger the `@brainstorm` workflow.
- Propose 3 distinct starting architectures based on the Tech Stack preference.
- User selects or refines a path.

## 3. Repository Genesis
- **Create Local Directory**: `mkdir -p /home/thunda/543Tools/[Project Name]`.
- **Initialize Tech Stack**: 
  - If Web: Run `npx -y create-vite@latest . --template [vue/react]-ts`.
  - If Node: `npm init -y`.
- **Establish Baseline**: Create a clean `README.md` and `.env.example`.

## 4. Vault Synchronization
- Automatically trigger the `@vault-sync` workflow.
- Build the 13-folder structure in `/mnt/c/Users/tonym/My Drive/Vault 2/01 Projects/[Project Name]`.
- Populate initial Vision, MOC, and Roadmap docs.

## 5. Agent Optimization
- Create local `.agent/` rules if project-specific patterns are needed (e.g., Plug-and-Play for Spectral projects).
- Establish the initial `STATUS.md` at the root.

## 6. Final Briefing
- Run the `@onboard` workflow to generate the session-ready briefing for the agent.
- Present a "Project Manifest" summary showing all created resources.

> [!IMPORTANT]
> The AI should lead the interview. Do not ask all questions in one block; ask them one by one or in small related groups to maintain clarity.
