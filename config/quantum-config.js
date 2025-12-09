module.exports = {
    providers: {
        ibmq: {
            apiKey: 'YOUR_IBM_Q_API_KEY'
        },
        amazonBraket: {
            accessKeyId: 'YOUR_AWS_ACCESS_KEY_ID',
            secretAccessKey: 'YOUR_AWS_SECRET_ACCESS_KEY',
        }
    },
    algorithms: {
        default: 'qaoa'
    },
    thresholds: {
        quantumAdvantage: 0.7
    }
};