/**
 * SYNOPSIS: Exports consolidateLuminMemoryVariants — scripts/folderCleanup.mjs.
 */
import fs from 'fs/promises';
import path from 'path';

export async function consolidateLuminMemoryVariants(baseDir) {
  try {
    const files = await fs.readdir(baseDir);
    const luminVariants = files.filter(file => file.includes('Lumin-Memory'));
    
    if (luminVariants.length > 1) {
      const consolidatedContent = await Promise.all(
        luminVariants.map(file => fs.readFile(path.join(baseDir, file), 'utf-8'))
      );
      
      await fs.writeFile(
        path.join(baseDir, 'Lumin-Memory-Consolidated.txt'),
        consolidatedContent.join('\n')
      );
      
      // Delete the original variant files
      await Promise.all(
        luminVariants.map(file => fs.unlink(path.join(baseDir, file)))
      );
    }
  } catch (error) {
    console.error('Error consolidating Lumin-Memory variants:', error);
  }
}

export async function delete404Stubs(baseDir) {
  try {
    const files = await fs.readdir(baseDir);
    const stubs = files.filter(file => file.includes('404'));

    await Promise.all(
      stubs.map(file => fs.unlink(path.join(baseDir, file)))
    );
  } catch (error) {
    console.error('Error deleting 404 stubs:', error);
  }
}

export async function updateConversationDumpIdeasIndex(baseDir, newPath) {
  try {
    const indexPath = path.join(baseDir, 'CONVERSATION_DUMP_IDEAS_INDEX.txt');
    const content = await fs.readFile(indexPath, 'utf-8');
    const updatedContent = content.replace(/path: .*/g, `path: ${newPath}`);
    await fs.writeFile(indexPath, updatedContent);
  } catch (error) {
    console.error('Error updating CONVERSATION_DUMP_IDEAS_INDEX paths:', error);
  }
}