/**
 * SYNOPSIS: Registers SecurityRoutes routes/handlers (routes/security-routes.js).
 */
import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const MALWARE_SIGNATURES = [
  // Common malware signatures (hex patterns)
  '4d5a9000', // MZ header (PE executable)
  '7f454c46', // ELF header
  '255044462d', // PDF with potential exploits
  '52617221', // RAR archive
  '504b0304', // ZIP archive (often used for payloads)
  '1f8b08', // GZIP
];

const BLOCKED_EXTENSIONS = [
  '.exe', '.dll', '.bat', '.cmd', '.com', '.scr', '.pif',
  '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.msi',
  '.msp', '.mst', '.ps1', '.psm1', '.psd1', '.cpl', '.reg',
  '.jar', '.class', '.apk', '.ipa', '.deb', '.rpm'
];

const BLOCKED_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-msi',
  'application/x-ms-installer',
  'application/x-msmetafile',
  'application/x-dosexec',
  'application/x-executable',
  'application/x-sh',
  'application/x-httpd-php',
  'application/x-httpd-php-source',
  'application/x-python-code',
  'application/octet-stream' // only block if content is suspicious
];

function getFileHash(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function checkSignature(buffer) {
  const hex = buffer.subarray(0, 64).toString('hex').toLowerCase();
  return MALWARE_SIGNATURES.some(sig => hex.startsWith(sig));
}

function checkExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  return BLOCKED_EXTENSIONS.includes(ext);
}

function checkMimeType(mimetype) {
  return BLOCKED_MIME_TYPES.includes(mimetype);
}

function checkEmbeddedPatterns(buffer) {
  const text = buffer.toString('utf8', 0, Math.min(buffer.length, 1024 * 1024));
  
  // Check for known malware indicators
  const patterns = [
    /powershell\s+-enc/i,
    /cmd\.exe\s+\/c/i,
    /wscript\.shell/i,
    /cscript\.exe/i,
    /regsvr32\s+\/s/i,
    /rundll32\.exe/i,
    /mshta\.exe/i,
    /certutil\s+-urlcache/i,
    /bitsadmin\s+\/transfer/i,
    /schtasks\s+\/create/i,
    /net\s+user/i,
    /net\s+localgroup/i,
    /vssadmin\s+delete/i,
    /cipher\s+\/w/i,
    /takeown\s+\/f/i,
    /icacls\s+\/grant/i,
    /attrib\s+-r\s+-s\s+-h/i,
    /taskkill\s+\/f/i,
    /wmic\s+process/i,
    /psexec/i,
    /mimikatz/i,
    /invoke-mimikatz/i,
    /invoke-obfuscation/i,
    /meterpreter/i,
    /cobaltstrike/i,
    /empire/i,
    /pwned/i
  ];
  
  return patterns.some(pattern => pattern.test(text));
}

function scanFile(file) {
  const issues = [];
  
  // Check file size
  if (file.size === 0) {
    issues.push('Empty file detected');
  }
  
  // Check MIME type
  if (checkMimeType(file.mimetype)) {
    issues.push(`Blocked MIME type: ${file.mimetype}`);
  }
  
  // Check extension
  if (checkExtension(file.originalname)) {
    issues.push(`Blocked file extension: ${path.extname(file.originalname)}`);
  }
  
  // Check file signature
  if (checkSignature(file.buffer)) {
    issues.push('Suspicious file signature detected');
  }
  
  // Check embedded patterns
  if (checkEmbeddedPatterns(file.buffer)) {
    issues.push('Suspicious embedded patterns detected');
  }
  
  // Check for double extensions
  const name = file.originalname.toLowerCase();
  const doubleExtPattern = /\.(jpg|jpeg|png|gif|txt|pdf|doc|docx|xls|xlsx)\.(exe|bat|cmd|js|vbs|ps1|sh|php)$/;
  if (doubleExtPattern.test(name)) {
    issues.push('Double extension detected');
  }
  
  // Check for null bytes (often used to truncate filenames)
  if (file.originalname.includes('\0')) {
    issues.push('Null byte in filename');
  }
  
  // Check for path traversal
  if (path.normalize(file.originalname).includes('..')) {
    issues.push('Path traversal attempt detected');
  }
  
  return {
    clean: issues.length === 0,
    issues,
    hash: getFileHash(file.buffer),
    size: file.size,
    filename: file.originalname,
    mimetype: file.mimetype,
    scannedAt: new Date().toISOString()
  };
}

// Named export for malware scanning functionality
export const malwareScanner = (file) => {
  return scanFile(file);
};

export function registerSecurityRoutes(app) {
  const router = Router();
  
  // Health check for security service
  router.get('/security/status', (req, res) => {
    res.json({
      status: 'ok',
      service: 'malware-scanner',
      version: '1.0.0',
      signatures: MALWARE_SIGNATURES.length,
      blockedExtensions: BLOCKED_EXTENSIONS.length,
      timestamp: new Date().toISOString()
    });
  });
  
  // Scan a single file upload
  router.post('/security/scan', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a file to scan'
      });
    }
    
    try {
      const result = malwareScanner(req.file);
      
      if (result.clean) {
        return res.status(200).json({
          status: 'clean',
          ...result
        });
      } else {
        return res.status(422).json({
          status: 'infected',
          message: 'File failed malware scan',
          ...result
        });
      }
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Malware scan failed',
        error: error.message
      });
    }
  });
  
  // Scan multiple files
  router.post('/security/scan-multiple', upload.array('files', 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please upload at least one file to scan'
      });
    }
    
    try {
      const results = req.files.map(file => malwareScanner(file));
      const allClean = results.every(r => r.clean);
      
      return res.status(allClean ? 200 : 422).json({
        status: allClean ? 'clean' : 'infected',
        message: allClean ? 'All files are clean' : 'One or more files failed malware scan',
        files: results
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Malware scan failed',
        error: error.message
      });
    }
  });
  
  // Scan a base64 encoded file
  router.post('/security/scan-base64', (req, res) => {
    const { filename, mimetype, data } = req.body;
    
    if (!filename || !data) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'filename and data (base64) are required'
      });
    }
    
    try {
      const buffer = Buffer.from(data, 'base64');
      const file = {
        originalname: filename,
        mimetype: mimetype || 'application/octet-stream',
        buffer,
        size: buffer.length
      };
      
      const result = malwareScanner(file);
      
      return res.status(result.clean ? 200 : 422).json({
        status: result.clean ? 'clean' : 'infected',
        ...result
      });
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid base64 data',
        error: error.message
      });
    }
  });
  
  // Get scan history (basic in-memory log)
  const scanHistory = [];
  router.get('/security/history', (req, res) => {
    res.json({
      count: scanHistory.length,
      scans: scanHistory.slice(-100) // Return last 100 scans
    });
  });
  
  // Log scans after each scan
  // Override to add history logging
  app.use('/security', (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      if (data && data.hash) {
        scanHistory.push({
          hash: data.hash,
          status: data.status,
          filename: data.filename,
          size: data.size,
          scannedAt: data.scannedAt || new Date().toISOString()
        });
      }
      return originalJson.call(this, data);
    };
    next();
  });
  
  app.use('/api', router);
  
  return router;
}