/**
 * SYNOPSIS: Exports detectTrajectory — services/lifeos-risk-detection.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const RISK_TYPES = [
  "burnout",
  "isolation",
  "hopelessness",
  "relationship collapse",
  "addiction",
  "financial collapse",
  "violence",
  "medical decline",
];

/**
 * Detects trajectories toward various risks based on a constellation of user data and an event stream.
 * @param {object} constellation - A comprehensive object representing the user's current state across various LifeOS domains.
 *   Expected properties:
 *   - {number} integrityScore - Current integrity score (0-100).
 *   - {number} joyScore - Current joy score (0-100).
 *   - {number} sleepDebtHours - Accumulated sleep debt in hours (negative for surplus).
 *   - {number} hrvAverage - Average Heart Rate Variability.
 *   - {number} energyLevel - Self-reported energy level (0-100).
 *   - {number} commitmentOverdueCount - Number of overdue commitments.
 *   - {number} financialDebtToIncomeRatio - Debt to income ratio (e.g., 0.5 for 50%).
 *   - {number} socialInteractionFrequency - Number of social interactions in a recent period.
 *   - {boolean} hasSupportNetwork - True if a declared support network exists.
 *   - {number} emotionalCheckinNegativeRatio - Ratio of negative emotional check-ins (0-1).
 *   - {number} chronicPainLevel - Self-reported chronic pain level (0-10).
 *   - {number} medicationAdherence - Percentage of medication adherence (0-100).
 *   - {number} alcoholConsumptionUnitsPerWeek - Units of alcohol consumed per week.
 *   - {number} substanceUseFrequency - Frequency of substance use (0-10 scale).
 *   - {number} conflictResolutionScore - Score for recent conflict resolution (0-100).
 *   - {number} purposeAlignmentScore - Score for alignment with declared purpose (0-100).
 *   - {number} pastViolentIncidents - Number of past violent incidents reported.
 * @param {Array<object>} eventStream - An array of recent events.
 *   Each event: `{type: string, description: string, timestamp: number, weight: number}`.
 *   Event types might include: 'commitment_missed', 'negative_interaction', 'financial_stressor', 'health_symptom', 'isolation_indicator'.
 * @returns {{risks: Array<{riskType: string, severity: 'low'|'moderate'|'high'|'critical', trajectory: 'improving'|'stable'|'worsening'|'unknown', confidence: number, indicators: string[], evidence: string[]}>}}
 */
