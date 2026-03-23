/**
 * Self-programming service: handleSelfProgramming (internal) and HTTP handler.
 * All dependencies are provided via getDeps() so server.js can wire and mutate over time.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import path from "path";
import { pathToFileURL } from "url";

function normalizeSelfProgramPayload(payload = {}) {
  const instructionCandidate =
    typeof payload.instruction === "string" ? payload.instruction.trim() : "";

  if (instructionCandidate) {
    return { instruction: instructionCandidate, generatedFrom: "instruction" };
  }

  if (typeof payload.objective === "string" && payload.objective.trim()) {
    return {
      instruction: `Implement objective: ${payload.objective.trim()}`,
      generatedFrom: "objective",
    };
  }

  if (typeof payload.goal === "string" && payload.goal.trim()) {
    return {
      instruction: `Implement goal: ${payload.goal.trim()}`,
      generatedFrom: "goal",
    };
  }

  return { instruction: null, generatedFrom: null };
}

async function extractFileChanges(codeResponse, __dirname) {
  const changes = [];
  if (!codeResponse || typeof codeResponse !== "string") {
    console.warn("⚠️ extractFileChanges: Invalid codeResponse");
    return changes;
  }

  try {
    try {
      const extPath = path.join(__dirname, "core", "enhanced-file-extractor.js");
      const { extractFilesWithValidation } = await import(pathToFileURL(extPath).href);
      const result = extractFilesWithValidation(codeResponse, {
        source: "self-programming",
      });

      if (result.files.length > 0) {
        console.log(`📝 [EXTRACT] Extracted ${result.files.length} file(s) using enhanced extractor`);
        return result.files.map((f) => ({ filePath: f.path, content: f.content }));
      }
      if (result.invalid?.length > 0) {
        console.warn(`⚠️ [EXTRACT] Enhanced extractor found ${result.invalid.length} invalid file(s), trying fallback`);
      }
    } catch (importError) {
      console.warn(`⚠️ [EXTRACT] Could not load enhanced extractor: ${importError.message}`);
    }

    const fileRegex = /===FILE:(.*?)===\s*\n([\s\S]*?)===END===/g;
    let match;
    while ((match = fileRegex.exec(codeResponse)) !== null) {
      const filePath = match[1].trim();
      const content = match[2].trim();
      if (filePath && content && content.length > 10) {
        changes.push({ filePath, content });
      }
    }

    if (changes.length === 0) {
      const codeBlockRegex = /```(?:javascript|js|typescript|ts)?\n(?:.*?\/\/\s*file:\s*([^\n]+)\n)?([\s\S]*?)```/g;
      let blockMatch;
      while ((blockMatch = codeBlockRegex.exec(codeResponse)) !== null) {
        const filePath = blockMatch[1]?.trim() || "unknown.js";
        const content = blockMatch[2]?.trim() || "";
        if (content && content.length > 10) {
          changes.push({ filePath, content });
        }
      }
    }

    console.log(`📝 [EXTRACT] Extracted ${changes.length} file change(s) from AI response`);
    return changes;
  } catch (error) {
    console.error("Error extracting file changes:", error.message);
    return changes;
  }
}

/**
 * @param {() => object} getDeps - Returns current deps: pool, path, fs, fsPromises, __dirname, readFile, writeFile, execAsync,
 *   createSystemSnapshot, rollbackToSnapshot, sandboxTest, callCouncilWithFailover, callCouncilMember, detectBlindSpots,
 *   getCouncilConsensus, GITHUB_TOKEN, commitToGitHub, selfBuilder, triggerDeployment, postUpgradeChecker, logMonitor
 */
