import { createLibp2p } from 'libp2p';
import { NOISE } from '@chainsafe/libp2p-noise';
import { TCP } from '@libp2p/tcp';
import { Mplex } from '@libp2p/mplex';
import { PeerId } from '@libp2p/peer-id';
import pino from 'pino';

const logger = pino();

export class P2PManager {
    private node: any;

    constructor() {
        this.node = null;
    }

    public async start(): Promise<void> {
        try {
            this.node = await createLibp2p({
                modules: {
                    transport: [TCP],
                    streamMuxer: [Mplex],
                    connEncryption: [NOISE]
                },
                peerId: await PeerId.create()
            });
            await this.node.start();
            logger.info('P2P node started.');
        } catch (error) {
            logger.error('Failed to start P2P node:', error);
        }
    }

    public async stop(): Promise<void> {
        if (this.node) {
            await this.node.stop();
            logger.info('P2P node stopped.');
        }
    }
}
//