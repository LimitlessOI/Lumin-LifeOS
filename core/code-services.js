/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    CODE GENERATION & REVIEW SERVICES                              ║
 * ║                    Generate code, review code, fix bugs                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class CodeServices {
  constructor(pool, callCouncilMember, modelRouter) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.modelRouter = modelRouter;
  }

  /**
   * Generate code based on requirements
   */
  async generateCode({
    requirements,
    language = 'javascript',
    framework = null,
    style = 'clean',
    includeTests = true,
    includeDocs = true,
  }) {
    console.log(`💻 [CODE SERVICES] Generating ${language} code...`);

    const prompt = `Generate complete, production-ready code based on these requirements:

${requirements}

Language: ${language}
Framework: ${framework || 'none'}
Style: ${style}
Include Tests: ${includeTests}
Include Documentation: ${includeDocs}

Provide:
1. Complete code (all files)
2. Tests (if requested)
3. Documentation
4. Setup instructions
5. Usage examples

Return as JSON with code organized by files.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 4000,
      });

      const codeData = this.parseCodeResponse(response);
      const serviceId = `code_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Store service request
      await this.storeServiceRequest(serviceId, 'generate', {
        requirements,
        language,
        framework,
        codeData,
      });

      return { serviceId, codeData };
    } catch (error) {
      console.error('❌ [CODE SERVICES] Error:', error.message);
      throw error;
    }
  }

  /**
   * Review code
   */
  async reviewCode({
    code,
    language = 'javascript',
    focusAreas = [], // security, performance, best_practices, bugs
  }) {
    console.log(`🔍 [CODE SERVICES] Reviewing code...`);

    const prompt = `Review this code thoroughly:

\`\`\`${language}
${code}
\`\`\`

Focus Areas: ${focusAreas.join(', ') || 'all areas'}

Provide:
1. Security issues
2. Performance issues
3. Bugs and errors
4. Best practice violations
5. Code quality score (0-100)
6. Improvement suggestions
7. Fixed code (if bugs found)

Return as JSON.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 3000,
      });

      const review = this.parseJSONResponse(response);
      const serviceId = `review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await this.storeServiceRequest(serviceId, 'review', {
        code,
        language,
        review,
      });

      return { serviceId, review };
    } catch (error) {
      console.error('❌ [CODE SERVICES] Review error:', error.message);
      throw error;
    }
  }

  /**
   * Fix bugs in code
   */
  async fixBugs({
    code,
    bugs,
    language = 'javascript',
  }) {
    console.log(`🔧 [CODE SERVICES] Fixing bugs...`);

    const prompt = `Fix these bugs in the code:

Code:
\`\`\`${language}
${code}
\`\`\`

Bugs to fix:
${Array.isArray(bugs) ? bugs.join('\n') : bugs}

Provide:
1. Fixed code
2. Explanation of fixes
3. Prevention strategies

Return as JSON.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 3000,
      });

      const fix = this.parseJSONResponse(response);
      const serviceId = `fix_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await this.storeServiceRequest(serviceId, 'fix', {
        code,
        bugs,
        fix,
      });

      return { serviceId, fix };
    } catch (error) {
      console.error('❌ [CODE SERVICES] Fix error:', error.message);
      throw error;
    }
  }

  /**
   * Store service request
   */
  async storeServiceRequest(serviceId, serviceType, data) {
    try {
      await this.pool.query(
        `INSERT INTO code_services 
         (service_id, service_type, request_data, response_data, status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          serviceId,
          serviceType,
          JSON.stringify(data),
          JSON.stringify(data.codeData || data.review || data.fix || {}),
          'completed',
        ]
      );
    } catch (error) {
      console.error('Error storing service request:', error.message);
    }
  }

  /**
   * Parse code response
   */
  parseCodeResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Extract code blocks
      const codeBlocks = response.match(/```[\w]*\n([\s\S]*?)```/g);
      const files = {};
      
      if (codeBlocks) {
        codeBlocks.forEach((block, i) => {
          const code = block.replace(/```[\w]*\n/, '').replace(/```/, '');
          files[`file${i + 1}.${this.detectLanguage(code)}`] = code;
        });
      }
      
      return {
        files,
        documentation: this.extractDocumentation(response),
        setup: this.extractSetup(response),
      };
    } catch (error) {
      console.warn('Failed to parse code response:', error.message);
      return { files: {}, documentation: '', setup: '' };
    }
  }

  detectLanguage(code) {
    if (code.includes('function') && code.includes('const')) return 'js';
    if (code.includes('def ') || code.includes('import ')) return 'py';
    if (code.includes('package ') || code.includes('func ')) return 'go';
    return 'txt';
  }

  extractDocumentation(response) {
    const docMatch = response.match(/##?\s*Documentation[\s\S]*?(?=##|$)/i);
    return docMatch ? docMatch[0] : '';
  }

  extractSetup(response) {
    const setupMatch = response.match(/##?\s*Setup[\s\S]*?(?=##|$)/i);
    return setupMatch ? setupMatch[0] : '';
  }

  /**
   * Parse JSON response (with sanitization)
   */
  parseJSONResponse(response) {
    try {
      // Sanitize JSON to remove comments and trailing commas
      let cleaned = (response || '')
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/,(\s*[}\]])/g, '$1')
        .trim();
      
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(cleaned);
    } catch (error) {
      console.warn('Failed to parse JSON:', error.message);
      return {};
    }
  }
}