export function createSelfProgrammingService(getDeps) {
  async function handleSelfProgramming(options = {}, req = null) {
    const deps = getDeps();
    const {
      pool,
      path: pathMod,
      fs,
      fsPromises,
      __dirname: rootDir,
      execAsync: execAsyncFn,
      createSystemSnapshot: createSnapshot,
      rollbackToSnapshot: rollback,
      sandboxTest: sandboxTestFn,
      callCouncilWithFailover: councilFailover,
      detectBlindSpots: detectBlindSpotsFn,
      getCouncilConsensus,
      GITHUB_TOKEN: ghToken,
      commitToGitHub: commitToGitHubFn,
      selfBuilder: selfBuilderRef,
    } = deps;

    const {
      priority = "medium",
      filePath,
      search,
      replace,
      autoDeploy = false,
    } = options;

    const normalized = normalizeSelfProgramPayload(options);
    const { instruction, generatedFrom } = normalized;

    if (!instruction) {
      return { ok: false, error: "Instruction required" };
    }

    console.log("[SELF-PROGRAM] Running handler with", {
      instruction: instruction.substring(0, 120),
      generatedFrom,
    });

    try {
      let codebaseReader, dependencyManager, errorRecovery, migrationGenerator;
      try {
        const codebaseReaderPath = pathMod.join(rootDir, "core", "codebase-reader.js");
        const codebaseReaderModule = await import(pathToFileURL(codebaseReaderPath).href);
        codebaseReader = codebaseReaderModule.codebaseReader || codebaseReaderModule.default;
        const dependencyManagerModule = await import(pathToFileURL(pathMod.join(rootDir, "core", "dependency-manager.js")).href);
        dependencyManager = dependencyManagerModule.dependencyManager || dependencyManagerModule.default;
        const errorRecoveryModule = await import(pathToFileURL(pathMod.join(rootDir, "core", "error-recovery.js")).href);
        const ErrorRecovery = errorRecoveryModule.default || errorRecoveryModule.ErrorRecovery;
        errorRecovery = new ErrorRecovery(3, councilFailover);
        const migrationGeneratorModule = await import(pathToFileURL(pathMod.join(rootDir, "core", "migration-generator.js")).href);
        migrationGenerator = migrationGeneratorModule.migrationGenerator || migrationGeneratorModule.default;
        console.log("✅ [SELF-PROGRAM] Enhanced self-programming modules loaded");
      } catch (importError) {
        console.warn(`⚠️ [SELF-PROGRAM] Could not load enhancement modules: ${importError.message}`);
      }

      const analysisPrompt = `As the AI Council, analyze this self-programming instruction:

"${instruction}"

Provide:
1. Which files need modification
2. Exact code changes needed
3. Potential risks and blind spots
4. Testing strategy
5. Rollback plan`;

      const analysis = await councilFailover(analysisPrompt, "chatgpt");
      const blindSpots = await detectBlindSpotsFn(instruction, { type: "self-programming" });

      let existingContext = {};
      let targetFiles = [];
      if (codebaseReader) {
        try {
          targetFiles = await codebaseReader.identifyRelatedFiles(instruction, []);
          existingContext = await codebaseReader.buildContext(targetFiles);
          if (Object.keys(existingContext).length > 0) {
            console.log(`📖 [SELF-PROGRAM] Read context from ${Object.keys(existingContext).length} file(s)`);
          }
        } catch (contextError) {
          console.warn(`⚠️ [SELF-PROGRAM] Could not read codebase context: ${contextError.message}`);
        }
      }

      const contextSection = Object.keys(existingContext).length > 0
        ? `\n\nEXISTING CODEBASE CONTEXT (integrate with this code):
${Object.entries(existingContext).map(([file, content]) =>
  `===FILE:${file}===\n${content.substring(0, 5000)}\n===END===`
).join("\n\n")}

IMPORTANT: When modifying existing files, preserve existing functionality and patterns.`
        : "";

      const codePrompt = `You are building this feature RIGHT NOW. Write COMPLETE, WORKING code.

Instruction: ${instruction}

Analysis: ${analysis}

Blind spots to avoid: ${blindSpots.slice(0, 5).join(", ")}${contextSection}

CRITICAL FORMAT REQUIREMENTS:
1. For EACH file, use EXACTLY this format (no variations):
===FILE:path/to/file.js===
[COMPLETE file content here - include ALL code, ALL imports, ALL functions]
===END===

2. Write COMPLETE files - not snippets
3. Include ALL necessary imports at the top
4. NO placeholders like "// add code here"
5. Just write the COMPLETE, WORKING code

Write the code now:`;

      const codeResponse = await councilFailover(codePrompt, "chatgpt", {
        maxTokens: 8000,
        temperature: 0.3,
      });

      if (dependencyManager) {
        try {
          const depResult = await dependencyManager.ensureDependencies(codeResponse);
          if (depResult.installed && depResult.installed.length > 0) {
            console.log(`📦 [SELF-PROGRAM] Installed dependencies: ${depResult.installed.join(", ")}`);
          }
        } catch (depError) {
          console.warn(`⚠️ [SELF-PROGRAM] Dependency check failed: ${depError.message}`);
        }
      }

      let migrationGenerated = null;
      if (migrationGenerator) {
        try {
          const schemaNeeds = await migrationGenerator.detectSchemaNeeds(codeResponse);
          if (schemaNeeds.tables.length > 0) {
            migrationGenerated = await migrationGenerator.generateMigration(
              schemaNeeds,
              `auto_${instruction.substring(0, 30).replace(/\s+/g, "_")}`
            );
          }
        } catch (migrationError) {
          console.warn(`⚠️ [SELF-PROGRAM] Migration generation failed: ${migrationError.message}`);
        }
      }

      let fileChanges = await extractFileChanges(codeResponse, rootDir);
      if (fileChanges.length === 0) {
        const altRegex = /FILE:\s*([^\n]+)\n([\s\S]*?)(?=FILE:|END|$)/g;
        let match;
        while ((match = altRegex.exec(codeResponse)) !== null) {
          fileChanges.push({ filePath: match[1].trim(), content: match[2].trim() });
        }
      }
      if (fileChanges.length === 0) {
        const codeBlockRegex = /```(?:javascript|js|typescript|ts)?\n([\s\S]*?)```/g;
        const pathRegex = /(?:file|path|create|modify)[:\s]+([^\n]+)/i;
        const pathMatch = codeResponse.match(pathRegex);
        let codeMatch;
        while ((codeMatch = codeBlockRegex.exec(codeResponse)) !== null) {
          fileChanges.push({
            filePath: pathMatch ? pathMatch[1].trim() : `new_file_${Date.now()}.js`,
            content: codeMatch[1].trim(),
          });
        }
      }
      if (fileChanges.length === 0) {
        const instructionWords = instruction.toLowerCase();
        let inferredPath = "new_feature.js";
        if (instructionWords.includes("endpoint") || instructionWords.includes("api")) inferredPath = "server.js";
        else if (instructionWords.includes("overlay") || instructionWords.includes("ui")) inferredPath = "public/overlay/index.html";
        fileChanges.push({ filePath: inferredPath, content: codeResponse });
        console.warn(`⚠️ [SELF-PROGRAM] Could not parse file format, using entire response as ${inferredPath}`);
      }

      const results = [];
      const filePathsToSnapshot = fileChanges.map((c) => c.filePath);
      if (migrationGenerated) filePathsToSnapshot.push(migrationGenerated.filepath);

      const snapshotId = await createSnapshot(
        `Before self-programming: ${instruction.substring(0, 50)}...`,
        filePathsToSnapshot
      );

      const writeFilesOperation = async () => {
        const writeResults = [];
        for (const change of fileChanges) {
          try {
            const fullPath = pathMod.join(rootDir, change.filePath);
            const isNewFile = !fs.existsSync(fullPath);
            const isJsFile = change.filePath.endsWith(".js");
            const shouldSandbox = !isNewFile && isJsFile && (
              change.filePath.includes("server.js") ||
              change.filePath.includes("core/") ||
              change.filePath.includes("package.json")
            );

            if (shouldSandbox) {
              const sandboxResult = await sandboxTestFn(change.content, `Test: ${change.filePath}`);
              if (!sandboxResult.success) {
                writeResults.push({ filePath: change.filePath, success: false, error: `Sandbox test failed: ${sandboxResult.error}` });
                continue;
              }
            }

            const backupPath = isNewFile ? null : `${fullPath}.backup.${Date.now()}`;
            if (backupPath) await fsPromises.copyFile(fullPath, backupPath);
            const dir = pathMod.dirname(fullPath);
            if (!fs.existsSync(dir)) await fsPromises.mkdir(dir, { recursive: true });

            try {
              const codeValidatorModule = await import(pathToFileURL(pathMod.join(rootDir, "core", "code-validator.js")).href);
              const codeValidator = codeValidatorModule.codeValidator || codeValidatorModule.default;
              const validationResult = await codeValidator.validateFile(change.filePath, change.content);
              if (!validationResult.valid) {
                const securityErrors = validationResult.issues.filter((i) => i.type === "security" && i.severity === "error");
                if (securityErrors.length > 0) {
                  writeResults.push({ filePath: change.filePath, success: false, error: `Security validation failed: ${securityErrors[0].message}` });
                  continue;
                }
              }
            } catch (validationError) {
              console.warn(`⚠️ [SELF-PROGRAM] Could not validate ${change.filePath}: ${validationError.message}`);
            }

            await fsPromises.writeFile(fullPath, change.content, "utf-8");
            if (dependencyManager && isJsFile) {
              try { await dependencyManager.ensureDependencies(change.content); } catch (e) { /* ignore */ }
            }

            if (isJsFile) {
              try {
                await execAsyncFn(`node --check "${fullPath}"`);
              } catch (syntaxError) {
                if (backupPath && fs.existsSync(backupPath)) {
                  await fsPromises.copyFile(backupPath, fullPath);
                  await fsPromises.unlink(backupPath);
                }
                writeResults.push({ filePath: change.filePath, success: false, error: `Syntax error: ${syntaxError.message}` });
                continue;
              }
            }

            if (codebaseReader) codebaseReader.clearCache(change.filePath);
            writeResults.push({ success: true, filePath: change.filePath, isNewFile, backupPath: backupPath ? backupPath.split("/").pop() : null });
          } catch (error) {
            writeResults.push({ filePath: change.filePath, success: false, error: error.message });
            console.error(`❌ [SELF-PROGRAM] Failed ${change.filePath}:`, error.message);
          }
        }
        return writeResults;
      };

      if (errorRecovery) {
        const recoveryResult = await errorRecovery.withRetry(writeFilesOperation, { instruction, fileChanges: fileChanges.map((c) => c.filePath), rootDir });
        if (recoveryResult.success) results.push(...recoveryResult.result);
        else results.push(...(recoveryResult.result || []));
      } else {
        results.push(...(await writeFilesOperation()));
      }

      let deployed = false;
      if (autoDeploy && ghToken) {
        let buildOk = true;
        try {
          if (selfBuilderRef) {
            const buildLog = await selfBuilderRef.build({
              installDependencies: true,
              validateSyntax: true,
              runTests: true,
              commitChanges: false,
              pushToGit: false,
              triggerDeployment: false,
              strict: true,
            });
            buildOk = !!buildLog.success;
          } else {
            await execAsyncFn("npm test", { cwd: rootDir, timeout: 120000 });
          }
        } catch (e) {
          buildOk = false;
          console.warn(`⚠️ [SELF-PROGRAM] AutoDeploy blocked: ${e.message}`);
        }
        if (buildOk) {
          try {
            await commitToGitHubFn(
              fileChanges.map((c) => c.filePath).join(", "),
              "Self-programming: " + instruction.substring(0, 100),
              instruction
            );
            deployed = true;
          } catch (err) {
            console.log(`⚠️ Deploy failed: ${err.message}`);
          }
        }
      }

      return {
        ok: true,
        filesModified: results.filter((r) => r.success).map((r) => r.filePath),
        taskId: `task_${Date.now()}`,
        snapshotId,
        deployed,
        results,
        migrationGenerated: migrationGenerated ? { filename: migrationGenerated.filename, filepath: migrationGenerated.filepath } : null,
        dependenciesInstalled: !!dependencyManager,
        contextFilesRead: Object.keys(existingContext).length,
      };
    } catch (error) {
      console.error("Self-programming handler error:", error);
      const deps = getDeps();
      if (deps.errorRecovery) {
        const fix = await deps.errorRecovery.generateFix(error, { instruction, rootDir: deps.__dirname });
        if (fix) {
          try { await fix.apply(); } catch (fixError) { console.warn(`⚠️ [SELF-PROGRAM] Fix failed: ${fixError.message}`); }
        }
      }
      return { ok: false, error: error.message };
    }
  }

  async function handleSelfProgramRequest(req, res) {
    const deps = getDeps();
    const {
      path: pathMod,
      fs,
      fsPromises,
      readFile,
      writeFile,
      execAsync: execAsyncFn,
      __dirname: rootDir,
      pool,
      createSystemSnapshot: createSnapshot,
      rollbackToSnapshot: rollback,
      sandboxTest: sandboxTestFn,
      callCouncilWithFailover: councilFailover,
      callCouncilMember,
      detectBlindSpots: detectBlindSpotsFn,
      getCouncilConsensus,
      GITHUB_TOKEN: ghToken,
      commitToGitHub: commitToGitHubFn,
      selfBuilder: selfBuilderRef,
      triggerDeployment,
      postUpgradeChecker,
      logMonitor,
    } = deps;

    try {
      const {
        instruction: rawInstruction,
        objective,
        goal,
        priority = "medium",
        filePath,
        search,
        replace,
        autoDeploy = false,
        jsonOnly = false,
      } = req.body || {};

      const normalized = normalizeSelfProgramPayload({ instruction: rawInstruction, objective, goal });
      const { instruction, generatedFrom } = normalized;

      if (filePath && search && replace) {
        const fullPath = pathMod.join(rootDir, filePath);
        if (!fs.existsSync(fullPath)) {
          return res.status(404).json({ error: `File not found: ${filePath}` });
        }
        const originalContent = await readFile(fullPath, "utf-8");
        if (!originalContent.includes(search)) {
          return res.status(400).json({ error: "Search string not found in file", search: search.substring(0, 100) });
        }
        const newContent = originalContent.replace(search, replace);
        const backupPath = `${fullPath}.backup.${Date.now()}`;
        await writeFile(backupPath, originalContent);
        await writeFile(fullPath, newContent);
        if (filePath.endsWith(".js")) {
          try {
            await execAsyncFn(`node --check ${fullPath}`);
          } catch (error) {
            await writeFile(fullPath, originalContent);
            await fsPromises.unlink(backupPath);
            return res.status(400).json({ error: "Syntax error in modified code, rolled back", details: error.message });
          }
        }
        let deployed = false;
        if (autoDeploy && ghToken) {
          try {
            await commitToGitHubFn(filePath, newContent, instruction || "Self-modification");
            deployed = true;
          } catch (error) {
            console.log(`⚠️ Deploy failed: ${error.message}`);
          }
        }
        return res.json({
          ok: true,
          filePath,
          modified: true,
          backupPath: backupPath.split("/").pop(),
          deployed,
          message: `Successfully modified ${filePath}`,
        });
      }

      if (!instruction) {
        return res.status(400).json({ error: "Instruction or (filePath + search + replace) required" });
      }

      if (jsonOnly) {
        return res.json({ ok: true, model: "chatgpt", date: new Date().toISOString(), generatedFrom, instruction });
      }

      const analysisPrompt = `As the AI Council, analyze this self-programming instruction:

"${instruction}"

Provide:
1. Which files need modification
2. Exact code changes needed
3. Potential risks and blind spots
4. Testing strategy
5. Rollback plan`;

      const analysis = await councilFailover(analysisPrompt, "chatgpt");
      const blindSpots = await detectBlindSpotsFn(instruction, { type: "self-programming" });

      const codePrompt = `You are building this feature RIGHT NOW. Write COMPLETE, WORKING code.

Instruction: ${instruction}

Analysis: ${analysis}

Blind spots: ${blindSpots.slice(0, 5).join(", ")}

CRITICAL: Write COMPLETE files using EXACT format:
===FILE:path/to/file.js===
[COMPLETE file - ALL imports, ALL functions, ALL code - no placeholders]
===END===

Write the complete working code now:`;

      let codeResponse;
      try {
        codeResponse = await getCouncilConsensus(codePrompt, "code_generation");
        if (!codeResponse) {
          codeResponse = await councilFailover(codePrompt, "chatgpt", { maxTokens: 8000, temperature: 0.3 });
        }
      } catch (consensusError) {
        codeResponse = await councilFailover(codePrompt, "chatgpt", { maxTokens: 8000, temperature: 0.3 });
      }

      let fileChanges = await extractFileChanges(codeResponse, rootDir);
      if (fileChanges.length === 0) {
        const altRegex = /FILE:\s*([^\n]+)\n([\s\S]*?)(?=FILE:|END|$)/g;
        let match;
        while ((match = altRegex.exec(codeResponse)) !== null) {
          fileChanges.push({ filePath: match[1].trim(), content: match[2].trim() });
        }
      }
      if (fileChanges.length === 0) {
        const codeBlockRegex = /```(?:javascript|js)?\n([\s\S]*?)```/g;
        const pathMatch = codeResponse.match(/(?:file|path)[:\s]+([^\n]+)/i);
        let codeMatch;
        while ((codeMatch = codeBlockRegex.exec(codeResponse)) !== null) {
          fileChanges.push({
            filePath: pathMatch ? pathMatch[1].trim() : `new_file_${Date.now()}.js`,
            content: codeMatch[1].trim(),
          });
        }
      }
      if (fileChanges.length === 0) {
        return res.status(400).json({
          ok: false,
          error: "Could not extract file changes from AI response",
          instruction: instruction.substring(0, 100),
          responsePreview: codeResponse.substring(0, 500),
          hint: "AI must use format: ===FILE:path/to/file.js===\\n[complete code]\\n===END===",
        });
      }

      const results = [];
      const filePathsToSnapshot = fileChanges.map((c) => c.filePath);
      const snapshotId = await createSnapshot(
        `Before self-programming: ${instruction.substring(0, 50)}...`,
        filePathsToSnapshot
      );

      for (const change of fileChanges) {
        try {
          const fullPath = pathMod.join(rootDir, change.filePath);
          const isNewFile = !fs.existsSync(fullPath);
          const isJsFile = change.filePath.endsWith(".js");
          const isCritical = change.filePath.includes("server.js") || change.filePath.includes("core/");

          if (!isNewFile && isCritical) {
            const sandboxResult = await sandboxTestFn(change.content, `Test: ${change.filePath}`);
            if (!sandboxResult.success) {
              results.push({ success: false, filePath: change.filePath, error: `Sandbox test failed: ${sandboxResult.error}` });
              continue;
            }
          }

          const backupPath = isNewFile ? null : `${fullPath}.backup.${Date.now()}`;
          if (backupPath) await fsPromises.copyFile(fullPath, backupPath);
          const dir = pathMod.dirname(fullPath);
          if (!fs.existsSync(dir)) await fsPromises.mkdir(dir, { recursive: true });

          try {
            const codeValidatorModule = await import(pathToFileURL(pathMod.join(rootDir, "core", "code-validator.js")).href);
            const codeValidator = codeValidatorModule.codeValidator || codeValidatorModule.default;
            const validation = await codeValidator.validateFile(change.filePath, change.content);
            const securityErrors = (validation.issues || []).filter((i) => i.type === "security" && i.severity === "error");
            if (securityErrors.length > 0) {
              results.push({ success: false, filePath: change.filePath, error: `Security validation failed: ${securityErrors[0].message}` });
              continue;
            }
            const codeLinterModule = await import(pathToFileURL(pathMod.join(rootDir, "core", "code-linter.js")).href);
            const codeLinter = codeLinterModule.codeLinter || codeLinterModule.default;
            const lintResult = await codeLinter.lintGeneratedCode(change.filePath, change.content);
            if (!lintResult.valid && lintResult.criticalCount > 0) {
              results.push({ success: false, filePath: change.filePath, error: `Lint failed: ${lintResult.errors?.[0]?.message || "lint errors"}` });
              continue;
            }
          } catch (gateError) {
            if (isCritical) {
              results.push({ success: false, filePath: change.filePath, error: `Pre-write gates failed: ${gateError.message}` });
              continue;
            }
            console.warn(`⚠️ [SELF-PROGRAM] Pre-write gates unavailable: ${gateError.message}`);
          }

          await fsPromises.writeFile(fullPath, change.content, "utf-8");
          if (isJsFile) {
            try {
              await execAsyncFn(`node --check "${fullPath}"`);
            } catch (syntaxError) {
              if (backupPath && fs.existsSync(backupPath)) {
                await fsPromises.copyFile(backupPath, fullPath);
                await fsPromises.unlink(backupPath);
              }
              results.push({ success: false, filePath: change.filePath, error: `Syntax error: ${syntaxError.message}` });
              continue;
            }
          }

          try {
            const securityModule = await import(pathToFileURL(pathMod.join(rootDir, "core", "security-scanner.js")).href);
            const createSecurityScanner = securityModule.createSecurityScanner;
            if (typeof createSecurityScanner === "function") {
              const scanner = createSecurityScanner((member, prompt) => callCouncilMember(member, prompt), pool);
              const scan = await scanner.scanFile(fullPath);
              if (scan?.ok && scan.critical > 0) {
                if (backupPath && fs.existsSync(backupPath)) {
                  await fsPromises.copyFile(backupPath, fullPath);
                  await fsPromises.unlink(backupPath);
                }
                results.push({ success: false, filePath: change.filePath, error: `Security scan blocked deployment: ${scan.critical} critical issue(s)` });
                continue;
              }
            }
          } catch (scanError) {
            console.warn(`⚠️ [SELF-PROGRAM] Security scan skipped: ${scanError.message}`);
          }

          results.push({ success: true, filePath: change.filePath, isNewFile, backupPath: backupPath ? backupPath.split("/").pop() : null });
          console.log(`✅ [SELF-PROGRAM] ${isNewFile ? "Created" : "Modified"}: ${change.filePath}`);
        } catch (error) {
          console.error(`❌ [SELF-PROGRAM] Error ${change.filePath}:`, error.message);
          results.push({ success: false, filePath: change.filePath, error: error.message });
        }
      }

      const successfulChanges = results.filter((r) => r.success).map((r) => r.filePath);
      const failedChanges = results.filter((r) => !r.success).map((r) => ({ filePath: r.filePath, error: r.error }));

      if (successfulChanges.length === 0 && failedChanges.length > 0) {
        await rollback(snapshotId);
      }

      let taskTracker = null;
      let taskId = null;
      if (successfulChanges.length > 0) {
        taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        try {
          const { TaskCompletionTracker } = await import(pathToFileURL(pathMod.join(rootDir, "core", "task-completion-tracker.js")).href);
          taskTracker = new TaskCompletionTracker(pool, callCouncilMember);
          await taskTracker.startTask(taskId, "self_programming", instruction, `Successfully implement: ${instruction}`);
          await taskTracker.addStep(taskId, "code_generation", "completed", { files: successfulChanges });
        } catch (error) {
          console.warn("⚠️ [SELF-PROGRAM] Task tracker not available:", error.message);
        }

        let buildResult = null;
        if (selfBuilderRef) {
          if (taskTracker) await taskTracker.addStep(taskId, "build", "running");
          try {
            buildResult = await selfBuilderRef.build({
              installDependencies: true,
              validateSyntax: true,
              runTests: autoDeploy,
              commitChanges: autoDeploy && ghToken,
              pushToGit: autoDeploy && ghToken,
              triggerDeployment: autoDeploy,
              strict: false,
            });
            if (buildResult.success && taskTracker) await taskTracker.addStep(taskId, "build", "completed", buildResult);
            else if (taskTracker) await taskTracker.addStep(taskId, "build", "completed_with_errors", buildResult);
          } catch (buildError) {
            if (taskTracker) await taskTracker.addStep(taskId, "build", "failed", { error: buildError.message });
          }
        }

        await triggerDeployment(successfulChanges);
        if (taskTracker) await taskTracker.addStep(taskId, "deployment", "triggered");

        if (taskTracker && selfBuilderRef) {
          setTimeout(async () => {
            try {
              const buildId = buildResult?.id || `build_${Date.now()}`;
              const debugResult = await selfBuilderRef.debugAndVerify(buildId, taskId);
              if (taskTracker) await taskTracker.addStep(taskId, "verification", debugResult.allPassed ? "completed" : "failed", debugResult);
              const verificationChecks = [
                { type: "deployment_successful", name: "Deployment Health" },
                { type: "no_errors_in_logs", name: "No Errors in Logs", timeframe: 300 },
                { type: "ai_verification", name: "AI Verification", prompt: `Verify that the task "${instruction}" was completed successfully.` },
              ];
              await taskTracker.verifyCompletion(taskId, verificationChecks);
            } catch (debugError) {
              if (taskTracker) await taskTracker.addStep(taskId, "verification", "failed", { error: debugError.message });
            }
          }, 60000);
        }

        if (postUpgradeChecker) {
          setTimeout(async () => {
            await postUpgradeChecker.checkAfterUpgrade();
            postUpgradeChecker.start();
          }, 10000);
        } else if (logMonitor) {
          setTimeout(async () => {
            await logMonitor.monitorLogs(true);
          }, 10000);
        }
      }

      return res.json({
        ok: successfulChanges.length > 0,
        instruction,
        filesModified: successfulChanges,
        filesFailed: failedChanges,
        deploymentTriggered: successfulChanges.length > 0,
        blindSpotsDetected: blindSpots.length,
        snapshotId,
        results,
        taskId: taskTracker ? taskId : null,
        message: taskTracker
          ? `Task ${taskId} created. System will build, deploy, debug, and verify completion automatically.`
          : "Changes applied. Build and deployment triggered.",
      });
    } catch (error) {
      console.error("Self-programming error:", error);
      res.status(500).json({ ok: false, error: error.message });
    }
  }

  return { handleSelfProgramming, handleSelfProgramRequest, normalizeSelfProgramPayload, extractFileChanges: (codeResponse, __dirname) => extractFileChanges(codeResponse, __dirname) };
}
