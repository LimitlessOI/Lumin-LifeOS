<!-- SYNOPSIS: Documentation — Command Center V2 Blueprint Proof G853 100. -->

// src/types/command.d.ts
interface Command {
  id: string;
  name: string;
  description: string;
}

// src/api/v2/commands/route.ts
import { Router } from 'express';
import { Command } from '../types/command';

const router = Router();

router.get('/api/v2/commands', (req, res) => {
  const commands: Command[] = [
    { id: 'cmd-1', name: 'Command 1', description: 'This is command 1' },
    { id: 'cmd-2', name: 'Command 2', description: 'This is command 2' },
  ];
  res.json(commands);
});

export default router;

// src/api/v2/commands/data.ts
import { Command } from '../types/command';

export const commands: Command[] = [
  { id: 'cmd-1', name: 'Command 1', description: 'This is command 1' },
  { id: 'cmd-2', name: 'Command 2', description: 'This is command 2' },
];