import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const protocolPath = path.join(root, 'docs/constitution/FOUNDER_AI_OPERATING_PROTOCOL.md');
const capsulePath = path.join(root, 'docs/CHATGPT_CONTEXT_CAPSULE.md');

const failures = [];

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    failures.push(`missing required file: ${path.relative(root, filePath)}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function requireText(content, needle, label) {
  if (!content.includes(needle)) failures.push(`missing invariant: ${label}`);
}

const protocol = requireFile(protocolPath);
const capsule = requireFile(capsulePath);

requireText(protocol, 'The BP authors the whole decision tree. Factories only traverse it. They never author the next move.', 'decision-tree law');
requireText(protocol, 'Blueprint Completeness Law', 'blueprint completeness law');
requireText(protocol, 'Conversation Preservation Law', 'conversation preservation law');
requireText(protocol, 'Persistent Context Capsule', 'persistent context capsule law');
requireText(protocol, 'Brainstorm Timebox Rule', 'brainstorm timebox rule');
requireText(protocol, 'ABBOTT', 'Abbott identity');
requireText(protocol, 'COSTELLO', 'Costello identity');
requireText(protocol, 'prose-only governance is not complete', 'enforceability law');
requireText(capsule, 'Taloa', 'current product identity');
requireText(capsule, 'ABBOTT', 'Abbott context identity');
requireText(capsule, 'COSTELLO', 'Costello context identity');
requireText(capsule, '20 minutes', 'default brainstorm timebox');
requireText(capsule, 'Turning the Mac off must not stop Abbott or Costello.', 'remote independence invariant');

if (failures.length) {
  console.error('FOUNDER AI OPERATING PROTOCOL: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('FOUNDER AI OPERATING PROTOCOL: PASS');
