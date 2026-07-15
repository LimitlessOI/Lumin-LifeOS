/**
 * SYNOPSIS: Exports seedLessonsLearned — scripts/memory-seed-lessons.mjs.
 */
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function seedLessonsLearned() {
  try {
    const { stdout, stderr } = await execPromise('npm run memory:seed-lessons');
    
    if (stderr) {
      console.error('Error seeding lessons:', stderr);
      return;
    }
    
    console.log('Lessons seeded successfully:', stdout);
  } catch (error) {
    console.error('Failed to seed lessons:', error);
  }
}