export function detectTrajectory(constellation, eventStream) {
  const risks = [];

  const addRisk = (riskType, severity, trajectory, confidence, indicators, evidence) => {
    risks.push({ riskType, severity, trajectory, confidence, indicators, evidence });
  };

  // --- Burnout Detection ---
  let burnoutIndicators = [];
  let burnoutEvidence = [];
  let burnoutScore = 0;

  if (constellation.sleepDebtHours > 10) {
    burnoutScore += 0.3;
    burnoutIndicators.push("significant sleep debt");
    burnoutEvidence.push(`Sleep debt: ${constellation.sleepDebtHours}h`);
  }
  if (constellation.integrityScore < 60) {
    burnoutScore += 0.2;
    burnoutIndicators.push("declining integrity score");
    burnoutEvidence.push(`Integrity Score: ${constellation.integrityScore}`);
  }
  if (constellation.commitmentOverdueCount > 5) {
    burnoutScore += 0.25;
    burnoutIndicators.push("high number of overdue commitments");
    burnoutEvidence.push(`Overdue commitments: ${constellation.commitmentOverdueCount}`);
  }
  if (constellation.energyLevel < 40) {
    burnoutScore += 0.25;
    burnoutIndicators.push("low self-reported energy");
    burnoutEvidence.push(`Energy Level: ${constellation.energyLevel}`);
  }

  const recentBurnoutEvents = eventStream.filter(e => e.type === 'burnout_indicator' || e.type === 'stress_event');
  if (recentBurnoutEvents.length > 3) {
    burnoutScore += 0.1 * recentBurnoutEvents.length;
    burnoutIndicators.push("frequent stress events");
    burnoutEvidence.push(`Recent stress events: ${recentBurnoutEvents.map(e => e.description).join(', ')}`);
  }

  if (burnoutScore > 0.5) {
    const severity = assessSeverity({ riskType: "burnout", score: burnoutScore }).level;
    const trajectory = burnoutScore > 0.7 ? "worsening" : "stable"; // Simplified trajectory
    addRisk("burnout", severity, trajectory, Math.min(1, burnoutScore), burnoutIndicators, burnoutEvidence);
  }

  // --- Isolation Detection ---
  let isolationIndicators = [];
  let isolationEvidence = [];
  let isolationScore = 0;

  if (constellation.socialInteractionFrequency < 2) {
    isolationScore += 0.4;
    isolationIndicators.push("very low social interaction frequency");
    isolationEvidence.push(`Social interactions: ${constellation.socialInteractionFrequency} per period`);
  }
  if (!constellation.hasSupportNetwork) {
    isolationScore += 0.3;
    isolationIndicators.push("absence of declared support network");
    isolationEvidence.push("No declared support network");
  }
  if (constellation.emotionalCheckinNegativeRatio > 0.6) {
    isolationScore += 0.2;
    isolationIndicators.push("high ratio of negative emotional check-ins");
    isolationEvidence.push(`Negative emotional check-in ratio: ${constellation.emotionalCheckinNegativeRatio}`);
  }

  const recentIsolationEvents = eventStream.filter(e => e.type === 'isolation_indicator' || e.type === 'social_withdrawal');
  if (recentIsolationEvents.length > 2) {
    isolationScore += 0.15 * recentIsolationEvents.length;
    isolationIndicators.push("repeated social withdrawal events");
    isolationEvidence.push(`Recent social withdrawal: ${recentIsolationEvents.map(e => e.description).join(', ')}`);
  }

  if (isolationScore > 0.5) {
    const severity = assessSeverity({ riskType: "isolation", score: isolationScore }).level;
    const trajectory = isolationScore > 0.7 ? "worsening" : "stable";
    addRisk("isolation", severity, trajectory, Math.min(1, isolationScore), isolationIndicators, isolationEvidence);
  }

  // --- Hopelessness Detection ---
  let hopelessnessIndicators = [];
  let hopelessnessEvidence = [];
  let hopelessnessScore = 0;

  if (constellation.joyScore < 30) {
    hopelessnessScore += 0.4;
    hopelessnessIndicators.push("very low joy score");
    hopelessnessEvidence.push(`Joy Score: ${constellation.joyScore}`);
  }
  if (constellation.emotionalCheckinNegativeRatio > 0.7) {
    hopelessnessScore += 0.3;
    hopelessnessIndicators.push("dominant negative emotional state");
    hopelessnessEvidence.push(`Negative emotional check-in ratio: ${constellation.emotionalCheckinNegativeRatio}`);
  }
  if (constellation.purposeAlignmentScore < 40) {
    hopelessnessScore += 0.2;
    hopelessnessIndicators.push("low sense of purpose alignment");
    hopelessnessEvidence.push(`Purpose Alignment Score: ${constellation.purposeAlignmentScore}`);
  }

  const recentHopelessnessEvents = eventStream.filter(e => e.type === 'hopeless_language' || e.type === 'lack_of_motivation');
  if (recentHopelessnessEvents.length > 1) {
    hopelessnessScore += 0.2 * recentHopelessnessEvents.length;
    hopelessnessIndicators.push("expressions of hopelessness or apathy");
    hopelessnessEvidence.push(`Recent events: ${recentHopelessnessEvents.map(e => e.description).join(', ')}`);
  }

  if (hopelessnessScore > 0.5) {
    const severity = assessSeverity({ riskType: "hopelessness", score: hopelessnessScore }).level;
    const trajectory = hopelessnessScore > 0.7 ? "worsening" : "stable";
    addRisk("hopelessness", severity, trajectory, Math.min(1, hopelessnessScore), hopelessnessIndicators, hopelessnessEvidence);
  }

  // --- Relationship Collapse Detection ---
  let relationshipIndicators = [];
  let relationshipEvidence = [];
  let relationshipScore = 0;

  if (constellation.conflictResolutionScore < 50) {
    relationshipScore += 0.4;
    relationshipIndicators.push("low conflict resolution effectiveness");
    relationshipEvidence.push(`Conflict Resolution Score: ${constellation.conflictResolutionScore}`);
  }
  if (constellation.socialInteractionFrequency < 3 && constellation.hasSupportNetwork) { // Low interaction with network
    relationshipScore += 0.2;
    relationshipIndicators.push("reduced engagement with support network");
    relationshipEvidence.push(`Social interactions: ${constellation.socialInteractionFrequency} per period`);
  }
  if (constellation.emotionalCheckinNegativeRatio > 0.5 && constellation.socialInteractionFrequency > 0) { // Negative emotions during interactions
    relationshipScore += 0.2;
    relationshipIndicators.push("negative emotional tone in interactions");
    relationshipEvidence.push(`Negative emotional check-in ratio: ${constellation.emotionalCheckinNegativeRatio}`);
  }

  const recentRelationshipEvents = eventStream.filter(e => e.type === 'negative_interaction' || e.type === 'relationship_conflict');
  if (recentRelationshipEvents.length > 2) {
    relationshipScore += 0.15 * recentRelationshipEvents.length;
    relationshipIndicators.push("frequent negative relationship events");
    relationshipEvidence.push(`Recent conflicts: ${recentRelationshipEvents.map(e => e.description).join(', ')}`);
  }

  if (relationshipScore > 0.5) {
    const severity = assessSeverity({ riskType: "relationship collapse", score: relationshipScore }).level;
    const trajectory = relationshipScore > 0.7 ? "worsening" : "stable";
    addRisk("relationship collapse", severity, trajectory, Math.min(1, relationshipScore), relationshipIndicators, relationshipEvidence);
  }

  // --- Addiction Detection ---
  let addictionIndicators = [];
  let addictionEvidence = [];
  let addictionScore = 0;

  if (constellation.alcoholConsumptionUnitsPerWeek > 14) {
    addictionScore += 0.4;
    addictionIndicators.push("high alcohol consumption");
    addictionEvidence.push(`Alcohol units per week: ${constellation.alcoholConsumptionUnitsPerWeek}`);
  }
  if (constellation.substanceUseFrequency > 5) {
    addictionScore += 0.5;
    addictionIndicators.push("frequent substance use");
    addictionEvidence.push(`Substance use frequency: ${constellation.substanceUseFrequency}`);
  }
  if (constellation.commitmentOverdueCount > 3 && constellation.integrityScore < 70) {
    addictionScore += 0.2;
    addictionIndicators.push("missed commitments potentially linked to substance use");
    addictionEvidence.push(`Overdue commitments: ${constellation.commitmentOverdueCount}, Integrity: ${constellation.integrityScore}`);
  }

  const recentAddictionEvents = eventStream.filter(e => e.type === 'craving_report' || e.type === 'relapse_indicator' || e.type === 'overdose_risk');
  if (recentAddictionEvents.length > 0) {
    addictionScore += 0.3 * recentAddictionEvents.length;
    addictionIndicators.push("specific addiction-related events detected");
    addictionEvidence.push(`Recent events: ${recentAddictionEvents.map(e => e.description).join(', ')}`);
  }

  if (addictionScore > 0.5) {
    const severity = assessSeverity({ riskType: "addiction", score: addictionScore }).level;
    const trajectory = addictionScore > 0.7 ? "worsening" : "stable";
    addRisk("addiction", severity, trajectory, Math.min(1, addictionScore), addictionIndicators, addictionEvidence);
  }

  // --- Financial Collapse Detection ---
  let financialIndicators = [];
  let financialEvidence = [];
  let financialScore = 0;

  if (constellation.financialDebtToIncomeRatio > 0.8) {
    financialScore += 0.5;
    financialIndicators.push("high debt-to-income ratio");
    financialEvidence.push(`Debt-to-income ratio: ${constellation.financialDebtToIncomeRatio}`);
  }
  if (constellation.integrityScore < 50) { // Financial integrity
    financialScore += 0.2;
    financialIndicators.push("low financial integrity indicators");
    financialEvidence.push(`Integrity Score: ${constellation.integrityScore}`);
  }
  if (constellation.commitmentOverdueCount > 2 && eventStream.some(e => e.type === 'financial_stressor')) {
    financialScore += 0.3;
    financialIndicators.push("overdue commitments amidst financial stressors");
    financialEvidence.push(`Overdue commitments: ${constellation.commitmentOverdueCount}, Financial stressors detected`);
  }

  const recentFinancialEvents = eventStream.filter(e => e.type === 'financial_stressor' || e.type === 'missed_payment');
  if (recentFinancialEvents.length > 1) {
    financialScore += 0.25 * recentFinancialEvents.length;
    financialIndicators.push("repeated financial stressors or missed payments");
    financialEvidence.push(`Recent events: ${recentFinancialEvents.map(e => e.description).join(', ')}`);
  }

  if (financialScore > 0.5) {
    const severity = assessSeverity({ riskType: "financial collapse", score: financialScore }).level;
    const trajectory = financialScore > 0.7 ? "worsening" : "stable";
    addRisk("financial collapse", severity, trajectory, Math.min(1, financialScore), financialIndicators, financialEvidence);
  }

  // --- Violence Detection ---
  let violenceIndicators = [];
  let violenceEvidence = [];
  let violenceScore = 0;

  if (constellation.pastViolentIncidents > 0) {
    violenceScore += 0.6;
    violenceIndicators.push("history of violent incidents");
    violenceEvidence.push(`Past violent incidents: ${constellation.pastViolentIncidents}`);
  }
  if (constellation.emotionalCheckinNegativeRatio > 0.8 && constellation.conflictResolutionScore < 30) {
    violenceScore += 0.4;
    violenceIndicators.push("extreme negative emotions with poor conflict resolution");
    violenceEvidence.push(`Negative emotional ratio: ${constellation.emotionalCheckinNegativeRatio}, Conflict Resolution: ${constellation.conflictResolutionScore}`);
  }

  const recentViolenceEvents = eventStream.filter(e => e.type === 'aggressive_language' || e.type === 'threat_of_harm');
  if (recentViolenceEvents.length > 0) {
    violenceScore += 0.5 * recentViolenceEvents.length;
    violenceIndicators.push("direct indicators of aggression or threats");
    violenceEvidence.push(`Recent events: ${recentViolenceEvents.map(e => e.description).join(', ')}`);
  }

  if (violenceScore > 0.5) {
    const severity = assessSeverity({ riskType: "violence", score: violenceScore }).level;
    const trajectory = violenceScore > 0.7 ? "worsening" : "stable";
    addRisk("violence", severity, trajectory, Math.min(1, violenceScore), violenceIndicators, violenceEvidence);
  }

  // --- Medical Decline Detection ---
  let medicalIndicators = [];
  let medicalEvidence = [];
  let medicalScore = 0;

  if (constellation.chronicPainLevel > 7) {
    medicalScore += 0.3;
    medicalIndicators.push("high chronic pain level");
    medicalEvidence.push(`Chronic Pain Level: ${constellation.chronicPainLevel}`);
  }
  if (constellation.medicationAdherence < 70) {
    medicalScore += 0.4;
    medicalIndicators.push("poor medication adherence");
    medicalEvidence.push(`Medication Adherence: ${constellation.medicationAdherence}%`);
  }
  if (constellation.hrvAverage < 30) { // Low HRV indicates high stress/poor recovery
    medicalScore += 0.3;
    medicalIndicators.push("low heart rate variability (HRV)");
    medicalEvidence.push(`Average HRV: ${constellation.hrvAverage}`);
  }

  const recentMedicalEvents = eventStream.filter(e => e.type === 'health_symptom' || e.type === 'abnormal_vitals' || e.type === 'medical_non_compliance');
  if (recentMedicalEvents.length > 2) {
    medicalScore += 0.15 * recentMedicalEvents.length;
    medicalIndicators.push("frequent health symptoms or abnormal vitals");
    medicalEvidence.push(`Recent events: ${recentMedicalEvents.map(e => e.description).join(', ')}`);
  }

  if (medicalScore > 0.5) {
    const severity = assessSeverity({ riskType: "medical decline", score: medicalScore }).level;
    const trajectory = medicalScore > 0.7 ? "worsening" : "stable";
    addRisk("medical decline", severity, trajectory, Math.min(1, medicalScore), medicalIndicators, medicalEvidence);
  }

  return { risks };
}

