const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class DiscoveryScanner {
    constructor(options = {}) {
        this.rootDir = options.rootDir || process.cwd();
        this.excludeDirs = options.excludeDirs || ['node_modules', '.git', '.next', 'dist', 'build'];
        this.excludeFiles = options.excludeFiles || ['.env', '.env.local', '.env.production'];
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        this.sensitivePatterns = options.sensitivePatterns || [
            /password\s*[:=]/i,
            /api[_-]?key/i,
            /secret/i,
            /token/i,
            /private[_-]?key/i
        ];
        this.fileTypes = {
            code: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rb', '.php'],
            config: ['.json', '.yaml', '.yml', '.toml', '.env', '.config'],
            documentation: ['.md', '.txt', '.rst'],
            other: []
        };
    }

    async scan() {
        console.log(`Starting discovery scan at: ${this.rootDir}`);
        const startTime = Date.now();
        
        const results = {
            summary: {
                totalFiles: 0,
                totalSize: 0,
                byType: {},
                sensitiveFiles: [],
                largeFiles: [],
                scanDuration: 0
            },
            files: [],
            dependencies: {
                internal: new Set(),
                external: new Set()
            },
            risks: {
                sensitiveData: [],
                performanceConcerns: [],
                missingContext: []
            }
        };

        try {
            await this._scanDirectory(this.rootDir, results);
            
            // Post-process results
            results.summary.scanDuration = Date.now() - startTime;
            results.summary.byType = this._categorizeByType(results.files);
            results.dependencies.internal = Array.from(results.dependencies.internal);
            results.dependencies.external = Array.from(results.dependencies.external);
            
            // Analyze risks
            this._analyzeRisks(results);
            
            console.log(`Discovery scan completed in ${results.summary.scanDuration}ms`);
            return results;
            
        } catch (error) {
            console.error('Discovery scan failed:', error);
            throw error;
        }
    }

    async _scanDirectory(currentPath, results) {
        const items = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(currentPath, item.name);
            
            // Skip excluded directories
            if (item.isDirectory()) {
                if (this.excludeDirs.includes(item.name)) {
                    continue;
                }
                await this._scanDirectory(fullPath, results);
                continue;
            }
            
            // Skip excluded files
            if (this.excludeFiles.includes(item.name)) {
                continue;
            }
            
            await this._processFile(fullPath, results);
        }
    }

    async _processFile(filePath, results) {
        try {
            const stats = await fs.stat(filePath);
            const fileSize = stats.size;
            const ext = path.extname(filePath).toLowerCase();
            
            // Track file
            const fileRecord = {
                path: filePath,
                size: fileSize,
                extension: ext,
                type: this._getFileType(ext),
                lastModified: stats.mtime,
                sensitive: false,
                contentSample: ''
            };
            
            results.files.push(fileRecord);
            results.summary.totalFiles++;
            results.summary.totalSize += fileSize;
            
            // Check for large files
            if (fileSize > this.maxFileSize) {
                results.summary.largeFiles.push({
                    path: filePath,
                    size: fileSize
                });
                results.risks.performanceConcerns.push(
                    `Large file detected: ${filePath} (${this._formatBytes(fileSize)})`
                );
            }
            
            // Read and analyze content for certain file types
            if (this._shouldAnalyzeContent(ext) && fileSize <= 1024 * 1024) { // 1MB limit for content analysis
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    fileRecord.contentSample = content.substring(0, 500);
                    
                    // Check for sensitive data
                    const sensitiveMatches = this._checkSensitiveData(content, filePath);
                    if (sensitiveMatches.length > 0) {
                        fileRecord.sensitive = true;
                        results.summary.sensitiveFiles.push({
                            path: filePath,
                            matches: sensitiveMatches
                        });
                        results.risks.sensitiveData.push(
                            `Sensitive data in ${filePath}: ${sensitiveMatches.join(', ')}`
                        );
                    }
                    
                    // Extract dependencies
                    this._extractDependencies(content, filePath, results.dependencies);
                    
                } catch (readError) {
                    // Skip files that can't be read (binary, permissions, etc.)
                }
            }
            
        } catch (error) {
            console.warn(`Could not process file ${filePath}:`, error.message);
        }
    }

    _getFileType(extension) {
        for (const [type, exts] of Object.entries(this.fileTypes)) {
            if (exts.includes(extension)) {
                return type;
            }
        }
        return 'other';
    }

    _shouldAnalyzeContent(extension) {
        const analyzableTypes = [...this.fileTypes.code, ...this.fileTypes.config];
        return analyzableTypes.includes(extension);
    }

    _checkSensitiveData(content, filePath) {
        const matches = [];
        for (const pattern of this.sensitivePatterns) {
            if (pattern.test(content)) {
                matches.push(pattern.toString());
            }
        }
        return matches;
    }

    _extractDependencies(content, filePath, dependencies) {
        // Extract import/require statements
        const importRegex = /(?:import|require|from)\s+['"]([^'"]+)['"]/g;
        const depRegex = /(?:dependencies|devDependencies|peerDependencies).*{([^}]+)}/gs;
        
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const dep = match[1];
            if (dep.startsWith('.') || dep.startsWith('/')) {
                dependencies.internal.add(dep);
            } else if (!dep.startsWith('http')) {
                dependencies.external.add(dep.split('/')[0]);
            }
        }
        
        // Check package.json-like dependencies
        if (filePath.endsWith('package.json') || filePath.endsWith('requirements.txt')) {
            const depMatch = depRegex.exec(content);
            if (depMatch) {
                const depsBlock = depMatch[1];
                const depLines = depsBlock.split('\n');
                for (const line of depLines) {
                    const depMatch = line.match(/"([^"]+)"/);
                    if (depMatch) {
                        dependencies.external.add(depMatch[1]);
                    }
                }
            }
        }
    }

    _categorizeByType(files) {
        const categories = {};
        for (const file of files) {
            categories[file.type] = (categories[file.type] || 0) + 1;
        }
        return categories;
    }

    _analyzeRisks(results) {
        // Check for missing context
        if (results.files.length === 0) {
            results.risks.missingContext.push('No files found - scope may be too restrictive');
        }
        
        // Check for potential dynamic execution
        const dynamicFiles = results.files.filter(f => 
            f.path.includes('eval') || 
            f.path.includes('dynamic') ||
            (f.contentSample && f.contentSample.includes('eval('))
        );
        
        if (dynamicFiles.length > 0) {
            results.risks.missingContext.push(
                `Found ${dynamicFiles.length} files with potential dynamic execution patterns`
            );
        }
        
        // Check for external service references
        const servicePatterns = [
            /api\./,
            /service\./,
            /fetch\(/,
            /axios\./,
            /http[s]?:\/\//
        ];
        
        let serviceCount = 0;
        for (const file of results.files) {
            if (file.contentSample) {
                for (const pattern of servicePatterns) {
                    if (pattern.test(file.contentSample)) {
                        serviceCount++;
                        break;
                    }
                }
            }
        }
        
        if (serviceCount > 0) {
            results.risks.missingContext.push(
                `Found ${serviceCount} files with potential external service dependencies`
            );
        }
    }

    _formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    generateReport(results) {
        const report = {
            timestamp: new Date().toISOString(),
            scanRoot: this.rootDir,
            summary: {
                ...results.summary,
                largeFiles: results.summary.largeFiles.map(f => ({
                    ...f,
                    size: this._formatBytes(f.size)
                }))
            },
            fileBreakdown: results.summary.byType,
            riskAnalysis: {
                sensitiveData: results.risks.sensitiveData.length > 0 ? results.risks.sensitiveData : ['No sensitive data detected'],
                performanceConcerns: results.risks.performanceConcerns.length > 0 ? results.risks.performanceConcerns : ['No performance concerns'],
                missingContext: results.risks.missingContext.length > 0 ? results.risks.missingContext : ['No missing context identified']
            },
            dependencies: {
                internal: results.dependencies.internal.slice(0, 20), // Limit for readability
                external: results.dependencies.external.slice(0, 20),
                totalInternal: results.dependencies.internal.length,
                totalExternal: results.dependencies.external.length
            },
            recommendations: this._generateRecommendations(results)
        };
        
        return report;
    }

    _generateRecommendations(results) {
        const recommendations = [];
        
        if (results.risks.sensitiveData.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                action: 'Review sensitive data handling',
                details: 'Implement environment variables or secure storage for sensitive data'
            });
        }
        
        if (results.summary.largeFiles.length > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                action: 'Optimize large files',
                details: 'Consider splitting or compressing large files to improve performance'
            });
        }
        
        if (results.dependencies.external.length > 50) {
            recommendations.push({
                priority: 'MEDIUM',
                action: 'Audit external dependencies',
                details: 'Review external dependencies for security and maintenance risks'
            });
        }
        
        if (results.risks.missingContext.length > 0) {
            recommendations.push({
                priority: 'LOW',
                action: 'Document external integrations',
                details: 'Create documentation for external services and dynamic execution patterns'
            });
        }
        
        if (recommendations.length === 0) {
            recommendations.push({
                priority: 'LOW',
                action: 'No immediate actions required',
                details: 'System appears well-structured with minimal risks'
            });
        }
        
        return recommendations;
    }
}

module.exports = DiscoveryScanner;