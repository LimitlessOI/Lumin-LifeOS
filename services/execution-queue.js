/**
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import { runFSAR } from "../audit/fsar/fsar_runner.js";
import { evaluateExecutionGate } from "../audit/gating/execution_gate.js";

/**
 * Factory for the Execution Queue.
 *
 * All external dependencies are injected so server.js only wires this up.
 */
export function createExecutionQueue({
  pool,
  modelRouter,
  ideaToImplementationPipeline,
  handleSelfProgramming,
  detectBlindSpots,
  callCouncilWithFailover,
  broadcastToAll,
}) {
  class ExecutionQueue {
    constructor() {
      this.tasks = [];
      this.activeTask = null;
      this.history = [];
    }

    async addTask(type, description, metadata = null) {
      // --- Execution Gate with FSAR (fail-closed) ---
      try {
        const proposalText = `${type}: ${description}`;
        const {
          jsonPath: fsarJsonPath,
          mdPath: fsarMdPath,
          report,
        } = await runFSAR(proposalText);
        const gateDecision = evaluateExecutionGate(report);

        const overrideHumanReview =
          metadata?.override_human_review === true ||
          metadata?.overrideHumanReview === true;

        if (!gateDecision.allow) {
          throw new Error(
            `${gateDecision.reason} (FSAR report: ${fsarJsonPath})`
          );
        }

        if (gateDecision.requires_human_review && !overrideHumanReview) {
          throw new Error(
            `Human review required: ${gateDecision.reason} (FSAR report: ${fsarJsonPath})`
          );
        }

        metadata = {
          ...metadata,
          fsar: {
            json: fsarJsonPath,
            md: fsarMdPath,
            decision: gateDecision,
          },
        };
      } catch (gateError) {
        console.error(`❌ [EXECUTION GATE] Blocked: ${gateError.message}`);
        throw gateError;
      }

      const taskId = `task_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      try {
        await pool.query(
          `INSERT INTO execution_tasks (task_id, type, description, status, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, now())`,
          [
            taskId,
            type,
            description,
            "queued",
            metadata ? JSON.stringify(metadata) : null,
          ]
        );

        const task = {
          id: taskId,
          type,
          description,
          status: "queued",
          metadata,
          createdAt: new Date().toISOString(),
        };
        this.tasks.push(task);

        if (broadcastToAll) {
          broadcastToAll({ type: "task_queued", taskId, taskType: type });
        }
        return taskId;
      } catch (error) {
        console.error("Task add error:", error.message);
        return null;
      }
    }

    async getTaskMetadata(taskId) {
      try {
        const result = await pool.query(
          "SELECT metadata FROM execution_tasks WHERE task_id = $1",
          [taskId]
        );
        if (result.rows.length > 0 && result.rows[0].metadata) {
          return typeof result.rows[0].metadata === "string"
            ? JSON.parse(result.rows[0].metadata)
            : result.rows[0].metadata;
        }
        return null;
      } catch {
        return null;
      }
    }

    async executeNext() {
      if (this.tasks.length === 0) {
        setTimeout(() => this.executeNext(), 5000);
        return;
      }

      const task = this.tasks.shift();
      this.activeTask = task;

      if (!task.metadata && task.id) {
        task.metadata = await this.getTaskMetadata(task.id);
      }

      try {
        await pool.query(
          `UPDATE execution_tasks SET status = 'running' WHERE task_id = $1`,
          [task.id]
        );

        const blindSpots = await detectBlindSpots(task.description, {
          type: task.type,
        });

        // Idea implementation pipeline
        if (task.type === "idea_implementation" || task.type === "build") {
          console.log(
            `🤖 [EXECUTION] Implementing ${task.type} via self-programming: ${task.description.substring(
              0,
              100
            )}...`
          );

          try {
            if (
              task.type === "idea_implementation" &&
              ideaToImplementationPipeline
            ) {
              const pipelineResult =
                await ideaToImplementationPipeline.implementIdea(
                  task.description,
                  {
                    autoDeploy: true,
                    verifyCompletion: true,
                  }
                );

              if (pipelineResult.success) {
                const result = `Idea implemented via pipeline. Pipeline ID: ${
                  pipelineResult.pipelineId
                }. Files: ${
                  pipelineResult.implementation?.filesModified?.join(", ") ||
                  "N/A"
                }`;
                const aiModel = "idea-pipeline";

                await pool.query(
                  `UPDATE execution_tasks SET status = 'completed', result = $1, completed_at = now(), ai_model = $3
                   WHERE task_id = $2`,
                  [result, task.id, aiModel]
                );

                this.history.push({
                  ...task,
                  status: "completed",
                  result,
                  aiModel,
                });
                this.activeTask = null;
                if (broadcastToAll) {
                  broadcastToAll({
                    type: "task_completed",
                    taskId: task.id,
                    result,
                  });
                }
                setTimeout(() => this.executeNext(), 1000);
                return;
              } else {
                throw new Error(
                  pipelineResult.error || "Pipeline implementation failed"
                );
              }
            } else {
              console.log(
                "⚠️ [EXECUTION] Idea-to-Implementation Pipeline not available, using regular execution"
              );
            }
          } catch (error) {
            console.error(
              "❌ [EXECUTION] Pipeline implementation failed:",
              error.message
            );
          }
        }

        // Build tasks via self-programming
        if (task.type === "build") {
          console.log(
            `🔨 [EXECUTION] Building opportunity via self-programming: ${task.description.substring(
              0,
              100
            )}...`
          );

          try {
            const taskMetadata =
              task.metadata ||
              (task.id ? await this.getTaskMetadata(task.id) : null);

            const buildResult = await handleSelfProgramming({
              instruction: task.description,
              autoDeploy:
                taskMetadata?.auto_deploy || taskMetadata?.autoDeploy || false,
              priority: "high",
            });

            if (buildResult && buildResult.ok) {
              const result = `Build completed for opportunity. Files: ${
                buildResult.filesModified?.join(", ") || "N/A"
              }. ${buildResult.deployed ? "✅ Deployed." : ""}`;
              const aiModel = "auto-builder";

              await pool.query(
                `UPDATE execution_tasks SET status = 'completed', result = $1, completed_at = now(), ai_model = $3
                 WHERE task_id = $2`,
                [result, task.id, aiModel]
              );

              this.history.push({
                ...task,
                status: "completed",
                result,
                aiModel,
              });
              this.activeTask = null;
              if (broadcastToAll) {
                broadcastToAll({
                  type: "task_completed",
                  taskId: task.id,
                  result,
                });
              }
              setTimeout(() => this.executeNext(), 1000);
              return;
            } else {
              throw new Error(
                buildResult?.error || "Build implementation failed"
              );
            }
          } catch (buildError) {
            console.error("❌ [EXECUTION] Build error:", buildError.message);
          }
        }

        // General tasks via model router / council
        const routerResult =
          modelRouter &&
          (await modelRouter.route(
            `Execute this task with real-world practicality in mind (but do NOT directly move money or impersonate humans): ${task.description}
        
        Be aware of these blind spots: ${blindSpots
          .slice(0, 3)
          .join(", ")}`,
            {
              taskType: task.type,
              riskLevel: "medium",
              userFacing: false,
            }
          ));

        const result =
          routerResult?.success &&
          routerResult.result
            ? routerResult.result
            : await callCouncilWithFailover(
                `Execute this task with real-world practicality in mind (but do NOT directly move money or impersonate humans): ${task.description}
            
            Be aware of these blind spots: ${blindSpots
              .slice(0, 3)
              .join(", ")}`,
                "ollama_deepseek"
              );

        await pool.query(
          `UPDATE execution_tasks SET status = 'completed', result = $1, completed_at = now(), ai_model = $3
           WHERE task_id = $2`,
          [
            String(result).slice(0, 5000),
            task.id,
            routerResult?.model || "implement-next-idea",
          ]
        );

        this.history.push({
          ...task,
          status: "completed",
          result,
          aiModel: routerResult?.model || "implement-next-idea",
        });
        this.activeTask = null;
        if (broadcastToAll) {
          broadcastToAll({
            type: "task_completed",
            taskId: task.id,
            result,
          });
        }
      } catch (err) {
        await pool.query(
          `UPDATE execution_tasks SET status = 'failed', error = $1, completed_at = now() WHERE task_id = $2`,
          [String(err.message).slice(0, 500), task.id]
        );
        if (broadcastToAll) {
          broadcastToAll({
            type: "task_failed",
            taskId: task.id,
            error: err.message,
          });
        }
        this.history.push({ ...task, status: "failed", error: err.message });
        this.activeTask = null;
      } finally {
        setTimeout(() => this.executeNext(), 1000);
      }
    }

    getStatus() {
      return {
        queued: this.tasks.length,
        active: this.activeTask,
        history: this.history.slice(-50),
      };
    }
  }

  return new ExecutionQueue();
}