/**
 * Assesses the severity level of a given risk.
 * @param {object} risk - An object representing a detected risk.
 *   Expected properties:
 *   - {string} riskType - The type of risk.
 *   - {number} score - A numerical score reflecting the magnitude of the risk (0-1).
 *   - {string} [trajectory='unknown'] - The current trajectory of the risk.
 * @returns {{level: 'low'|'moderate'|'high'|'critical', rationale: string}}
 */
export function assessSeverity(risk) {
  const score = risk.score;
  let level = 'low';
  let rationale = 'The current indicators suggest a low level of risk, with no immediate concerns.';

  if (score >= 0.25 && score < 0.5) {
    level = 'low';
    rationale = 'The risk is present but manageable, requiring monitoring.';
  } else if (score >= 0.5 && score < 0.75) {
    level = 'moderate';
    rationale = 'The risk is increasing and requires attention to prevent further escalation.';
  } else if (score >= 0.75 && score < 0.9) {
    level = 'high';
    rationale = 'The risk is significant and requires immediate action to mitigate potential harm.';
  } else if (score >= 0.9) {
    level = 'critical';
    rationale = 'The risk is severe and imminent, demanding urgent and potentially external intervention.';
  }

  if (risk.trajectory === 'worsening') {
    if (level === 'low') level = 'moderate';
    else if (level === 'moderate') level = 'high';
    else if (level === 'high') level = 'critical';
    rationale += ' The trajectory indicates a worsening situation.';
  } else if (risk.trajectory === 'improving') {
    if (level === 'critical') level = 'high';
    else if (level === 'high') level = 'moderate';
    else if (level === 'moderate') level = 'low';
    rationale += ' The trajectory indicates an improving situation.';
  }

  return { level, rationale };
}

