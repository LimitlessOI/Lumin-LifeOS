/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    ENHANCED FILE EXTRACTOR                                        ║
 * ║                    Robust extraction from multiple AI response formats          ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Extract files from AI response using multiple strategies
 */
export function extractFiles(response) {
  if (!response || typeof response !== 'string') {
    console.warn('⚠️ [FILE-EXTRACTOR] Invalid response');
    return [];
  }

  const files = [];
  
  // Strategy 1: Standard format ===FILE:path=== ... ===END===
  const standardRegex = /===FILE:(.+?)===\s*\n([\s\S]*?)===END===/g;
  let match;
  while ((match = standardRegex.exec(response)) !== null) {
    const filePath = match[1].trim();
    let content = match[2].trim();
    
    // Remove markdown code fences if present
    content = content.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
    
    if (filePath && content && content.length > 10) {
      files.push({ path: filePath, content });
    }
  }

  // Strategy 2: Alternative format FILE:path\n...code...\nEND or next FILE:
  if (files.length === 0) {
    const altRegex = /FILE:\s*(.+?)\n([\s\S]*?)(?=FILE:|END|$)/g;
    while ((match = altRegex.exec(response)) !== null) {
      const filePath = match[1].trim();
      let content = match[2].trim();
      content = content.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
      
      if (filePath && content && content.length > 10) {
        files.push({ path: filePath, content });
      }
    }
  }

  // Strategy 3: Markdown code blocks with file paths in comments or headers
  if (files.length === 0) {
    // Pattern: ```js\n// file: path/to/file.js\ncode...\n```
    const codeBlockRegex = /```(?:javascript|js|typescript|ts|json|sql|python|py)?\n(?:.*?\/\/\s*file:\s*([^\n]+)\n)?([\s\S]*?)```/g;
    const pathMatches = [];
    
    // First, find all file path mentions
    const pathRegex = /(?:file|path|create|modify|update)[:\s]+([^\n]+)/gi;
    let pathMatch;
    while ((pathMatch = pathRegex.exec(response)) !== null) {
      pathMatches.push(pathMatch[1].trim());
    }
    
    // Then extract code blocks
    let blockIndex = 0;
    while ((match = codeBlockRegex.exec(response)) !== null) {
      const filePath = match[1]?.trim() || pathMatches[blockIndex] || `file_${blockIndex + 1}.js`;
      const content = match[2].trim();
      
      if (content && content.length > 10) {
        files.push({ path: filePath, content });
      }
      blockIndex++;
    }
  }

  // Strategy 4: JSON format with files array
  if (files.length === 0) {
    try {
      // Try to find JSON in response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.files && Array.isArray(parsed.files)) {
          parsed.files.forEach((file, i) => {
            if (typeof file === 'object' && file.path && file.content) {
              files.push({ path: file.path, content: file.content });
            } else if (typeof file === 'string') {
              files.push({ path: `file_${i + 1}.js`, content: file });
            }
          });
        } else if (parsed.file && parsed.content) {
          files.push({ path: parsed.file || parsed.path || 'generated.js', content: parsed.content });
        }
      }
    } catch (e) {
      // Not JSON, continue
    }
  }

  // Strategy 5: Numbered file format (File 1: path\n...code...\nFile 2: ...)
  if (files.length === 0) {
    const numberedRegex = /(?:File|file)\s*\d+[:\s]+([^\n]+)\n([\s\S]*?)(?=(?:File|file)\s*\d+:|$)/gi;
    while ((match = numberedRegex.exec(response)) !== null) {
      const filePath = match[1].trim();
      let content = match[2].trim();
      content = content.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
      
      if (filePath && content && content.length > 10) {
        files.push({ path: filePath, content });
      }
    }
  }

  // Strategy 6: Last resort - extract all code blocks and infer paths
  if (files.length === 0) {
    const allCodeBlocks = response.match(/```[\w]*\n([\s\S]*?)```/g);
    if (allCodeBlocks && allCodeBlocks.length > 0) {
      // Try to infer file types from content
      allCodeBlocks.forEach((block, i) => {
        const code = block.replace(/```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
        if (code.length > 10) {
          const extension = inferFileExtension(code);
          files.push({ 
            path: `generated_${i + 1}.${extension}`, 
            content: code 
          });
        }
      });
    }
  }

  // Clean up extracted files
  const cleanedFiles = files.map(file => ({
    path: file.path.replace(/^["']|["']$/g, '').trim(), // Remove quotes
    content: file.content.trim()
  })).filter(file => file.path && file.content && file.content.length > 10);

  if (cleanedFiles.length > 0) {
    console.log(`✅ [FILE-EXTRACTOR] Extracted ${cleanedFiles.length} file(s)`);
  } else {
    console.warn(`⚠️ [FILE-EXTRACTOR] No files extracted. Response length: ${response.length}`);
    console.warn(`⚠️ [FILE-EXTRACTOR] Response preview: ${response.substring(0, 500)}...`);
  }

  return cleanedFiles;
}

/**
 * Infer file extension from code content
 */
function inferFileExtension(code) {
  // SQL
  if (/CREATE\s+TABLE|SELECT|INSERT|UPDATE|DELETE|ALTER/i.test(code)) {
    return 'sql';
  }
  
  // JavaScript/TypeScript
  if (/import\s+.*from|export\s+(?:default\s+)?(?:class|function|const)|function\s+\w+|const\s+\w+\s*=/m.test(code)) {
    return 'js';
  }
  
  // TypeScript (more specific)
  if (/:\s*(?:string|number|boolean|object|Array|Promise)/.test(code)) {
    return 'ts';
  }
  
  // JSON
  if (/^\s*[\{\[]/.test(code.trim()) && /[\}\]]\s*$/.test(code.trim())) {
    try {
      JSON.parse(code);
      return 'json';
    } catch {
      // Not valid JSON
    }
  }
  
  // HTML
  if (/<html|<div|<body|<head|<!DOCTYPE/i.test(code)) {
    return 'html';
  }
  
  // CSS
  if (/\{[^}]*:[^}]*\}/.test(code) && !code.includes('function')) {
    return 'css';
  }
  
  // Python
  if (/def\s+\w+|import\s+\w+|from\s+\w+\s+import/.test(code)) {
    return 'py';
  }
  
  // Default to js
  return 'js';
}

/**
 * Extract files with enhanced logging and validation
 */
export function extractFilesWithValidation(response, context = {}) {
  const files = extractFiles(response);
  
  // Validate extracted files
  const validated = files.map((file, i) => {
    const issues = [];
    
    // Check for empty content
    if (!file.content || file.content.trim().length < 10) {
      issues.push('Content too short or empty');
    }
    
    // Check for placeholders
    if (/TODO|FIXME|XXX|PLACEHOLDER|implement this|add code here/i.test(file.content)) {
      issues.push('Contains placeholders');
    }
    
    // Check for incomplete code
    if (file.content.includes('...') && file.content.split('...').length > 3) {
      issues.push('May contain truncated code');
    }
    
    // Validate file path
    if (!file.path || file.path.length < 1) {
      issues.push('Invalid file path');
    }
    
    return {
      ...file,
      index: i,
      issues,
      valid: issues.length === 0
    };
  });
  
  const validFiles = validated.filter(f => f.valid);
  const invalidFiles = validated.filter(f => !f.valid);
  
  if (invalidFiles.length > 0) {
    console.warn(`⚠️ [FILE-EXTRACTOR] ${invalidFiles.length} file(s) have validation issues:`);
    invalidFiles.forEach(f => {
      console.warn(`   - ${f.path}: ${f.issues.join(', ')}`);
    });
  }
  
  return {
    files: validFiles.map(f => ({ path: f.path, content: f.content })),
    invalid: invalidFiles,
    total: validated.length,
    valid: validFiles.length
  };
}

export default { extractFiles, extractFilesWithValidation };
