import { LocalModel } from 'ollama';
import { VectorDB } from 'llama.cpp';
import pino from 'pino';

const logger = pino();

export class AgentRuntime {
    private model: LocalModel;
    private vectorDB: VectorDB;

    constructor() {
        this.model = new LocalModel();
        this.vectorDB = new VectorDB();
        logger.info('AgentRuntime initialized.');
    }

    public async loadModel(modelPath: string): Promise<void> {
        try {
            await this.model.load(modelPath);
            logger.info('Model loaded successfully.');
        } catch (error) {
            logger.error('Failed to load model:', error);
        }
    }

    public async query(input: string): Promise<string> {
        try {
            const result = await this.model.query(input);
            return result;
        } catch (error) {
            logger.error('Error querying model:', error);
            throw error;
        }
    }
}
//