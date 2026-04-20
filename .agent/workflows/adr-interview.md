---
description: Interview-based ADR creation workflow
---

# Global ADR Interview Workflow

Guidance for creating a new Architecture Decision Record (ADR) through interactive dialogue.

## 1. Preparation
- Identify the next ADR number for the project.
- Determine the directory where ADRs are stored (or propose a default like `docs/adr/`).

## 2. The Interview
The agent will guide the user through the following sections:
- **Title**: A clear name for the decision.
- **Context**: What problem are we solving? What is the background?
- **Decision**: Exactly what is the choice being made?
- **Rationale**: Why is this the best path forward?
- **Alternatives**: What other options were considered and why were they rejected?
- **Consequences**: What are the trade-offs (positive and negative)?
- **Impact**: Which parts of the system are affected?

## 3. Generation
- Generate the ADR using a standard template.
- Save as a draft (e.g., `ADR-XXX-DRAFT.md`).
- Present the draft to the user for final review.

## 4. Finalization
- Once approved, rename to the final filename (e.g., `ADR-001-initial-architecture.md`).
- Update any ADR index if one exists.
