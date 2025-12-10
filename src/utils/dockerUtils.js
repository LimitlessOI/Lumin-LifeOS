const Docker = require('dockerode');
const docker = new Docker();

async function createDockerContainer(imageName) {
  try {
    const container = await docker.createContainer({
      Image: imageName,
      Tty: true
    });
    await container.start();
    return container;
  } catch (error) {
    throw new Error('Error creating Docker container');
  }
}

module.exports = {
  createDockerContainer
};