---
description: Run a production build audit and Lighthouse performance check
---

# Lighthouse Audit Workflow

This workflow runs a production build and performs a Lighthouse audit against the preview server.

## 1. Environment Setup
- Identify the project type and build commands (e.g., `npm run build`, `npm run dev`).
- Identify the preview/start command (e.g., `npm run preview`, `npm run start`).
- Identify the default port or URL for the preview server.

## 2. Execution
1. **Build the production bundle**:
   ```bash
   npm run build
   ```
2. **Start the preview server**:
   ```bash
   npm run preview
   ```
3. **Run Lighthouse audit**:
   - Use the Chrome DevTools **Lighthouse** tab or the CLI.
   - For CLI (Recommended):
     ```bash
     npx lighthouse [PREVIEW_URL] --output=json --output-path=./lighthouse-report.json
     ```

## 3. Review
- Analyze the scores (Performance, Accessibility, Best Practices, SEO).
- Review the **Opportunities** and **Diagnostics**.
- Save reports for comparison over time.

## 4. Cleanup
- Stop the preview server (`Ctrl+C`).

> [!TIP]
> Use the `improve-lighthouse` workflow to automatically parse and act on the results of the audit.
