---
description: Analyze git status and diff to generate a comprehensive commit message
---

1. Navigate to the project root directory (use `git rev-parse --show-toplevel` if unsure).
2. Run `git status` to identify all modified, deleted, and untracked files recursively across the entire repository.
3. Run `git diff` to inspect changes in modified files.
4. Run `git diff --cached` to inspect staged changes.
5. If there are untracked files, list them and consider if they should be added.
6. Analyze the code changes to understand the *intent* and *impact* of the modifications.
7. Generate a comprehensive commit message following the Conventional Commits specification:
    - **Header**: `<type>(<scope>): <short summary>`
    - **Body**: Detailed bullet points explaining *what* changed and *why*.
8. Present the commit message and ask the user for approval.
9. **Upon user approval**, execute the following command:
   ```bash
   git add . && git commit -m "<your_generated_message>"
   ```
10. If the user rejects the message, ask for feedback, amend the message, and repeat the approval process.
