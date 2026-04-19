#!/usr/bin/env python3
"""
Route extraction script for server.js refactoring.
Extracts sections into separate route files.
"""

import re
import os
import sys

SERVER_PATH = '/Users/adamhopkins/Projects/Lumin-LifeOS/server.js'
ROUTES_DIR = '/Users/adamhopkins/Projects/Lumin-LifeOS/routes'

with open(SERVER_PATH, 'r', encoding='utf-8') as f:
    lines = f.readlines()

total_lines = len(lines)
print(f"Total lines: {total_lines}")

def get_section_lines(start_header, end_header=None, end_line=None):
    """Extract lines from start_header to just before end_header or end_line."""
    start = None
    end = None

    for i, line in enumerate(lines):
        stripped = line.rstrip('\n')
        if stripped == start_header:
            start = i  # 0-indexed
        if start is not None and end is None:
            if end_header and stripped == end_header:
                end = i
                break
            if end_line is not None and i == end_line:
                end = i
                break

    if start is None:
        print(f"WARNING: Could not find section: {start_header}")
        return []
    if end is None:
        print(f"WARNING: Could not find end for: {start_header}")
        return []

    return lines[start:end]

def find_section_start(header):
    for i, line in enumerate(lines):
        if line.rstrip('\n') == header:
            return i
    return None

# All section headers with their 0-indexed line numbers
section_starts = {}
for i, line in enumerate(lines):
    stripped = line.rstrip('\n')
    if stripped.startswith('// ===================='):
        section_starts[stripped] = i

# Print them for verification
for header, lineno in section_starts.items():
    print(f"  Line {lineno+1}: {header}")

def extract_between(start_header, end_header):
    """Extract lines between two headers (inclusive of start, exclusive of end)."""
    s = section_starts.get(start_header)
    e = section_starts.get(end_header)
    if s is None:
        print(f"ERROR: start header not found: {start_header!r}")
        return []
    if e is None:
        print(f"ERROR: end header not found: {end_header!r}")
        return []
    return lines[s:e]

