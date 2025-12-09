const axios = require('axios');
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

class NodeManager {
  async registerNode(nodeName, status) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        'INSERT INTO microgrid_nodes (node_name, status) VALUES ($1, $2) RETURNING *',
        [nodeName, status]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async updateNodeStatus(nodeId, newStatus) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        'UPDATE microgrid_nodes SET status = $1, last_updated = NOW() WHERE node_id = $2 RETURNING *',
        [newStatus, nodeId]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async getNodeStatus(nodeId) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        'SELECT * FROM microgrid_nodes WHERE node_id = $1',
        [nodeId]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async connectToNodeApi(nodeId) {
    const node = await this.getNodeStatus(nodeId);
    if (!node) throw new Error('Node not found');
    // Example API call to node
    try {
      const response = await axios.get(`http://api.node/${nodeId}/status`);
      return response.data;
    } catch (error) {
      console.error('Error connecting to node API:', error);
      throw error;
    }
  }
}

module.exports = new NodeManager();