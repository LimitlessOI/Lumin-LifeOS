/**
 * SYNOPSIS: Register autonomous background schedulers at boot time.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { spawn } from 'node:child_process';
import { createAutonomyScheduler } from './schedulers.js';

export function registerOvernightDaemon(logger) {
  const scheduler = createAutonomyScheduler(logger || console);

  // If the env says run the daemon as a persistent child process, spawn it.
  if (process.env.ENABLE_OVERNIGHT_DAEMON === '1') {
    const child = spawn(process.execPath, ['scripts/builderos-overnight-daemon.mjs'], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', (err) => {
      (logger || console).warn('[overnight-daemon] failed to spawn', { error: err.message });
    });
    return child;
  }

  // Otherwise schedule a one-off sweep after the configured delay.
  scheduler.scheduleAutonomyOnce('overnight-daemon-once', Number(process.env.OVERNIGHT_DAEMON_DELAY_MS) || 60000, async () => {
    const { runOnce } = await import('../scripts/builderos-overnight-daemon.mjs');
    await runOnce();
  });

  return scheduler;
}

export function registerAllSchedulers(logger) {
  registerOvernightDaemon(logger);
}
