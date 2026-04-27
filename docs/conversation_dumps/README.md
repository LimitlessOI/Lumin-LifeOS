# Conversation Dumps

This folder is for storing conversation history exports that provide context for the AI Counsel OS development.

## Primary brainstorm paste target (verbatim)

Use **[`OPERATOR_BRAINSTORM_INBOX.md`](OPERATOR_BRAINSTORM_INBOX.md)** for ongoing **ChatGPT / external** brainstorm sessions you want preserved **word-for-word** (idea exploration where the model has **limited project context** — that is OK; the repo catches it on ingest). See **Amendment 38** §6 step **5** for how this differs from coding-tutorial chatter.

## What to Paste Here (dated files)

If you have conversation history from ChatGPT or other AI assistants that contains:
- Architecture decisions
- Design discussions
- Feature requirements
- Implementation details
- Product vision

You can also paste them here as **dated** markdown files (below), or duplicate the inbox file to `YYYY-MM-DD-topic-brainstorm.md` for large archives.

## Format

Create files named: `YYYY-MM-DD-source.md`

Example:
- `2025-01-15-chatgpt.md`
- `2025-01-15-vision-discussion.md`

## How to Export

### ChatGPT
1. Open the conversation
2. Click the "..." menu
3. Select "Export conversation"
4. Choose "Markdown" format
5. Save the file here

### Other Sources
- Copy/paste the conversation into a markdown file
- Include timestamps if available
- Preserve formatting as much as possible

## Usage

The AI Counsel OS will scan these files during development to:
- Understand design decisions
- Maintain consistency with previous discussions
- Reference implementation details
- Preserve context across sessions
