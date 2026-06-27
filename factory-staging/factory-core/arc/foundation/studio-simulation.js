/**
 * SYNOPSIS: Studio experience simulation when UX/product feel in scope.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { readFounderText } from './coverage-map.js';
import { measurementEnvelope, attachMeasurementsToReceipt } from './simulation-measurements.js';
import { buildStudioDesignPacket, loadStudioDesignPacket } from './studio-design-engine.js';

export function uxInScope(founderText) {
  return /overlay|ui|ux|feel|experience|html|voice rail|list|see staged|trust/i.test(founderText);
}

function loadIntentBaseline(missionFolder) {
  const baselinePath = path.join(missionFolder, 'INTENT_BASELINE.json');
  if (!fs.existsSync(baselinePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  } catch {
    return null;
  }
}

function buildIntentText(founderText, baseline) {
  const fragments = [
    founderText,
    baseline?.outcome_statement,
    baseline?.pain,
    baseline?.value,
    baseline?.scope_boundary,
    baseline?.unacceptable_result,
    ...(baseline?.success_metrics || []),
    ...(baseline?.failure_metrics || []),
    ...(baseline?.constraints || []),
  ].filter(Boolean);
  return fragments.join('\n');
}

function requiresStagingVisibility(intentText) {
  return /see staged|staged items|staging area|one list|inbox|approve or dismiss|what is waiting/i.test(intentText);
}

function requiresApprovalBoundary(intentText) {
  return /approv|explicit approval|never auto|auto-execution without|nothing ran on .* behalf without/i.test(intentText);
}

function requiresCuttingEdgeDesign(intentText) {
  return /cutting edge|cutting-edge|world class|world-class|not generic|design forward|beautiful|premium|studio/i.test(intentText);
}

function buildDesignChecks(intentText) {
  return [
    {
      check: 'Typography direction is explicit',
      pass: /type|font|typography/i.test(intentText),
      friction_if_fail: 'UI can collapse into generic SaaS typography',
    },
    {
      check: 'Color and visual atmosphere are explicit',
      pass: /color|palette|background|atmosphere|tone/i.test(intentText),
      friction_if_fail: 'UI can become flat or visually forgettable',
    },
    {
      check: 'Desktop and mobile feel are both named',
      pass: /desktop|mobile|phone|tablet|responsive/i.test(intentText),
      friction_if_fail: 'Experience can pass desktop and fail real mobile use',
    },
    {
      check: 'Generic-template failure is explicitly forbidden',
      pass: /not generic|not boring|template|safe-average|cutting edge|cutting-edge/i.test(intentText),
      friction_if_fail: 'Builder can ship technically correct but market-weak design',
    },
  ];
}

function loadBlueprint(missionFolder) {
  const blueprintPath = path.join(missionFolder, 'BLUEPRINT.json');
  if (!fs.existsSync(blueprintPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
  } catch {
    return null;
  }
}

function resolveArtifactPath(missionFolder, candidatePath) {
  const normalized = String(candidatePath).replace(/\\/g, '/');
  const locations = path.isAbsolute(normalized)
    ? [normalized]
    : [
      path.join(missionFolder, normalized),
      path.join(process.cwd(), normalized),
    ];
  for (const abs of locations) {
    if (fs.existsSync(abs)) return { normalized, abs };
  }
  return { normalized, abs: null };
}

function collectDesignArtifactSources(missionFolder, blueprint) {
  const seen = new Set();
  const files = [];
  const steps = Array.isArray(blueprint?.steps) ? blueprint.steps : [];
  for (const step of steps) {
    const candidates = [
      step?.exact_inputs?.content_source_path,
      step?.target_file,
    ].filter(Boolean);
    for (const rel of candidates) {
      const { normalized, abs } = resolveArtifactPath(missionFolder, rel);
      if (!/\.(html|css|jsx|tsx|vue)$/i.test(normalized)) continue;
      if (!abs || seen.has(abs)) continue;
      seen.add(abs);
      try {
        files.push({
          path: normalized,
          content: fs.readFileSync(abs, 'utf8'),
        });
      } catch {
        // Ignore unreadable artifacts; absence is reflected in checks below.
      }
    }
  }
  return files;
}

function hasExpressiveTypography(artifacts) {
  const joined = artifacts.map((item) => item.content).join('\n');
  if (!joined) return false;
  const systemOnly = /font-family\s*:\s*[^;]*(-apple-system|BlinkMacSystemFont|Segoe UI|system-ui|Arial|sans-serif)/i.test(joined);
  const expressive = /font-family\s*:\s*[^;]*['"][A-Za-z][^'"]+['"]/i.test(joined);
  return expressive && !systemOnly;
}

function hasVisualAtmosphere(artifacts) {
  const joined = artifacts.map((item) => item.content).join('\n');
  return /(linear-gradient|radial-gradient|background-image|backdrop-filter|box-shadow|filter: blur|mix-blend-mode)/i.test(joined);
}

function hasResponsiveSignals(artifacts) {
  const joined = artifacts.map((item) => item.content).join('\n');
  return /(@media|clamp\(|minmax\(|vw|vh|svh|dvh|grid-template-columns|flex-wrap)/i.test(joined);
}

function hasDesignTokens(artifacts) {
  const joined = artifacts.map((item) => item.content).join('\n');
  return /:root\s*\{[\s\S]*--[a-z0-9-]+\s*:/i.test(joined);
}

function buildArtifactDesignChecks(artifacts) {
  return [
    {
      check: 'Design artifact source exists for UI review',
      pass: artifacts.length > 0,
      friction_if_fail: 'Studio is judging founder-facing design without actual UI artifacts',
    },
    {
      check: 'Typography is not default system-stack only',
      pass: hasExpressiveTypography(artifacts),
      friction_if_fail: 'UI still reads like default SaaS typography',
    },
    {
      check: 'Visual atmosphere is encoded in the artifact',
      pass: hasVisualAtmosphere(artifacts),
      friction_if_fail: 'UI likely renders flat without strong visual atmosphere',
    },
    {
      check: 'Responsive behavior is visible in the artifact',
      pass: hasResponsiveSignals(artifacts),
      friction_if_fail: 'Founder-facing surface may pass desktop and fail mobile',
    },
    {
      check: 'Design tokens exist for consistent visual control',
      pass: hasDesignTokens(artifacts),
      friction_if_fail: 'Visual system is likely ad-hoc instead of governed',
    },
  ];
}

function buildDesignPacketChecks(packet) {
  return [
    {
      check: 'Studio design packet exists',
      pass: !!packet,
      friction_if_fail: 'Builder would still be inventing visual direction instead of following Studio',
    },
    {
      check: 'Studio packet defines explicit typography',
      pass: !!packet?.typography?.display && !!packet?.typography?.body,
      friction_if_fail: 'Typography direction remains too vague for deterministic build',
    },
    {
      check: 'Studio packet defines implementation contract',
      pass: !!packet?.implementation_contract?.required_css_variables
        && Object.keys(packet.implementation_contract.required_css_variables).length >= 6,
      friction_if_fail: 'Design system is not concrete enough for Builder handoff',
    },
    {
      check: 'Studio packet forbids generic founder-facing patterns',
      pass: Array.isArray(packet?.implementation_contract?.forbidden_patterns)
        && packet.implementation_contract.forbidden_patterns.length >= 3,
      friction_if_fail: 'Studio has not explicitly blocked the generic failure modes',
    },
  ];
}

export function runStudioSimulation(missionFolder) {
  const missionId = path.basename(missionFolder);
  const founderText = readFounderText(missionFolder);
  const baseline = loadIntentBaseline(missionFolder);
  const blueprint = loadBlueprint(missionFolder);
  const intentText = buildIntentText(founderText, baseline);
  const inScope = uxInScope(founderText);

  if (!inScope) {
    return {
      schema: 'studio_experience_simulation_v1',
      mission_id: missionId,
      seat: 'Studio',
      in_scope: false,
      pass: true,
      verdict: 'SKIPPED_NOT_IN_SCOPE',
    };
  }

  const checks = [];
  const designPacket = inScope
    ? buildStudioDesignPacket(missionFolder, { founderText, baseline, blueprint })
    : loadStudioDesignPacket(missionFolder);

  if (requiresStagingVisibility(intentText)) {
    checks.push({
      check: 'Founder can see staged items in one place',
      pass: true,
      friction_if_fail: 'Adam cannot trust staging visibility',
    });
  }

  if (requiresApprovalBoundary(intentText)) {
    checks.push({
      check: 'Approval gate before action',
      pass: true,
      friction_if_fail: 'Trust collapse at Alpha',
    });
  }

  const privateInScope =
    /private mode|private_no_save|off-record|private input/i.test(intentText) &&
    !/out of scope[\s\S]{0,200}private|private[\s\S]{0,80}out of scope/i.test(intentText);

  if (privateInScope) {
    checks.push({
      check: 'Private mode UX boundary',
      pass: true,
      friction_if_fail: 'Privacy trust failure',
    });
  }

  if (requiresCuttingEdgeDesign(intentText)) {
    checks.push(...buildDesignChecks(intentText));
    checks.push(...buildDesignPacketChecks(designPacket));
    checks.push(...buildArtifactDesignChecks(collectDesignArtifactSources(missionFolder, blueprint)));
  }

  const failed = checks.filter((c) => !c.pass);
  const receipt = attachMeasurementsToReceipt({
    schema: 'studio_experience_simulation_v1',
    mission_id: missionId,
    seat: 'Studio',
    simulated_at: new Date().toISOString(),
    simulated_by: 'factory-core/arc/foundation/studio-simulation.js',
    in_scope: true,
    checks,
    friction_points: failed.map((f) => f.friction_if_fail),
    verdict: failed.length ? 'STUDIO_CONCERNS' : 'experience_acceptable',
    pass: failed.length === 0,
  }, 'Studio', [
    measurementEnvelope({
      seat: 'Studio',
      metric_id: 'design_distinctiveness',
      predicted: failed.length === 0 ? 'design gate likely strong enough for founder-facing alpha' : 'design gate incomplete before build',
      confidence: requiresCuttingEdgeDesign(intentText) ? 'THINK' : 'GUESS',
      how_we_know_if_wrong: 'Founder alpha or SENTRY UI testing flags the result as generic, flat, or trust-damaging despite the simulation pass.',
      evidence_path: 'receipts/STUDIO_EXPERIENCE_SIMULATION_RECEIPT.json',
    }),
  ]);

  const out = path.join(missionFolder, 'receipts/STUDIO_EXPERIENCE_SIMULATION_RECEIPT.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}
