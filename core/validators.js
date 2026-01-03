/**
 * VALIDATORS - The Hallucination Firewall
 * Nothing passes without validation.
 */

let acorn = null;

// Lazy load acorn
async function getAcorn() {
  if (acorn) return acorn;
  try {
    const acornModule = await import('acorn');
    acorn = acornModule.default || acornModule;
    return acorn;
  } catch (e) {
    console.warn('⚠️ [VALIDATORS] acorn not installed. Run: npm install acorn');
    return null;
  }
}

export function validateJavaScript(code) {
  if (!acorn) {
    return { valid: true, warning: 'acorn not installed, skipping syntax check' };
  }
  
  try {
    acorn.parse(code, { ecmaVersion: 2022, sourceType: 'module' });
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: `JS Syntax Error: ${error.message} at line ${error.loc?.line || '?'}`
    };
  }
}

export function validateJSON(text) {
  const patterns = [
    /```json\s*([\s\S]*?)```/,
    /```\s*([\s\S]*?)```/,
    /(\{[\s\S]*\})/,
    /(\[[\s\S]*\])/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const parsed = JSON.parse(match[1].trim());
        return { valid: true, data: parsed };
      } catch (e) {
        continue;
      }
    }
  }
  
  try {
    const parsed = JSON.parse(text.trim());
    return { valid: true, data: parsed };
  } catch (error) {
    return { valid: false, error: `Invalid JSON: ${error.message}` };
  }
}

export function validateSQL(code) {
  const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE'];
  const upperCode = code.toUpperCase();
  const hasSQL = sqlKeywords.some(kw => upperCode.includes(kw));
  
  if (!hasSQL) {
    return { valid: false, error: 'No SQL keywords found' };
  }
  
  if (code.includes('def ') || code.includes('async def')) {
    return { valid: false, error: 'Contains Python code in SQL file' };
  }
  
  return { valid: true };
}

export function validateCSS(code) {
  if (!code.includes('{') || !code.includes('}')) {
    return { valid: false, error: 'No CSS blocks found' };
  }
  
  const codePatterns = ['import ', 'function ', 'def ', 'const ', 'let '];
  for (const pattern of codePatterns) {
    if (code.includes(pattern)) {
      return { valid: false, error: `CSS contains code: ${pattern}` };
    }
  }
  
  return { valid: true };
}

export function validateHTML(code) {
  if (!code.includes('<') || !code.includes('>')) {
    return { valid: false, error: 'No HTML tags found' };
  }
  return { valid: true };
}

const HALLUCINATION_PATTERNS = [
  /I apologize/i,
  /I cannot/i,
  /I don't have/i,
  /As an AI/i,
  /I'm not able/i,
  /I'm sorry/i,
  /Unfortunately/i,
  /I notice that/i,
  /It seems like/i,
  /documentary/i,
  /refrigerator/i,
  /anime/i,
  /mansion/i,
  /workout/i,
  /filmography/i,
  /Jared's/i,
  /cannabushome/i,
  /Healthy Refrigerator/i
];

export function detectHallucination(response) {
  const issues = [];
  
  for (const pattern of HALLUCINATION_PATTERNS) {
    if (pattern.test(response)) {
      issues.push(`Hallucination pattern: ${pattern.toString()}`);
    }
  }
  
  if (response.length < 50) {
    issues.push('Response too short (< 50 chars)');
  }
  
  if (response.trim().startsWith('**') || response.trim().startsWith('###')) {
    issues.push('Starts with markdown instead of code');
  }
  
  return {
    isHallucination: issues.length > 0,
    issues
  };
}

export async function validateFileContent(filename, content) {
  const ext = filename.split('.').pop().toLowerCase();
  
  if (['js', 'mjs', 'jsx'].includes(ext)) {
    return await validateJavaScript(content);
  } else if (ext === 'json') {
    return validateJSON(content);
  } else if (ext === 'sql') {
    return validateSQL(content);
  } else if (ext === 'css') {
    return validateCSS(content);
  } else if (['html', 'htm'].includes(ext)) {
    return validateHTML(content);
  }
  
  return { valid: true, warning: `No validator for .${ext}` };
}

export function extractCode(response, fileType) {
  let code = response;
  
  const codeBlockMatch = response.match(/```(?:javascript|js|html|css|sql|python|py|json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    code = codeBlockMatch[1];
  }
  
  const lines = code.split('\n');
  const starters = {
    'js': ['const ', 'let ', 'var ', 'function ', 'import ', 'require(', 'module.', '//', '/*', 'class ', "'use strict'"],
    'html': ['<!', '<html', '<head', '<body', '<div', '<!--'],
    'css': ['.', '#', '@', '/*', 'body', 'html', ':root'],
    'sql': ['SELECT', 'CREATE', 'INSERT', 'UPDATE', 'DELETE', '--', '/*', 'DROP'],
    'json': ['{', '[']
  };
  
  const indicators = starters[fileType] || starters['js'];
  let startIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineUpper = line.toUpperCase();
    if (indicators.some(ind => line.startsWith(ind) || lineUpper.startsWith(ind.toUpperCase()))) {
      startIndex = i;
      break;
    }
  }
  
  return lines.slice(startIndex).join('\n').trim();
}

export async function validateResponse(response, expectedType, filename = null) {
  const results = {
    passed: true,
    errors: [],
    warnings: []
  };
  
  const hallucination = detectHallucination(response);
  if (hallucination.isHallucination) {
    results.passed = false;
    results.errors.push(...hallucination.issues);
  }
  
  if (expectedType === 'json') {
    const jsonResult = validateJSON(response);
    if (!jsonResult.valid) {
      results.passed = false;
      results.errors.push(jsonResult.error);
    } else {
      results.data = jsonResult.data;
    }
  }
  
  if (filename && expectedType !== 'json') {
    const code = extractCode(response, expectedType);
    const fileResult = await validateFileContent(filename, code);
    if (!fileResult.valid) {
      results.passed = false;
      results.errors.push(fileResult.error);
    }
    if (fileResult.warning) {
      results.warnings.push(fileResult.warning);
    }
  }
  
  return results;
}
