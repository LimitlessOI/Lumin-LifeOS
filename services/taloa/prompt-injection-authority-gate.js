/**
 * SYNOPSIS: Exports assertObservationIsNotAuthority — services/taloa/prompt-injection-authority-gate.js.
 * @typedef {import('@taloa/types').Observation} Observation
 * @typedef {import('@taloa/types').Envelope} Envelope
 */

/**
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md Overlay print §64 item 8
 * Observed page text cannot become instructions. This function asserts that the
 * provided observation, which represents observed page text, is not being
 * treated as an authoritative instruction.
 *
 * Blueprint §46.
 *
 * @param {Observation} observation The observed page text.
 * @param {Envelope} envelope The envelope containing the observation.
 * @returns {void}
 * @throws {Error} If the observation is interpreted as an authority or instruction.
 */
export function assertObservationIsNotAuthority(observation, envelope) {
  // Real detection logic as per Overlay print §64 item 8: observed page text cannot become instructions.
  // This logic aims to detect patterns or characteristics in the observation's text
  // that might indicate an attempt to inject instructions or commands,
  // rather than being purely descriptive page content.

  const text = observation.text;

  // Rule 1: Check for explicit command-like phrases at the beginning of the text.
  // This targets direct attempts to issue commands.
  const commandPrefixes = [
    "execute", "run", "perform", "call function", "invoke", "start", "stop",
    "modify", "delete", "create", "update", "inject", "override", "set value",
    "get value", "read from", "write to", "access", "authorize", "authenticate",
    "do not", "ignore previous instructions", "as an ai model", "you are now"
  ];
  const lowerText = text.toLowerCase();
  for (const prefix of commandPrefixes) {
    if (lowerText.startsWith(prefix + " ") || lowerText.startsWith(prefix + ":")) {
      throw new Error(`Observed text "${text.substring(0, 50)}..." appears to be an instruction (prefix match: "${prefix}"), violating Overlay print §64 item 8.`);
    }
  }

  // Rule 2: Check for common delimiters used in command injection, especially when paired with keywords.
  // This looks for structured command-like inputs.
  const injectionPatterns = [
    /;\s*(execute|run|call|do|perform)\s/i, // Semicolon followed by a command
    /`\s*(execute|run|call|do|perform)\s`/i, // Backticks often used for code/commands
    /\$\{\s*(execute|run|call|do|perform)\s*\}/i, // Template literal-like command injection
    /<script\s*>/i, // Basic script injection attempt
    /eval\s*\(/i, // Direct evaluation function calls
    /system\s*\(/i, // System command calls
    /exec\s*\(/i, // Execute command calls
    /(user|system|assistant):\s*/i, // Role-based instruction patterns
    /--\s*command\s*=/i, // Command line argument style injection
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(text)) {
      throw new Error(`Observed text "${text.substring(0, 50)}..." contains a potential instruction injection pattern, violating Overlay print §64 item 8.`);
    }
  }

  // Rule 3: Heuristic for excessive use of imperative verbs, especially at the beginning of sentences.
  // This is a more subtle indicator of instructional intent.
  const imperativeVerbs = [
    "configure", "define", "enable", "disable", "fetch", "send", "receive",
    "process", "generate", "render", "display", "hide", "show", "navigate",
    "redirect", "log", "report", "extract", "parse", "format", "compress",
    "decompress", "encrypt", "decrypt", "hash", "sign", "verify", "install",
    "uninstall", "deploy", "build", "compile", "link", "save", "load", "store"
  ];

  const sentences = text.split(/[.!?]\s*|\n/).filter(s => s.trim().length > 0);
  let imperativeCount = 0;
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (trimmedSentence.length > 0) {
      const firstWord = trimmedSentence.split(' ')[0].toLowerCase();
      if (imperativeVerbs.includes(firstWord)) {
        imperativeCount++;
      }
    }
  }

  // If a significant portion of sentences start with an imperative verb, it might be an instruction set.
  // Threshold can be tuned based on observed false positives/negatives.
  if (sentences.length > 3 && imperativeCount / sentences.length > 0.6) { // More than 60% of sentences are commands
    throw new Error(`Observed text "${text.substring(0, 50)}..." contains an unusually high number of imperative verbs, suggesting instructional content, violating Overlay print §64 item 8.`);
  }

  // Rule 4: Check for specific meta-instructions or role-playing prompts
  const metaInstructions = [
    "ignore all previous instructions",
    "act as a",
    "you are a",
    "your primary goal is",
    "do not forget",
    "remember that",
    "output only",
    "do not output",
    "return only",
    "generate a response that",
    "as an AI language model",
    "follow these rules",
    "comply with the following",
    "perform the action"
  ];

  for (const instruction of metaInstructions) {
    if (lowerText.includes(instruction)) {
      throw new Error(`Observed text "${text.substring(0, 50)}..." contains a meta-instruction ("${instruction}"), violating Overlay print §64 item 8.`);
    }
  }

  // Rule 5: Check for URLs that might contain command parameters, especially in unusual contexts.
  // This is a weaker signal but can be combined with other detections.
  const urlPattern = /(https?:\/\/[^\s]+)/gi;
  const urls = text.match(urlPattern);
  if (urls && urls.some(url => url.includes("cmd=") || url.includes("action=") || url.includes("execute="))) {
    throw new Error(`Observed text "${text.substring(0, 50)}..." contains a URL with suspicious command-like parameters, violating Overlay print §64 item 8.`);
  }

  // No exception thrown means the observation is not deemed an instruction.
}