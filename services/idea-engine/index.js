/**
 * Idea Engine Service
 * Continuous autonomous idea generation and prioritization
 * 
 * Features:
 * - Generates 20 ideas every 30 minutes
 * - Clusters/dedupes ideas using embeddings
 * - Multi-model voting system
 * - Outputs to markdown + JSONL
 * - Creates GitHub issues (optional)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class IdeaEngine {
  constructor(callCouncilMember, modelRegistry, embeddingService) {
    this.callCouncilMember = callCouncilMember;
    this.modelRegistry = modelRegistry;
    this.embeddingService = embeddingService;
    this.ideasDir = path.join(process.cwd(), 'data', 'ideas');
    this.docsDir = path.join(process.cwd(), 'docs', 'ideas');
    this.scheduler = null;
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.ideasDir, this.docsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generate 20 new ideas
   */
  async generateIdeas(count = 20) {
    console.log(`💡 [IDEA ENGINE] Generating ${count} ideas...`);

    const prompt = `Generate ${count} innovative product/feature ideas for an AI Counsel OS system.

For each idea, provide:
1. Title (short, descriptive)
2. Problem (what problem does this solve?)
3. User (who is the target user?)
4. Solution (how does this solve the problem?)
5. Differentiator (what makes this unique?)
6. Effort (easy/medium/hard/very_hard)
7. ROI Hypothesis (estimated return on investment, 1-10 scale)

Focus on:
- Features that leverage local AI models
- Revenue-generating opportunities
- User experience improvements
- Cost optimization
- Privacy-preserving features

Return as JSON array with these exact fields:
[
  {
    "title": "...",
    "problem": "...",
    "user": "...",
    "solution": "...",
    "differentiator": "...",
    "effort": "easy|medium|hard|very_hard",
    "roi_hypothesis": 1-10
  },
  ...
]`;

    try {
      // Use local reasoning model (must match COUNCIL_MEMBERS key)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba1dc292-0bca-4fc6-9635-c7350d04afd2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idea-engine/index.js:82',message:'calling council member',data:{modelKey:'ollama_deepseek_v3',promptLength:prompt?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      const response = await this.callCouncilMember('ollama_deepseek_v3', prompt, {
        useOpenSourceCouncil: true,
        taskType: 'reasoning',
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba1dc292-0bca-4fc6-9635-c7350d04afd2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'idea-engine/index.js:87',message:'council member response received',data:{responseLength:response?.length,hasResponse:!!response},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      // Parse JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const ideas = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize
      const normalized = ideas
        .filter(idea => idea.title && idea.problem && idea.solution)
        .map(idea => this.normalizeIdea(idea))
        .slice(0, count);

      console.log(`✅ [IDEA ENGINE] Generated ${normalized.length} ideas`);
      return normalized;
    } catch (error) {
      console.error('❌ [IDEA ENGINE] Generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Normalize idea to structured schema
   */
  normalizeIdea(idea) {
    return {
      id: `idea_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: String(idea.title || '').trim(),
      problem: String(idea.problem || '').trim(),
      user: String(idea.user || 'general').trim(),
      solution: String(idea.solution || '').trim(),
      differentiator: String(idea.differentiator || '').trim(),
      effort: this.normalizeEffort(idea.effort),
      roi_hypothesis: this.normalizeScore(idea.roi_hypothesis),
      // Will be filled by voting
      novelty: null,
      feasibility: null,
      user_impact: null,
      revenue_potential: null,
      time_to_demo: null,
      strategic_alignment: null,
      ensemble_score: null,
      cluster_id: null,
      created_at: new Date().toISOString(),
    };
  }

  normalizeEffort(effort) {
    const normalized = String(effort || 'medium').toLowerCase();
    if (['easy', 'medium', 'hard', 'very_hard'].includes(normalized)) {
      return normalized;
    }
    return 'medium';
  }

  normalizeScore(score) {
    const num = Number(score);
    if (isNaN(num) || num < 1) return 1;
    if (num > 10) return 10;
    return Math.round(num);
  }

  /**
   * Cluster ideas using embeddings and similarity
   */
  async clusterIdeas(ideas) {
    console.log(`🔄 [IDEA ENGINE] Clustering ${ideas.length} ideas...`);

    if (ideas.length === 0) return ideas;

    // Generate embeddings for all ideas
    const embeddings = await Promise.all(
      ideas.map(idea => this.getIdeaEmbedding(idea))
    );

    // Calculate similarity matrix
    const clusters = this.performClustering(ideas, embeddings);

    // Assign cluster IDs
    clusters.forEach((cluster, clusterId) => {
      cluster.forEach(ideaIndex => {
        ideas[ideaIndex].cluster_id = `cluster_${clusterId}`;
      });
    });

    console.log(`✅ [IDEA ENGINE] Created ${clusters.length} clusters`);
    return ideas;
  }

  /**
   * Get embedding for an idea
   */
  async getIdeaEmbedding(idea) {
    const text = `${idea.title} ${idea.problem} ${idea.solution}`;
    
    if (this.embeddingService) {
      return await this.embeddingService.embed(text);
    }

    // Fallback: simple hash-based "embedding" (not semantic, but works for deduplication)
    return this.simpleHash(text);
  }

  simpleHash(text) {
    // Simple hash for fallback (not semantic, but good enough for exact duplicates)
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return [hash];
  }

  /**
   * Perform hierarchical clustering
   */
  performClustering(ideas, embeddings, threshold = 0.7) {
    const clusters = [];
    const assigned = new Set();

    for (let i = 0; i < ideas.length; i++) {
      if (assigned.has(i)) continue;

      const cluster = [i];
      assigned.add(i);

      for (let j = i + 1; j < ideas.length; j++) {
        if (assigned.has(j)) continue;

        const similarity = this.cosineSimilarity(embeddings[i], embeddings[j]);
        if (similarity >= threshold) {
          cluster.push(j);
          assigned.add(j);
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * Calculate cosine similarity
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    if (vecA.length === 1) {
      // For simple hash, use exact match
      return vecA[0] === vecB[0] ? 1.0 : 0.0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Have models vote on ideas
   */
  async voteOnIdeas(ideas) {
    console.log(`🗳️ [IDEA ENGINE] Voting on ${ideas.length} ideas...`);

    const votingModels = this.getVotingModels();
    if (votingModels.length === 0) {
      console.warn('⚠️ [IDEA ENGINE] No voting models available, skipping voting');
      return ideas;
    }

    const votingPrompt = (idea) => `Evaluate this product idea and provide scores (1-10) for each criterion:

Title: ${idea.title}
Problem: ${idea.problem}
User: ${idea.user}
Solution: ${idea.solution}
Differentiator: ${idea.differentiator}
Effort: ${idea.effort}
ROI Hypothesis: ${idea.roi_hypothesis}

Provide scores for:
1. Novelty (how new/unique is this?)
2. Feasibility (can we build this?)
3. User Impact (how much will users benefit?)
4. Revenue Potential (money-making potential)
5. Time to Demo (days to working prototype)
6. Strategic Alignment (fits our mission?)

Return as JSON:
{
  "novelty": 1-10,
  "feasibility": 1-10,
  "user_impact": 1-10,
  "revenue_potential": 1-10,
  "time_to_demo": days,
  "strategic_alignment": 1-10
}`;

    // Vote on each idea with multiple models
    for (const idea of ideas) {
      const votes = [];

      for (const model of votingModels) {
        try {
          const response = await this.callCouncilMember(model, votingPrompt(idea), {
            useOpenSourceCouncil: true,
            taskType: 'reasoning',
          });

          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const vote = JSON.parse(jsonMatch[0]);
            votes.push(vote);
          }
        } catch (error) {
          console.warn(`⚠️ [IDEA ENGINE] Voting failed for ${model}:`, error.message);
        }
      }

      // Calculate ensemble scores (average)
      if (votes.length > 0) {
        idea.novelty = this.average(votes.map(v => v.novelty));
        idea.feasibility = this.average(votes.map(v => v.feasibility));
        idea.user_impact = this.average(votes.map(v => v.user_impact));
        idea.revenue_potential = this.average(votes.map(v => v.revenue_potential));
        idea.time_to_demo = Math.round(this.average(votes.map(v => v.time_to_demo || 30)));
        idea.strategic_alignment = this.average(votes.map(v => v.strategic_alignment));

        // Weighted ensemble score
        idea.ensemble_score = this.calculateEnsembleScore(idea, votes.length);
      }
    }

    console.log(`✅ [IDEA ENGINE] Voting complete`);
    return ideas;
  }

  getVotingModels() {
    // Use reasoning models for voting
    // Return COUNCIL_MEMBERS keys (not model registry names)
    // Fallback to known free reasoning models if registry unavailable
    const fallbackModels = [
      'ollama_deepseek_v3',
      'ollama_llama_3_3_70b',
      'ollama_qwen_2_5_72b',
    ];

    if (!this.modelRegistry) {
      return fallbackModels;
    }

    const models = this.modelRegistry?.getModelsByRole('reasoning') || [];
    if (models.length === 0) {
      return fallbackModels;
    }

    // Map model registry names to COUNCIL_MEMBERS keys
    // Pattern: 'deepseek-v3' -> 'ollama_deepseek_v3'
    const modelMap = {
      'deepseek-v3': 'ollama_deepseek_v3',
      'deepseek-r1:32b': 'ollama_deepseek', // Fallback to available model
      'deepseek-r1:70b': 'ollama_deepseek', // Fallback to available model
      'llama3.3:70b-instruct-q4_0': 'ollama_llama_3_3_70b',
      'qwen2.5:72b-q4_0': 'ollama_qwen_2_5_72b',
      'qwen2.5:32b-instruct': 'ollama_qwen_2_5_72b', // Fallback
      'gemma2:27b-it-q4_0': 'ollama_gemma_2_27b',
    };

    return models
      .filter(m => m.cost_class === 'free')
      .slice(0, 3)
      .map(m => modelMap[m.name] || m.name.replace(/[:\-]/g, '_').replace(/^/, 'ollama_'))
      .filter(Boolean); // Remove any undefined mappings
  }

  average(values) {
    const valid = values.filter(v => typeof v === 'number' && !isNaN(v));
    if (valid.length === 0) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  }

  calculateEnsembleScore(idea, voteCount) {
    // Weighted scoring
    const weights = {
      novelty: 0.15,
      feasibility: 0.20,
      user_impact: 0.25,
      revenue_potential: 0.25,
      strategic_alignment: 0.15,
    };

    const score = 
      (idea.novelty || 0) * weights.novelty +
      (idea.feasibility || 0) * weights.feasibility +
      (idea.user_impact || 0) * weights.user_impact +
      (idea.revenue_potential || 0) * weights.revenue_potential +
      (idea.strategic_alignment || 0) * weights.strategic_alignment;

    // Bonus for high vote count (consensus)
    const consensusBonus = Math.min(voteCount / 3, 1) * 0.5;
    
    return Math.min(10, score + consensusBonus);
  }

  /**
   * Save ideas to JSONL and markdown
   */
  async saveIdeas(ideas, date = dayjs().format('YYYY-MM-DD')) {
    // Save to JSONL (append-only)
    const jsonlPath = path.join(this.ideasDir, 'ideas.jsonl');
    const jsonlLines = ideas.map(idea => JSON.stringify(idea)).join('\n') + '\n';
    fs.appendFileSync(jsonlPath, jsonlLines, 'utf8');

    // Save daily markdown report
    const mdPath = path.join(this.docsDir, `${date}.md`);
    const mdContent = this.generateMarkdownReport(ideas, date);
    fs.writeFileSync(mdPath, mdContent, 'utf8');

    console.log(`✅ [IDEA ENGINE] Saved ${ideas.length} ideas to ${jsonlPath} and ${mdPath}`);
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(ideas, date) {
    // Sort by ensemble score
    const sorted = [...ideas].sort((a, b) => 
      (b.ensemble_score || 0) - (a.ensemble_score || 0)
    );

    let md = `# Idea Generation Report - ${date}\n\n`;
    md += `**Generated**: ${ideas.length} ideas\n`;
    md += `**Clusters**: ${new Set(ideas.map(i => i.cluster_id)).size}\n`;
    md += `**Top 10 Ideas** (by ensemble score)\n\n`;

    sorted.slice(0, 10).forEach((idea, index) => {
      md += `## ${index + 1}. ${idea.title}\n\n`;
      md += `**Ensemble Score**: ${(idea.ensemble_score || 0).toFixed(2)}/10\n\n`;
      md += `**Problem**: ${idea.problem}\n\n`;
      md += `**User**: ${idea.user}\n\n`;
      md += `**Solution**: ${idea.solution}\n\n`;
      md += `**Differentiator**: ${idea.differentiator}\n\n`;
      md += `**Effort**: ${idea.effort} | **ROI Hypothesis**: ${idea.roi_hypothesis}/10\n\n`;
      md += `**Scores**:\n`;
      md += `- Novelty: ${(idea.novelty || 0).toFixed(1)}/10\n`;
      md += `- Feasibility: ${(idea.feasibility || 0).toFixed(1)}/10\n`;
      md += `- User Impact: ${(idea.user_impact || 0).toFixed(1)}/10\n`;
      md += `- Revenue Potential: ${(idea.revenue_potential || 0).toFixed(1)}/10\n`;
      md += `- Time to Demo: ${idea.time_to_demo || 'N/A'} days\n`;
      md += `- Strategic Alignment: ${(idea.strategic_alignment || 0).toFixed(1)}/10\n\n`;
      if (idea.cluster_id) {
        md += `**Cluster**: ${idea.cluster_id}\n\n`;
      }
      md += `---\n\n`;
    });

    return md;
  }

  /**
   * Full pipeline: Generate → Cluster → Vote → Save
   */
  async run(count = 20) {
    console.log('🚀 [IDEA ENGINE] Starting full pipeline...');

    try {
      // 1. Generate ideas
      const ideas = await this.generateIdeas(count);

      // 2. Cluster ideas
      const clustered = await this.clusterIdeas(ideas);

      // 3. Vote on ideas
      const voted = await this.voteOnIdeas(clustered);

      // 4. Save ideas
      await this.saveIdeas(voted);

      return {
        success: true,
        count: voted.length,
        clusters: new Set(voted.map(i => i.cluster_id)).size,
        topIdeas: voted
          .sort((a, b) => (b.ensemble_score || 0) - (a.ensemble_score || 0))
          .slice(0, 10),
      };
    } catch (error) {
      console.error('❌ [IDEA ENGINE] Pipeline failed:', error);
      throw error;
    }
  }

  /**
   * Start scheduler (runs every 30 minutes)
   */
  startScheduler(intervalMinutes = 30) {
    if (this.scheduler) {
      console.log('⚠️ [IDEA ENGINE] Scheduler already running');
      return;
    }

    console.log(`⏰ [IDEA ENGINE] Starting scheduler (every ${intervalMinutes} minutes)`);

    // Run immediately
    this.run().catch(err => console.error('Scheduler run failed:', err));

    // Then schedule
    this.scheduler = setInterval(() => {
      this.run().catch(err => console.error('Scheduler run failed:', err));
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop scheduler
   */
  stopScheduler() {
    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
      console.log('⏹️ [IDEA ENGINE] Scheduler stopped');
    }
  }
}

export default IdeaEngine;