/**
 * Recommends an intervention for a given risk, aiming for the least invasive option.
 * @param {object} risk - A detected risk object, including `riskType` and `severity`.
 * @param {object} [preferences={}] - User preferences that might influence intervention choice.
 *   Example: `{ communicationStyle: 'direct', interventionTolerance: 'low' }`
 * @returns {{intervention: string, invasiveness: number, rationale: string, resources: string[]}}
 */
export function recommendIntervention(risk, preferences = {}) {
  const { riskType, severity } = risk;
  let intervention = "Continue monitoring and provide general well-being prompts.";
  let invasiveness = 0.1;
  let rationale = "No specific intervention needed at this time, general support is sufficient.";
  let resources = [];

  const communicationStyle = preferences.communicationStyle || 'supportive'; // 'direct', 'supportive', 'reflective'

  switch (severity) {
    case 'low':
      if (riskType === 'burnout') {
        intervention = "Suggest a brief, reflective check-in on current workload and energy levels.";
        invasiveness = 0.2;
        rationale = "A gentle prompt to self-assess can help prevent escalation of burnout.";
        resources = ["Mindfulness exercises", "Time management tips"];
      } else if (riskType === 'isolation') {
        intervention = "Offer conversation starters for reconnecting with a declared contact.";
        invasiveness = 0.2;
        rationale = "Proactive, low-pressure suggestions can encourage social engagement.";
        resources = ["Communication tips", "Social event suggestions"];
      } else if (riskType === 'financial collapse') {
        intervention = "Present a summary of recent spending patterns and highlight discretionary categories.";
        invasiveness = 0.3;
        rationale = "Increased awareness of financial habits can empower early adjustments.";
        resources = ["Budgeting templates", "Financial literacy articles"];
      }
      break;

    case 'moderate':
      if (riskType === 'burnout') {
        intervention = "Propose a structured 'energy audit' session to identify depletion sources and recovery needs.";
        invasiveness = 0.4;
        rationale = "A focused session is needed to address moderate burnout risks.";
        resources = ["Energy audit worksheet", "Stress reduction techniques"];
      } else if (riskType === 'isolation') {
        intervention = "Suggest scheduling a direct check-in with a trusted friend or family member, offering to draft the message.";
        invasiveness = 0.5;
        rationale = "Direct encouragement and assistance for re-engagement is appropriate.";
        resources = ["Support network contact list", "Guided social reconnection plan"];
      } else if (riskType === 'hopelessness') {
        intervention = "Facilitate a 'purpose reflection' session to revisit core values and small, actionable goals.";
        invasiveness = 0.5;
        rationale = "Reconnecting with purpose can combat moderate hopelessness.";
        resources = ["Purpose discovery exercises", "Goal-setting frameworks"];
      } else if (riskType === 'addiction') {
        intervention = "Offer a discreet, self-assessment questionnaire on substance use patterns and triggers.";
        invasiveness = 0.5;
        rationale = "A private assessment can help the user recognize patterns without feeling judged.";
        resources = ["Self-assessment tools", "Information on support groups"];
      } else if (riskType === 'financial collapse') {
        intervention = "Suggest a guided review of financial obligations and a plan for prioritizing payments.";
        invasiveness = 0.5;
        rationale = "A structured approach to financial management is crucial for moderate risk.";
        resources = ["Debt management strategies", "Emergency fund planning"];
      } else if (riskType === 'medical decline') {
        intervention = "Recommend reviewing medication adherence patterns and identifying barriers, offering reminders.";
        invasiveness = 0.4;
        rationale = "Improving adherence is a critical step for moderate medical decline.";
        resources = ["Medication reminder app suggestions", "Health goal setting"];
      }
      break;

    case 'high':
      if (riskType === 'burnout') {
        intervention = "Strongly recommend a mandatory rest period and review of all active commitments, offering to defer non-critical ones.";
        invasiveness = 0.7;
        rationale = "High burnout requires significant intervention to prevent crisis.";
        resources = ["Digital detox guides", "Professional coaching referral list"];
      } else if (riskType === 'isolation' || riskType === 'relationship collapse') {
        intervention = "Initiate a guided conversation about reaching out to a designated support person or a professional counselor.";
        invasiveness = 0.7;
        rationale = "External support is vital when social/relationship risks are high.";
        resources = ["Therapist referral network", "Relationship counseling resources"];
      } else if (riskType === 'hopelessness') {
        intervention = "Facilitate connection to a crisis line or mental health professional, emphasizing urgent support.";
        invasiveness = 0.8;
        rationale = "High hopelessness warrants immediate professional mental health intervention.";
        resources = ["Crisis hotlines", "Mental health professional directories"];
      } else if (riskType === 'addiction') {
        intervention = "Urge engagement with a recovery support program or a therapist specializing in addiction, offering direct connection.";
        invasiveness = 0.8;
        rationale = "Structured recovery support is essential for high addiction risk.";
        resources = ["Addiction recovery programs", "Therapists specializing in addiction"];
      } else if (riskType === 'financial collapse') {
        intervention = "Recommend consulting a credit counselor or financial advisor, offering to find local resources.";
        invasiveness = 0.7;
        rationale = "Expert financial guidance is critical for high financial risk.";
        resources = ["Credit counseling services", "Financial advisor directories"];
      } else if (riskType === 'violence') {
        intervention = "Immediately provide resources for anger management or conflict de-escalation, and inquire about safety of self/others.";
        invasiveness = 0.9;
        rationale = "High violence risk requires urgent de-escalation and safety planning.";
        resources = ["Anger management programs", "Domestic violence hotlines"];
      } else if (riskType === 'medical decline') {
        intervention = "Strongly advise immediate consultation with a primary care physician or specialist, offering to schedule the appointment.";
        invasiveness = 0.8;
        rationale = "High medical risk necessitates prompt professional medical attention.";
        resources = ["Telehealth services", "Specialist directories"];
      }
      break;

    case 'critical':
      if (riskType === 'violence' || riskType === 'addiction' && risk.evidence.includes('overdose_risk')) {
        intervention = "Trigger emergency alert chain to designated contacts and emergency services, while providing immediate crisis support.";
        invasiveness = 1.0;
        rationale = "Critical violence or overdose risk demands immediate, life-saving intervention.";
        resources = ["Emergency services (911/local equivalent)", "Crisis hotlines", "Designated emergency contacts"];
      } else {
        intervention = "Initiate emergency protocol: contact designated support persons, provide crisis resources, and strongly advise professional intervention.";
        invasiveness = 0.95;
        rationale = "All critical risks require rapid, multi-faceted intervention and external support.";
        resources = ["Crisis hotlines", "Emergency contacts", "Mental health services"];
      }
      break;
  }

  // Adjust wording based on communication style preference
  if (communicationStyle === 'direct' && invasiveness > 0.3) {
    intervention = `ACTION REQUIRED: ${intervention}`;
  } else if (communicationStyle === 'reflective' && invasiveness > 0.3) {
    intervention = `Consider this: ${intervention}`;
  }

  return { intervention, invasiveness, rationale, resources };
}

/**
 * Determines if an escalation to human oversight or emergency services is needed.
 * @param {object} risk - A detected risk object, including `severity` and `evidence`.
 * @returns {boolean}
 */
export function isEscalationNeeded(risk) {
  if (risk.severity === 'critical') {
    return true;
  }
  if (risk.severity === 'high' && risk.evidence.some(e => e.includes('imminent') || e.includes('urgent') || e.includes('threat'))) {
    return true;
  }
  if (risk.riskType === 'violence' && (risk.severity === 'high' || risk.severity === 'critical')) {
    return true;
  }
  if (risk.riskType === 'addiction' && risk.evidence.includes('overdose_risk')) {
    return true;
  }
  return false;
}

/**
 * Returns the list of supported risk types.
 * @returns {string[]}
 */
export function getRiskTypes() {
  return [...RISK_TYPES];
}