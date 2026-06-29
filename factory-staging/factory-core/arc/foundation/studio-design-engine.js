/**
 * SYNOPSIS: Deterministic Studio design engine — emits governed UI direction for BuilderOS.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';

function readJson(absPath) {
  if (!fs.existsSync(absPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return null;
  }
}

function detectSurface(intentText) {
  if (/voice rail|voice|mic|speech|talk/i.test(intentText)) return 'voice_command_surface';
  if (/dashboard|cockpit|command center|control center/i.test(intentText)) return 'operational_dashboard';
  if (/mobile|phone|ios|android/i.test(intentText)) return 'mobile_product_surface';
  if (/overlay|landing|marketing|homepage/i.test(intentText)) return 'immersive_overlay_surface';
  return 'founder_product_surface';
}

function detectMood(intentText) {
  if (/calm|therap|healing|private|safe/i.test(intentText)) return 'calm_precision';
  if (/premium|luxury|high end|elegant/i.test(intentText)) return 'editorial_premium';
  if (/fast|command|mission|build|system/i.test(intentText)) return 'mission_control';
  if (/story|cinematic|beautiful|world class/i.test(intentText)) return 'cinematic_depth';
  return 'mission_control';
}

function paletteForMood(mood) {
  const map = {
    calm_precision: {
      background: '#f3efe7',
      surface: '#fffaf2',
      text: '#1f2a2a',
      accent: '#0f8a7b',
      accent_two: '#dd6b4d',
      border: '#d8d1c4',
    },
    editorial_premium: {
      background: '#f5f0e8',
      surface: '#fffaf4',
      text: '#19140f',
      accent: '#b45c33',
      accent_two: '#264653',
      border: '#dbcdbf',
    },
    cinematic_depth: {
      background: '#11151c',
      surface: '#1b2430',
      text: '#f4f1ea',
      accent: '#d97d54',
      accent_two: '#7ec8c5',
      border: '#314056',
    },
    mission_control: {
      background: '#f6f7f2',
      surface: '#ffffff',
      text: '#172033',
      accent: '#1c7c54',
      accent_two: '#d96c06',
      border: '#d5dbe4',
    },
  };
  return map[mood] || map.mission_control;
}

function typographyForMood(mood) {
  const map = {
    calm_precision: {
      display: '"Fraunces", "Iowan Old Style", serif',
      body: '"Manrope", "Avenir Next", sans-serif',
      code: '"IBM Plex Mono", monospace',
    },
    editorial_premium: {
      display: '"Cormorant Garamond", Georgia, serif',
      body: '"Satoshi", "Helvetica Neue", sans-serif',
      code: '"IBM Plex Mono", monospace',
    },
    cinematic_depth: {
      display: '"Bricolage Grotesque", "Trebuchet MS", sans-serif',
      body: '"Public Sans", "Helvetica Neue", sans-serif',
      code: '"JetBrains Mono", monospace',
    },
    mission_control: {
      display: '"Space Grotesk", "Trebuchet MS", sans-serif',
      body: '"Manrope", "Avenir Next", sans-serif',
      code: '"IBM Plex Mono", monospace',
    },
  };
  return map[mood] || map.mission_control;
}

function componentRules(surface) {
  const common = [
    'Input composer sits directly below conversation transcript with no dead zone.',
    'Primary action controls stay visually anchored near the composer.',
    'System status text must be compressed into badges or cards, never tiny paragraph clutter.',
    'Founder-critical actions must have strong contrast and single-click legibility.',
  ];
  if (surface === 'voice_command_surface') {
    return [
      ...common,
      'Mic state must be obvious from one glance: idle, listening, transcribing, blocked, failed.',
      'Transcript panel should privilege the active exchange over secondary proof widgets.',
      'Voice controls must not compete with the message composer for visual dominance.',
    ];
  }
  if (surface === 'operational_dashboard') {
    return [
      ...common,
      'Metrics should live in modular cards with one primary number and one short explanation.',
      'Queue/progress views must show status, next action, and blocker without scrolling into logs.',
    ];
  }
  return common;
}

function motionRules(surface) {
  const base = [
    'Use short staged reveals for major sections; avoid constant ambient motion.',
    'Animation must clarify hierarchy or state change, never exist as decoration alone.',
  ];
  if (surface === 'voice_command_surface') {
    return [
      ...base,
      'Mic state changes should animate within 120-220ms and never feel laggy or theatrical.',
    ];
  }
  return base;
}

function avoidList(surface) {
  const shared = [
    'Default system font stack as the only typography direction.',
    'Flat white or flat near-black background with no atmosphere.',
    'Tiny explanatory helper text beneath every control.',
    'Department toggles or debug controls in the founder’s primary command path unless explicitly requested.',
  ];
  if (surface === 'voice_command_surface') {
    return [
      ...shared,
      'Proof-event tables above the active conversation surface.',
      'Mic/device troubleshooting exposed as the primary UI instead of a contained fallback panel.',
    ];
  }
  return shared;
}

function implementationContract(surface, mood, palette, typography) {
  return {
    required_css_variables: {
      '--studio-bg': palette.background,
      '--studio-surface': palette.surface,
      '--studio-text': palette.text,
      '--studio-accent': palette.accent,
      '--studio-accent-2': palette.accent_two,
      '--studio-border': palette.border,
      '--studio-font-display': typography.display,
      '--studio-font-body': typography.body,
      '--studio-font-code': typography.code,
      '--studio-radius-lg': '24px',
      '--studio-shadow-soft': mood === 'cinematic_depth'
        ? '0 24px 80px rgba(0,0,0,0.28)'
        : '0 18px 50px rgba(20,28,40,0.12)',
    },
    required_markup_signals: [
      'A dedicated conversation transcript region.',
      'A dedicated composer region directly below the transcript.',
      'A founder-visible primary action button.',
    ],
    required_responsive_signals: [
      'At least one @media breakpoint or clamp()-based scaling rule.',
      'Mobile-safe spacing and touch-target sizing.',
    ],
    required_visual_signals: [
      'At least one layered background, gradient, texture, or elevated surface treatment.',
      'At least one emphasized display typography treatment.',
    ],
    forbidden_patterns: avoidList(surface),
  };
}

export function buildStudioDesignPacket(missionFolder, {
  founderText = '',
  baseline = null,
  blueprint = null,
} = {}) {
  const missionId = path.basename(missionFolder);
  const intentText = [
    founderText,
    baseline?.outcome_statement,
    baseline?.value,
    baseline?.pain,
    ...(baseline?.constraints || []),
  ].filter(Boolean).join('\n');
  const surface = detectSurface(intentText);
  const mood = detectMood(intentText);
  const palette = paletteForMood(mood);
  const typography = typographyForMood(mood);
  const packet = {
    schema: 'studio_design_packet_v1',
    mission_id: missionId,
    generated_at: new Date().toISOString(),
    generated_by: 'factory-core/arc/foundation/studio-design-engine.js',
    in_scope: true,
    surface,
    mood,
    visual_direction: {
      title: `${surface}:${mood}`,
      summary: [
        `Build this as ${surface.replaceAll('_', ' ')} with a ${mood.replaceAll('_', ' ')} visual language.`,
        'The founder should understand hierarchy, trust level, and primary action at a glance.',
      ],
    },
    typography,
    palette,
    layout_rules: [
      'Conversation/result surface above, composer immediately below, support tools subordinate.',
      'One primary column on mobile; optional secondary utility rail only when space allows.',
      'Critical actions remain within the first viewport on laptop and phone.',
    ],
    component_rules: componentRules(surface),
    motion_rules: motionRules(surface),
    implementation_contract: implementationContract(surface, mood, palette, typography),
    builder_instructions: [
      'Implement the CSS variables exactly or provide a stronger governed equivalent with a receipt.',
      'Do not reintroduce generic helper-text clutter after Studio packet generation.',
      'Any deviation from the forbidden patterns requires SENTRY/Studio justification.',
    ],
    source_artifact_count: Array.isArray(blueprint?.steps) ? blueprint.steps.length : 0,
    pass: true,
  };

  fs.writeFileSync(
    path.join(missionFolder, 'STUDIO_DESIGN_PACKET.json'),
    `${JSON.stringify(packet, null, 2)}\n`,
  );
  fs.mkdirSync(path.join(missionFolder, 'receipts'), { recursive: true });
  fs.writeFileSync(
    path.join(missionFolder, 'receipts/STUDIO_DESIGN_ENGINE_RECEIPT.json'),
    `${JSON.stringify({
      schema: 'studio_design_engine_receipt_v1',
      mission_id: missionId,
      generated_at: packet.generated_at,
      packet_path: 'STUDIO_DESIGN_PACKET.json',
      surface,
      mood,
      pass: true,
    }, null, 2)}\n`,
  );
  return packet;
}

export function loadStudioDesignPacket(missionFolder) {
  return readJson(path.join(missionFolder, 'STUDIO_DESIGN_PACKET.json'));
}
