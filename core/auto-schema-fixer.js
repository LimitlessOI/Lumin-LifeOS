/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    AUTO SCHEMA FIXER                                             ║
 * ║                    Automatically fixes database schema mismatches               ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class AutoSchemaFixer {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.fixHistory = [];
  }

  /**
   * Detect and fix schema mismatches from error messages
   */
  async detectAndFix(errorMessage) {
    // Pattern: column "X" of relation "Y" does not exist
    const columnMatch = errorMessage.match(/column\s+["']([^"']+)["']\s+of\s+relation\s+["']([^"']+)["']\s+does\s+not\s+exist/i);
    
    if (columnMatch) {
      const [, columnName, tableName] = columnMatch;
      return await this.fixMissingColumn(tableName, columnName, errorMessage);
    }

    // Pattern: relation "X" does not exist
    const tableMatch = errorMessage.match(/relation\s+["']([^"']+)["']\s+does\s+not\s+exist/i);
    if (tableMatch) {
      const [, tableName] = tableMatch;
      return await this.fixMissingTable(tableName, errorMessage);
    }

    return { fixed: false, reason: 'No schema error pattern matched' };
  }

  /**
   * Fix missing column by analyzing usage and adding it
   */
  async fixMissingColumn(tableName, columnName, errorContext) {
    try {
      console.log(`🔧 [SCHEMA FIXER] Fixing missing column: ${tableName}.${columnName}`);

      // Use AI to determine column type and default
      const prompt = `Database schema error: Column "${columnName}" does not exist in table "${tableName}".

Error context: ${errorContext}

Based on the column name and context, determine:
1. Column data type (e.g., DECIMAL(15,2), TEXT, INT, BOOLEAN, TIMESTAMPTZ)
2. Default value (if any)
3. Whether it should be NOT NULL

Return JSON: {"type": "DECIMAL(15,2)", "default": "0", "nullable": true}`;

      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 500,
      });

      // Parse AI response
      let columnDef;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          columnDef = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: infer from column name
          columnDef = this.inferColumnType(columnName);
        }
      } catch (e) {
        columnDef = this.inferColumnType(columnName);
      }

      // Add column
      const alterQuery = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnDef.type}${columnDef.default ? ` DEFAULT ${columnDef.default}` : ''}${columnDef.nullable === false ? ' NOT NULL' : ''}`;
      
      await this.pool.query(alterQuery);
      
      console.log(`✅ [SCHEMA FIXER] Added column ${tableName}.${columnName} (${columnDef.type})`);
      
      this.fixHistory.push({
        table: tableName,
        column: columnName,
        action: 'add_column',
        definition: columnDef,
        timestamp: new Date().toISOString(),
      });

      return { fixed: true, action: 'added_column', table: tableName, column: columnName };
    } catch (error) {
      console.error(`❌ [SCHEMA FIXER] Failed to fix column:`, error.message);
      return { fixed: false, error: error.message };
    }
  }

  /**
   * Infer column type from name
   */
  inferColumnType(columnName) {
    const lower = columnName.toLowerCase();
    
    if (lower.includes('revenue') || lower.includes('amount') || lower.includes('cost') || lower.includes('price')) {
      return { type: 'DECIMAL(15,2)', default: '0', nullable: true };
    }
    if (lower.includes('count') || lower.includes('number') || lower.includes('quantity') || lower.includes('tasks')) {
      return { type: 'INT', default: '0', nullable: true };
    }
    if (lower.includes('date') || lower.includes('time') || lower.includes('at')) {
      return { type: 'TIMESTAMPTZ', default: 'NOW()', nullable: true };
    }
    if (lower.includes('status') || lower.includes('type') || lower.includes('category')) {
      return { type: 'VARCHAR(50)', nullable: true };
    }
    if (lower.includes('is_') || lower.includes('has_') || lower.includes('can_')) {
      return { type: 'BOOLEAN', default: 'false', nullable: true };
    }
    
    // Default
    return { type: 'TEXT', nullable: true };
  }

  /**
   * Fix missing table (would need table definition - complex)
   */
  async fixMissingTable(tableName, errorContext) {
    console.log(`⚠️ [SCHEMA FIXER] Missing table detected: ${tableName} - requires manual schema definition`);
    return { fixed: false, reason: 'Table creation requires full schema definition' };
  }
}
