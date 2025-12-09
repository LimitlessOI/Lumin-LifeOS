const amqp = require('amqplib');

async function setupRabbitMQ() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        await channel.assertQueue('task_queue', { durable: true });
        console.log('RabbitMQ setup complete');
    } catch (error) {
        console.error('Error setting up RabbitMQ:', error);
    }
}

module.exports = setupRabbitMQ;