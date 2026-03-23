/**
 * IncomeDroneSystem — basic income drone management.
 * Extracted from server.js. Enhanced version is in core/enhanced-income-drone.js.
 * @ssot docs/projects/AMENDMENT_03_FINANCIAL_REVENUE.md
 */
import logger from '../services/logger.js';
export class IncomeDroneSystem {
  constructor({ pool, updateROI, broadcastToAll } = {}) {
    this.pool = pool;
    this.updateROI = updateROI || (() => {});
    this.broadcastToAll = broadcastToAll || (() => {});
    this.activeDrones = new Map();
  }

  async deployDrone(droneType, expectedRevenue = 500) {
    const droneId = `drone_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    try {
      await this.pool.query(
        `INSERT INTO income_drones (drone_id, drone_type, status, deployed_at, updated_at)
         VALUES ($1, $2, $3, now(), now())`,
        [droneId, droneType, "active"]
      );

      this.activeDrones.set(droneId, {
        id: droneId,
        type: droneType,
        status: "active",
        revenue: 0,
        tasks: 0,
        expectedRevenue,
        deployed: new Date().toISOString(),
      });

      return droneId;
    } catch (error) {
      logger.error(`Drone deployment error: ${error.message}`);
      return null;
    }
  }

  async recordRevenue(droneId, amount, isActual = false) {
    try {
      if (isActual) {
        // ACTUAL revenue - real money received
        await this.pool.query(
          `UPDATE income_drones
           SET revenue_generated = revenue_generated + $1,
               actual_revenue = actual_revenue + $1,
               tasks_completed = tasks_completed + 1,
               updated_at = now()
           WHERE drone_id = $2`,
          [amount, droneId]
        );
        this.updateROI(amount, 0, 0);
        this.broadcastToAll({ type: "revenue_generated", droneId, amount, isActual: true });
      } else {
        // PROJECTED revenue - estimated, not real money yet
        await this.pool.query(
          `UPDATE income_drones
           SET projected_revenue = projected_revenue + $1,
               tasks_completed = tasks_completed + 1,
               updated_at = now()
           WHERE drone_id = $2`,
          [amount, droneId]
        );
        this.broadcastToAll({ type: "revenue_projected", droneId, amount, isActual: false });
      }

      const drone = this.activeDrones.get(droneId);
      if (drone) {
        if (isActual) {
          drone.revenue += amount;
        }
        drone.tasks++;
      }
    } catch (error) {
      logger.error(`Revenue update error: ${error.message}`);
    }
  }

  async getStatus() {
    try {
      const result = await this.pool.query(
        `SELECT drone_id, drone_type, status, revenue_generated, actual_revenue, projected_revenue, tasks_completed
         FROM income_drones WHERE status = 'active' ORDER BY deployed_at DESC`
      );
      const totalActual = result.rows.reduce(
        (sum, d) => sum + parseFloat(d.actual_revenue || 0),
        0
      );
      const totalProjected = result.rows.reduce(
        (sum, d) => sum + parseFloat(d.projected_revenue || 0),
        0
      );
      return {
        active: result.rows.length,
        drones: result.rows,
        total_revenue: totalActual, // Only actual revenue
        actual_revenue: totalActual,
        projected_revenue: totalProjected,
        revenue_generated: totalActual, // Backward compatibility
      };
    } catch (error) {
      return { active: 0, drones: [], total_revenue: 0, actual_revenue: 0, projected_revenue: 0 };
    }
  }
}

export default IncomeDroneSystem;
