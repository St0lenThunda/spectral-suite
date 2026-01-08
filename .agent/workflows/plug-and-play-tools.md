---
description: Rule for modular, plug-and-play tool architecture
---

# Modular Tool Architecture (Plug-and-Play)

To ensure scalability and a consistent user experience, the `mtool` project follows a strict "Plug-and-Play" architecture for all tools.

## core Principles

1.  **Strict Modularity**: 
    - Every new tool must exist as a self-contained directory within the `apps/` folder.
    - Adding or removing a tool folder should have zero side effects on the core infrastructure.
    - Tools should leverage `@mtool/core` for shared logic, audio processing, and theory.

2.  **Mandatory UX Sections**:
    Every tool UI must include the following three sections to ground the user experience:
    - **"What am I seeing?"**: Contextual explanation of the live visual feedback (e.g., the Live Monitor, pulsing rings, frequency data).
    - **"How it works"**: High-level technical overview of the underlying engine (e.g., the pitch detection algorithm, chord identification logic).
    - **"Instructions / Practical Application"**: Actionable steps for the user and the real-world utility of the tool (e.g., "Step 1: Focus on one note", "Application: Ear training for harmonic intervals").

3.  **Cohesive Design System**:
    All tools must adhere to the global mtool aesthetic:
    - **Aesthetics**: Vibrant "Aurora" or "Meteor" background gradients.
    - **Glassmorphism**: Translucent, blurred cards with subtle white/indigo borders.
    - **Typography**: Modern, premium sans-serif fonts (e.g., *Outfit*, *Inter*).
    - **Micro-interactions**: Subtle hover states, pulsing animations, and "pop-in" entering transitions.

## Implementation Checklist for New Tools

- [ ] Initialize within `apps/[XX-toolname]`
- [ ] Implement core logic via Vue/Composable pattern
- [ ] Add the three mandatory sections to the UI template
- [ ] Apply the shared glassmorphism CSS definitions
- [ ] Verify responsiveness (Desktop side-by-side vs Mobile vertical stack)
