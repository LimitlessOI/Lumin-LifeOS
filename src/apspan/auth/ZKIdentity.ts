import { groth16 } from 'snarkjs';
import pino from 'pino';

const logger = pino();

export class ZKIdentity {
    private provingKey: any;
    private verificationKey: any;

    constructor(provingKey: any, verificationKey: any) {
        this.provingKey = provingKey;
        this.verificationKey = verificationKey;
        logger.info('ZKIdentity initialized.');
    }

    public async generateProof(input: any): Promise<any> {
        try {
            const proof = await groth16.fullProve(input, this.provingKey);
            logger.info('Proof generated.');
            return proof;
        } catch (error) {
            logger.error('Failed to generate proof:', error);
            throw error;
        }
    }

    public async verifyProof(proof: any): Promise<boolean> {
        try {
            const result = await groth16.verify(this.verificationKey, proof.publicSignals, proof.proof);
            logger.info('Proof verified:', result);
            return result;
        } catch (error) {
            logger.error('Failed to verify proof:', error);
            throw error;
        }
    }
}
//