def write_route_file(filename, description, function_name, ctx_vars, sections_content):
    """Write a route file with the standard wrapper."""
    content = f"""/**
 * {description} Routes
 * Extracted from server.js
 */
import logger from '../services/logger.js';

export function {function_name}(app, ctx) {{
  const {{
    {',\n    '.join(ctx_vars)},
  }} = ctx;

"""
    content += ''.join(sections_content)
    content += '\n}\n'

    filepath = os.path.join(ROUTES_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    line_count = len(content.splitlines())
    print(f"  Written: {filename} ({line_count} lines)")
    return filepath

# ============================================================
# EXTRACTION PLAN
# ============================================================

print("\n=== Extracting route files ===\n")

# 1. Financial & Revenue Routes
# Sections: INCOME DRONE SYSTEM, FINANCIAL DASHBOARD, REVENUE EVENT HELPER, STRIPE REVENUE SYNC
# End: UTILITY FUNCTIONS
financial_content = extract_between(
    '// ==================== INCOME DRONE SYSTEM ====================',
    '// ==================== UTILITY FUNCTIONS ===================='
)
write_route_file(
    'financial-routes.js',
    'Financial & Revenue',
    'createFinancialRoutes',
    ['pool', 'requireKey', 'broadcastToAll', 'dayjs', 'updateROI', 'getStripeClient', 'roiTracker', 'financialDashboard', 'incomeDroneSystem', 'recordRevenueEvent', 'syncStripeRevenue'],
    financial_content
)

# 2. Business Tools Routes
# Sections: BUSINESS CENTER ENDPOINTS, GAME PUBLISHER (skip - that's game), SITE BUILDER (skip),
#           BUSINESS DUPLICATION, CODE SERVICES, MAKE.COM GENERATOR, CONTROVERSIAL APPROVAL,
#           SELF-FUNDING, MARKETING RESEARCH, MARKETING AGENCY
# End: WEB SCRAPER ENDPOINTS
# But we need to handle GAME PUBLISHER separately in game-routes.js
# BUSINESS CENTER goes up to GAME PUBLISHER
business_part1 = extract_between(
    '// ==================== BUSINESS CENTER ENDPOINTS ====================',
    '// ==================== GAME PUBLISHER ENDPOINTS (Phaser.js → deployed URL) ===================='
)
# After SITE BUILDER: BUSINESS DUPLICATION through MARKETING AGENCY
business_part2 = extract_between(
    '// ==================== BUSINESS DUPLICATION ENDPOINTS ====================',
    '// ==================== WEB SCRAPER ENDPOINTS ===================='
)

write_route_file(
    'business-routes.js',
    'Business Tools',
    'createBusinessRoutes',
    ['pool', 'requireKey', 'aiSafetyGate', 'searchLimiter', 'searchService', 'checkHumanAttentionBudget',
     'businessCenter', 'businessDuplication', 'codeServices', 'makeComGenerator',
     'legalChecker', 'selfFundingSystem', 'marketingResearch', 'marketingAgency'],
    business_part1 + business_part2
)

# 3. Game Publisher Routes
# Section: GAME PUBLISHER ENDPOINTS
# End: SITE BUILDER + PROSPECT PIPELINE
game_content = extract_between(
    '// ==================== GAME PUBLISHER ENDPOINTS (Phaser.js → deployed URL) ====================',
    '// ==================== SITE BUILDER + PROSPECT PIPELINE ===================='
)
write_route_file(
    'game-routes.js',
    'Game Publisher',
    'createGameRoutes',
    ['pool', 'requireKey', 'callCouncilMember', 'GamePublisher', 'gameGenerator', 'logger'],
    game_content
)

# 4. Video Pipeline Routes
# Sections: YOUTUBE VIDEO CREATION WORKFLOW, VIDEO EDITING COUNCIL, VIDEO PIPELINE, CREATOR ENHANCEMENT SUITE
# End: AUTO-BUILDER ENDPOINTS
video_content = extract_between(
    '// ==================== YOUTUBE VIDEO CREATION WORKFLOW ====================',
    '// ==================== AUTO-BUILDER ENDPOINTS ===================='
)
write_route_file(
    'video-routes.js',
    'Video Pipeline',
    'createVideoRoutes',
    ['pool', 'requireKey', 'callCouncilWithFailover', 'callCouncilMember', 'VideoPipeline', 'logger'],
    video_content
)

# 5. Agent Recruitment Routes
# Section: AGENT RECRUITMENT & ONBOARDING SYSTEM
# End: YOUTUBE VIDEO CREATION WORKFLOW
agent_content = extract_between(
    '// ==================== AGENT RECRUITMENT & ONBOARDING SYSTEM ====================',
    '// ==================== YOUTUBE VIDEO CREATION WORKFLOW ===================='
)
write_route_file(
    'agent-recruitment-routes.js',
    'Agent Recruitment & Onboarding',
    'createAgentRecruitmentRoutes',
    ['pool', 'requireKey', 'callCouncilWithFailover', 'callCouncilMember', 'makePhoneCall'],
    agent_content
)

# 6. BoldTrail CRM Routes
# Section: BOLDTRAIL REAL ESTATE CRM ENDPOINTS (6155) to API COST-SAVINGS SERVICE ENDPOINTS (6572)
boldtrail_content = extract_between(
    '// ==================== BOLDTRAIL REAL ESTATE CRM ENDPOINTS ====================',
    '// ==================== API COST-SAVINGS SERVICE ENDPOINTS ===================='
)
write_route_file(
    'boldtrail-routes.js',
    'BoldTrail Real Estate CRM',
    'createBoldTrailRoutes',
    ['pool', 'requireKey', 'callCouncilWithFailover', 'getStripeClient', 'RAILWAY_PUBLIC_DOMAIN'],
    boldtrail_content
)

# 7. API Cost Savings Routes
# Sections: API COST SAVINGS REVENUE ENDPOINTS (PRIORITY 1) [6128-6155],
#           API COST-SAVINGS SERVICE ENDPOINTS [6572-6832]
api_cost_part1 = extract_between(
    '// ==================== API COST SAVINGS REVENUE ENDPOINTS (PRIORITY 1) ====================',
    '// ==================== BOLDTRAIL REAL ESTATE CRM ENDPOINTS ===================='
)
api_cost_part2 = extract_between(
    '// ==================== API COST-SAVINGS SERVICE ENDPOINTS ====================',
    '// ==================== AGENT RECRUITMENT & ONBOARDING SYSTEM ===================='
)
write_route_file(
    'api-cost-savings-routes.js',
    'API Cost Savings',
    'createApiCostSavingsRoutes',
    ['pool', 'requireKey', 'apiCostSavingsRevenue', 'getStripeClient', 'RAILWAY_PUBLIC_DOMAIN'],
    api_cost_part1 + api_cost_part2
)

# 8. Web Intelligence Routes
# Sections: WEB SCRAPER ENDPOINTS, ENHANCED CONVERSATION SCRAPER ENDPOINTS
# End: API COST SAVINGS REVENUE ENDPOINTS
web_content = extract_between(
    '// ==================== WEB SCRAPER ENDPOINTS ====================',
    '// ==================== API COST SAVINGS REVENUE ENDPOINTS (PRIORITY 1) ===================='
)
write_route_file(
    'web-intelligence-routes.js',
    'Web Intelligence',
    'createWebIntelligenceRoutes',
    ['pool', 'requireKey', 'webScraper', 'enhancedConversationScraper'],
    web_content
)

# 9. Auto-Builder Routes
# Sections: AUTO-BUILDER ENDPOINTS, VIRTUAL REAL ESTATE CLASS, SELF-BUILDER ENDPOINTS,
#           TASK COMPLETION TRACKER, IDEA TO IMPLEMENTATION PIPELINE, AUTO-BUILDER CONTROL ENDPOINTS
# AUTO-BUILDER ENDPOINTS (7985) to SALES COACHING (8471)
auto_part1 = extract_between(
    '// ==================== AUTO-BUILDER ENDPOINTS ====================',
    '// ==================== SALES COACHING & RECORDING ENDPOINTS ===================='
)
# SELF-BUILDER ENDPOINTS (9382) to TWO-TIER COUNCIL ENDPOINTS (9809)
auto_part2 = extract_between(
    '// ==================== SELF-BUILDER ENDPOINTS ====================',
    '// ==================== TWO-TIER COUNCIL ENDPOINTS ===================='
)
# AUTO-BUILDER CONTROL ENDPOINTS (11099) to MEMORY SYSTEM ROUTES (11121)
auto_part3 = extract_between(
    '// ==================== AUTO-BUILDER CONTROL ENDPOINTS ====================',
    '// ==================== MEMORY SYSTEM ROUTES ===================='
)
write_route_file(
    'auto-builder-routes.js',
    'Auto-Builder',
    'createAutoBuilderRoutes',
    ['pool', 'requireKey', 'callCouncilMember', 'executionQueue', 'selfBuilder',
     'ideaToImplementationPipeline', 'autoBuilder', 'getStripeClient', 'RAILWAY_PUBLIC_DOMAIN'],
    auto_part1 + auto_part2 + auto_part3
)

# 10. Life Coaching Routes
# Sections: SALES COACHING (8471) to SELF-BUILDER (9382)
life_coaching_content = extract_between(
    '// ==================== SALES COACHING & RECORDING ENDPOINTS ====================',
    '// ==================== SELF-BUILDER ENDPOINTS ===================='
)
write_route_file(
    'life-coaching-routes.js',
    'Life Coaching',
    'createLifeCoachingRoutes',
    ['pool', 'requireKey', 'callCouncilWithFailover', 'callRecorder', 'salesTechniqueAnalyzer',
     'goalTracker', 'activityTracker', 'coachingProgression', 'calendarService',
     'perfectDaySystem', 'goalCommitmentSystem', 'callSimulationSystem',
     'relationshipMediation', 'meaningfulMoments'],
    life_coaching_content
)

# 11. Two-Tier Council Routes
# Section: TWO-TIER COUNCIL ENDPOINTS (9809) to OUTREACH (9855)
two_tier_content = extract_between(
    '// ==================== TWO-TIER COUNCIL ENDPOINTS ====================',
    '// ==================== OUTREACH AUTOMATION ENDPOINTS ===================='
)
write_route_file(
    'two-tier-council-routes.js',
    'Two-Tier Council',
    'createTwoTierCouncilRoutes',
    ['pool', 'requireKey', 'modelRouter', 'whiteLabelConfig'],
    two_tier_content
)

# 12. Outreach & CRM Routes
# Sections: OUTREACH AUTOMATION ENDPOINTS (9855), CRM (10032), EMAIL WEBHOOKS (10125)
# End: BILLING / ENTITLEMENTS (10149)
outreach_content = extract_between(
    '// ==================== OUTREACH AUTOMATION ENDPOINTS ====================',
    '// ==================== BILLING / ENTITLEMENTS ===================='
)
write_route_file(
    'outreach-crm-routes.js',
    'Outreach & CRM',
    'createOutreachCrmRoutes',
    ['pool', 'requireKey', 'outreachLimiter', 'outreachAutomation', 'crmSequenceRunner', 'notificationService', 'express'],
    outreach_content
)

# 13. Billing & Access Routes
# Sections: BILLING / ENTITLEMENTS (10149), WHITE-LABEL ENDPOINTS (10171), TRIAL SYSTEM ENDPOINTS (10268)
# End: KNOWLEDGE BASE (10198) -- wait, TRIAL is at 10268 which is after KNOWLEDGE BASE
# Plan says: BILLING/ENTITLEMENTS, WHITE-LABEL, TRIAL SYSTEM
billing_part1 = extract_between(
    '// ==================== BILLING / ENTITLEMENTS ====================',
    '// ==================== KNOWLEDGE BASE & FILE UPLOAD ENDPOINTS ===================='
)
billing_part2 = extract_between(
    '// ==================== TRIAL SYSTEM ENDPOINTS ====================',
    '// ==================== CONVERSATION HISTORY ENDPOINTS ===================='
)
write_route_file(
    'billing-routes.js',
    'Billing & Access',
    'createBillingRoutes',
    ['pool', 'requireKey', 'whiteLabelConfig'],
    billing_part1 + billing_part2
)

# 14. Knowledge Base Routes
# Sections: KNOWLEDGE BASE & FILE UPLOAD (10198), FILE CLEANUP ANALYZER (10252)
# End: TRIAL SYSTEM ENDPOINTS (10268)
knowledge_content = extract_between(
    '// ==================== KNOWLEDGE BASE & FILE UPLOAD ENDPOINTS ====================',
    '// ==================== TRIAL SYSTEM ENDPOINTS ===================='
)
write_route_file(
    'knowledge-routes.js',
    'Knowledge Base',
    'createKnowledgeRoutes',
    ['pool', 'requireKey', 'knowledgeBase', 'fileCleanupAnalyzer'],
    knowledge_content
)

# 15. Conversation & AI Bot Routes
# Sections: CONVERSATION HISTORY (10309), CONVERSATION EXTRACTOR (10364), AI ACCOUNT BOT (10418)
# End: COMMAND CENTER ENDPOINTS (10463)
conv_content = extract_between(
    '// ==================== CONVERSATION HISTORY ENDPOINTS ====================',
    '// ==================== COMMAND CENTER ENDPOINTS ===================='
)
write_route_file(
    'conversation-routes.js',
    'Conversation & AI Bot',
    'createConversationRoutes',
    ['pool', 'requireKey', 'conversationExtractor', 'aiAccountBot', 'path', 'fs'],
    conv_content
)

# 16. Command Center Routes
# Sections: COMMAND CENTER ENDPOINTS (10463), LOG MONITORING (10667), LOG MONITORING (10692), MISSING OVERLAY (10717)
# End: AUTO-BUILDER CONTROL ENDPOINTS (11099)
command_content = extract_between(
    '// ==================== COMMAND CENTER ENDPOINTS ====================',
    '// ==================== AUTO-BUILDER CONTROL ENDPOINTS ===================='
)
write_route_file(
    'command-center-routes.js',
    'Command Center',
    'createCommandCenterRoutes',
    ['pool', 'requireKey', 'callCouncilMember', 'callCouncilWithFailover', 'executionQueue',
     'aiPerformanceScores', 'logMonitor', 'costReExamination', 'compressionMetrics',
     'getDailySpend', 'MAX_DAILY_SPEND', 'roiTracker', 'autoBuilder', 'getCouncilConsensus',
     'sourceOfTruthManager', 'systemMetrics', 'systemSnapshots', 'incomeDroneSystem',
     'ideaEngine', 'createProposal', 'conductEnhancedConsensus', 'makePhoneCall', 'sendSMS'],
    command_content
)

print("\n=== All route files written ===\n")

# ============================================================
# NOW MODIFY server.js: remove extracted sections, add imports and calls
# ============================================================

print("=== Modifying server.js ===\n")

# Re-read lines for modification
with open(SERVER_PATH, 'r', encoding='utf-8') as f:
    content = f.read()
    server_lines = content.splitlines(keepends=True)

original_count = len(server_lines)
print(f"Original server.js line count: {original_count}")

# Define the ranges to REMOVE (1-indexed, inclusive)
# We need to remove sections that were extracted.
# We remove from bottom to top to preserve line numbers.

# Build list of (start_line_1indexed, end_line_1indexed, description)
# These are the sections to remove from server.js (replace with a comment)

def find_header_line(header, start_from=0):
    """Returns 1-indexed line number."""
    for i, line in enumerate(server_lines):
        if i < start_from:
            continue
        if line.rstrip('\n') == header:
            return i + 1  # 1-indexed
    return None

# We'll collect (start, end, replacement_comment) tuples (1-indexed, inclusive)
removals = []

# Helper: find the line where the next section header starts
# Sections to remove and what to replace them with:

sections_to_remove = [
    # (start_header, end_header_exclusive, replacement_comment)
    # Financial: INCOME DRONE SYSTEM through STRIPE REVENUE SYNC
    # These are lines 5138 to just before UTILITY FUNCTIONS at 5404
    ('// ==================== INCOME DRONE SYSTEM ====================',
     '// ==================== UTILITY FUNCTIONS ====================',
     '// Extracted to routes/financial-routes.js (IncomeDroneSystem, FinancialDashboard, recordRevenueEvent, syncStripeRevenue)'),

    # Business CENTER through MARKETING AGENCY (but not GAME PUBLISHER, skip SITE BUILDER)
    # Actually per plan: remove BUSINESS CENTER ENDPOINTS + BUSINESS DUPLICATION + CODE SERVICES
    # + MAKE.COM GENERATOR + CONTROVERSIAL APPROVAL + SELF-FUNDING + MARKETING RESEARCH + MARKETING AGENCY
    ('// ==================== BUSINESS CENTER ENDPOINTS ====================',
     '// ==================== GAME PUBLISHER ENDPOINTS (Phaser.js → deployed URL) ====================',
     '// Extracted to routes/business-routes.js (BUSINESS CENTER ENDPOINTS)'),

    ('// ==================== BUSINESS DUPLICATION ENDPOINTS ====================',
     '// ==================== WEB SCRAPER ENDPOINTS ====================',
     '// Extracted to routes/business-routes.js (BUSINESS DUPLICATION through MARKETING AGENCY)'),

    # GAME PUBLISHER
    ('// ==================== GAME PUBLISHER ENDPOINTS (Phaser.js → deployed URL) ====================',
     '// ==================== SITE BUILDER + PROSPECT PIPELINE ====================',
     '// Extracted to routes/game-routes.js'),

    # WEB SCRAPER + ENHANCED CONVERSATION SCRAPER
    ('// ==================== WEB SCRAPER ENDPOINTS ====================',
     '// ==================== API COST SAVINGS REVENUE ENDPOINTS (PRIORITY 1) ====================',
     '// Extracted to routes/web-intelligence-routes.js'),

    # API COST SAVINGS REVENUE ENDPOINTS (PRIORITY 1) [before BOLDTRAIL]
    ('// ==================== API COST SAVINGS REVENUE ENDPOINTS (PRIORITY 1) ====================',
     '// ==================== BOLDTRAIL REAL ESTATE CRM ENDPOINTS ====================',
     '// Extracted to routes/api-cost-savings-routes.js (part 1)'),

    # BOLDTRAIL CRM
    ('// ==================== BOLDTRAIL REAL ESTATE CRM ENDPOINTS ====================',
     '// ==================== API COST-SAVINGS SERVICE ENDPOINTS ====================',
     '// Extracted to routes/boldtrail-routes.js'),

    # API COST-SAVINGS SERVICE ENDPOINTS
    ('// ==================== API COST-SAVINGS SERVICE ENDPOINTS ====================',
     '// ==================== AGENT RECRUITMENT & ONBOARDING SYSTEM ====================',
     '// Extracted to routes/api-cost-savings-routes.js (part 2)'),

    # AGENT RECRUITMENT
    ('// ==================== AGENT RECRUITMENT & ONBOARDING SYSTEM ====================',
     '// ==================== YOUTUBE VIDEO CREATION WORKFLOW ====================',
     '// Extracted to routes/agent-recruitment-routes.js'),

    # VIDEO: YOUTUBE + VIDEO EDITING COUNCIL + VIDEO PIPELINE + CREATOR ENHANCEMENT SUITE
    ('// ==================== YOUTUBE VIDEO CREATION WORKFLOW ====================',
     '// ==================== AUTO-BUILDER ENDPOINTS ====================',
     '// Extracted to routes/video-routes.js'),

    # AUTO-BUILDER ENDPOINTS + VIRTUAL REAL ESTATE CLASS
    ('// ==================== AUTO-BUILDER ENDPOINTS ====================',
     '// ==================== SALES COACHING & RECORDING ENDPOINTS ====================',
     '// Extracted to routes/auto-builder-routes.js (part 1)'),

    # LIFE COACHING: SALES COACHING through INCOME DIAGNOSTIC
    ('// ==================== SALES COACHING & RECORDING ENDPOINTS ====================',
     '// ==================== SELF-BUILDER ENDPOINTS ====================',
     '// Extracted to routes/life-coaching-routes.js'),

    # SELF-BUILDER + TASK COMPLETION + IDEA TO IMPLEMENTATION + TWO-TIER COUNCIL
    ('// ==================== SELF-BUILDER ENDPOINTS ====================',
     '// ==================== TWO-TIER COUNCIL ENDPOINTS ====================',
     '// Extracted to routes/auto-builder-routes.js (part 2: SELF-BUILDER, TASK TRACKER, IDEA PIPELINE)'),

    # TWO-TIER COUNCIL ENDPOINTS
    ('// ==================== TWO-TIER COUNCIL ENDPOINTS ====================',
     '// ==================== OUTREACH AUTOMATION ENDPOINTS ====================',
     '// Extracted to routes/two-tier-council-routes.js'),

    # OUTREACH + CRM + EMAIL WEBHOOKS
    ('// ==================== OUTREACH AUTOMATION ENDPOINTS ====================',
     '// ==================== BILLING / ENTITLEMENTS ====================',
     '// Extracted to routes/outreach-crm-routes.js'),

    # BILLING + WHITE-LABEL (not KNOWLEDGE BASE or TRIAL yet)
    ('// ==================== BILLING / ENTITLEMENTS ====================',
     '// ==================== KNOWLEDGE BASE & FILE UPLOAD ENDPOINTS ====================',
     '// Extracted to routes/billing-routes.js (part 1: BILLING, WHITE-LABEL)'),

    # KNOWLEDGE BASE + FILE CLEANUP
    ('// ==================== KNOWLEDGE BASE & FILE UPLOAD ENDPOINTS ====================',
     '// ==================== TRIAL SYSTEM ENDPOINTS ====================',
     '// Extracted to routes/knowledge-routes.js'),

    # TRIAL SYSTEM
    ('// ==================== TRIAL SYSTEM ENDPOINTS ====================',
     '// ==================== CONVERSATION HISTORY ENDPOINTS ====================',
     '// Extracted to routes/billing-routes.js (part 2: TRIAL SYSTEM)'),

    # CONVERSATION HISTORY + CONVERSATION EXTRACTOR + AI ACCOUNT BOT
    ('// ==================== CONVERSATION HISTORY ENDPOINTS ====================',
     '// ==================== COMMAND CENTER ENDPOINTS ====================',
     '// Extracted to routes/conversation-routes.js'),

    # COMMAND CENTER + LOG MONITORING (both) + MISSING OVERLAY
    ('// ==================== COMMAND CENTER ENDPOINTS ====================',
     '// ==================== AUTO-BUILDER CONTROL ENDPOINTS ====================',
     '// Extracted to routes/command-center-routes.js'),

    # AUTO-BUILDER CONTROL ENDPOINTS
    ('// ==================== AUTO-BUILDER CONTROL ENDPOINTS ====================',
     '// ==================== MEMORY SYSTEM ROUTES ====================',
     '// Extracted to routes/auto-builder-routes.js (part 3: AUTO-BUILDER CONTROL)'),
]

# Build removal ranges (1-indexed)
removal_ranges = []
for start_h, end_h, comment in sections_to_remove:
    s = find_header_line(start_h)
    e = find_header_line(end_h)
    if s is None:
        print(f"  WARNING: could not find start: {start_h!r}")
        continue
    if e is None:
        print(f"  WARNING: could not find end: {end_h!r}")
        continue
    # Remove lines s to e-1 (inclusive), replace with comment
    removal_ranges.append((s, e - 1, comment))
    print(f"  Remove lines {s}-{e-1}: {start_h[:50]}")

# Sort by start line DESCENDING (bottom to top)
removal_ranges.sort(key=lambda x: x[0], reverse=True)

# Apply removals
modified_lines = list(server_lines)
for start, end, comment in removal_ranges:
    # Convert to 0-indexed
    s = start - 1
    e = end  # exclusive in Python slicing, so end (1-indexed) = end-1 (0-indexed) + 1 = end
    modified_lines[s:e] = [f'{comment}\n']

print(f"\nAfter removals: {len(modified_lines)} lines")

# Now add import statements at line 79 (after the existing imports, around line 79)
# Find the line "import { getAllFlags } from './lib/flags.js';"
import_insert_line = None
for i, line in enumerate(modified_lines):
    if "import { getAllFlags } from './lib/flags.js'" in line:
        import_insert_line = i + 1  # Insert AFTER this line
        break

if import_insert_line is None:
    print("WARNING: could not find getAllFlags import line, inserting at line 79")
    import_insert_line = 79

new_imports = """import { createFinancialRoutes } from './routes/financial-routes.js';
import { createBusinessRoutes } from './routes/business-routes.js';
import { createGameRoutes } from './routes/game-routes.js';
import { createVideoRoutes } from './routes/video-routes.js';
import { createAgentRecruitmentRoutes } from './routes/agent-recruitment-routes.js';
import { createBoldTrailRoutes } from './routes/boldtrail-routes.js';
import { createApiCostSavingsRoutes } from './routes/api-cost-savings-routes.js';
import { createWebIntelligenceRoutes } from './routes/web-intelligence-routes.js';
import { createAutoBuilderRoutes } from './routes/auto-builder-routes.js';
import { createLifeCoachingRoutes } from './routes/life-coaching-routes.js';
import { createTwoTierCouncilRoutes } from './routes/two-tier-council-routes.js';
import { createOutreachCrmRoutes } from './routes/outreach-crm-routes.js';
import { createBillingRoutes } from './routes/billing-routes.js';
import { createKnowledgeRoutes } from './routes/knowledge-routes.js';
import { createConversationRoutes } from './routes/conversation-routes.js';
import { createCommandCenterRoutes } from './routes/command-center-routes.js';
"""

modified_lines.insert(import_insert_line, new_imports)

print(f"  Inserted imports at line {import_insert_line + 1}")

# Now find where to insert the route registration calls
# Look for "createSiteBuilderRoutes(app," and insert after that block
# Find the line "console.log('✅ [STARTUP] Site Builder routes registered');"
site_builder_done_line = None
for i, line in enumerate(modified_lines):
    if "console.log('✅ [STARTUP] Site Builder routes registered');" in line:
        site_builder_done_line = i
        break

if site_builder_done_line is None:
    print("WARNING: could not find site builder registration line")
    # Try alternate
    for i, line in enumerate(modified_lines):
        if 'createSiteBuilderRoutes' in line:
            site_builder_done_line = i + 10
            break

if site_builder_done_line is not None:
    route_registration = """
    // ==================== MODULAR ROUTE REGISTRATION ====================
    const routeCtx = {
      pool,
      requireKey,
      callCouncilMember,
      callCouncilWithFailover,
      broadcastToAll,
      dayjs,
      logger,
      // Financial
      updateROI,
      getStripeClient,
      roiTracker,
      financialDashboard,
      incomeDroneSystem,
      recordRevenueEvent,
      syncStripeRevenue,
      RAILWAY_PUBLIC_DOMAIN,
      // Business
      aiSafetyGate,
      searchLimiter,
      searchService,
      checkHumanAttentionBudget,
      businessCenter,
      businessDuplication,
      codeServices,
      makeComGenerator,
      legalChecker,
      selfFundingSystem,
      marketingResearch,
      marketingAgency,
      // Game
      GamePublisher,
      gameGenerator,
      // Video
      VideoPipeline,
      // Agent Recruitment
      makePhoneCall,
      // BoldTrail / API Cost Savings
      apiCostSavingsRevenue,
      // Web Intelligence
      webScraper,
      enhancedConversationScraper,
      // Auto-Builder
      executionQueue,
      selfBuilder,
      ideaToImplementationPipeline,
      autoBuilder,
      getCouncilConsensus,
      // Life Coaching
      callRecorder,
      salesTechniqueAnalyzer,
      goalTracker,
      activityTracker,
      coachingProgression,
      calendarService,
      perfectDaySystem,
      goalCommitmentSystem,
      callSimulationSystem,
      relationshipMediation,
      meaningfulMoments,
      // Two-Tier Council
      modelRouter,
      whiteLabelConfig,
      // Outreach & CRM
      outreachLimiter,
      outreachAutomation,
      crmSequenceRunner,
      notificationService,
      express,
      // Billing
      // Knowledge Base
      knowledgeBase,
      fileCleanupAnalyzer,
      // Conversation
      conversationExtractor,
      aiAccountBot,
      path,
      fs,
      // Command Center
      aiPerformanceScores,
      logMonitor,
      costReExamination,
      compressionMetrics,
      getDailySpend,
      MAX_DAILY_SPEND,
      systemMetrics,
      systemSnapshots,
      ideaEngine,
      createProposal,
      conductEnhancedConsensus,
      sendSMS,
      sourceOfTruthManager,
    };

    createFinancialRoutes(app, routeCtx);
    createBusinessRoutes(app, routeCtx);
    createGameRoutes(app, routeCtx);
    createVideoRoutes(app, routeCtx);
    createAgentRecruitmentRoutes(app, routeCtx);
    createBoldTrailRoutes(app, routeCtx);
    createApiCostSavingsRoutes(app, routeCtx);
    createWebIntelligenceRoutes(app, routeCtx);
    createAutoBuilderRoutes(app, routeCtx);
    createLifeCoachingRoutes(app, routeCtx);
    createTwoTierCouncilRoutes(app, routeCtx);
    createOutreachCrmRoutes(app, routeCtx);
    createBillingRoutes(app, routeCtx);
    createKnowledgeRoutes(app, routeCtx);
    createConversationRoutes(app, routeCtx);
    createCommandCenterRoutes(app, routeCtx);
    console.log('✅ [STARTUP] All modular routes registered');

"""
    modified_lines.insert(site_builder_done_line + 1, route_registration)
    print(f"  Inserted route registrations after line {site_builder_done_line + 1}")

# Write modified server.js
with open(SERVER_PATH, 'w', encoding='utf-8') as f:
    f.writelines(modified_lines)

final_count = len(modified_lines)
lines_removed = original_count - final_count
print(f"\nFinal server.js line count: {final_count}")
print(f"Lines removed: {lines_removed}")
print(f"\nDone! Run: node --check {SERVER_PATH}")
