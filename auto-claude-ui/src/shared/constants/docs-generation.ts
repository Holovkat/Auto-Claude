/**
 * Documentation generation constants
 */

export const AGENTS_MD_PROMPT = `Analyze this codebase and write a brief summary to a file called AGENTS.md at the project root.

Include:
1. What this project is (1-2 sentences)
2. Tech stack (languages, frameworks, key dependencies)
3. How to set up and run it (install, dev, build commands)
4. Main directories and what they contain

Keep it concise - around 50-100 lines max. Focus on what a developer needs to know to start working on this codebase.`;

export const DOCS_GENERATION_SUMMARY_TAGS = ['agents-md', 'documentation', 'generated'];
