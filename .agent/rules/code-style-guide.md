---
trigger: always_on
---

# Spectral Suite Architecture Patterns (Plug-and-Play)

When multiple modules need to verify the state of a global system (like the Audio Engine), avoid repeating logic.

**Anti-Pattern (Don't do this):**
Checking every individual setting in every file.
`const isActive = isLowPassEnabled.value || sensitivity.value > 0.5 || ...`

**Educational Pattern (Do this):**
1. Create a "Manager Hook" (e.g., `useGlobalEngine`) that imports all the pieces.
2. Export a single `computed` property (e.g., `isEngineModified`).
3. Modules simply ask "Is the engine modified?" without caring *how*.

*Why?* This allows us to add new knobs and settings to the engine later without having to open and edit every single tool that uses it.
