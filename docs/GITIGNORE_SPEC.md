# .gitignore Strategy

## Root Directory
- **.env**: To protect sensitive environment variables.
- **node_modules/**: To avoid tracking bulky dependency directories.

## Backend Directory
- **logs/**: To exclude log files from version control.
- **node_modules/**: To prevent tracking of dependencies in the backend.
- **.env**: To keep environment variables confidential.

## Rationale
The .gitignore files are designed to keep sensitive and bulky files out of version control, improving security and repository efficiency.