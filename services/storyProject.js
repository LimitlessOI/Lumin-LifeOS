/**
 * SYNOPSIS: Service module — StoryProject.
 */
const storyProjects = new Map();

function createStoryProject(id, title, content) {
  if (!id || !title || !content) {
    throw new Error('Missing required fields');
  }
  const project = { id, title, content, canon: false };
  storyProjects.set(id, project);
  return project;
}

function getStoryProject(id) {
  if (!id) {
    throw new Error('ID is required');
  }
  return storyProjects.get(id);
}

export { createStoryProject, getStoryProject };
