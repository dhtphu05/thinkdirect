/**
 * ThinkDirect V3 — Deterministic Test Suite for Speaking Method Engine & 6 Observable Metrics
 * Validates all 10 foundational SLA rules + 6 generalized real-world & DevFest 2026 metrics tests.
 */

import {
  evaluateExpansionAttempt,
  evaluateWhyAttempt,
  evaluateHowAttempt,
  evaluateIdeaDevelopmentAttempt,
  isThoughtAlreadyComplete,
  determineFramework,
  evaluateSelfTalkMonologue,
  evaluateIndependentRecall,
  computeSessionMetrics,
  buildNaturalUpgrade,
  GOLDEN_DEMO_PATH,
} from '../src/services/speakingEngine';
import {
  SEEDED_HISTORY_SESSIONS,
  getSessionSrsInfo,
  computePortfolioSummary,
} from '../src/utils/storageUtils';
import { DAILY_SPEAKING_PROMPTS } from '../src/data/dailyPromptsData';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, id: number, testName: string, failureDetails = '') {
  if (condition) {
    results.push({ id, name: testName, passed: true });
    console.log(`✓ [PASS ${id}/16] ${testName}`);
  } else {
    results.push({ id, name: testName, passed: false, details: failureDetails });
    console.error(`✗ [FAIL ${id}/16] ${testName} - ${failureDetails}`);
  }
}

console.log('\n======================================================');
console.log('   ThinkDirect V3 — Speaking Method Engine & SLA Tests');
console.log('======================================================\n');

// Test 1: Repetition without new information is rejected as REPEAT
{
  const result = evaluateExpansionAttempt("I'm coding", 'im coding', 1);
  assert(
    result.outcome === 'REPEAT' && result.isValid === false,
    1,
    'Rejects "im coding" after "I\'m coding" with outcome REPEAT and isValid false',
    `Received outcome=${result.outcome}, isValid=${result.isValid}`
  );
}

// Test 2: Valid expansion at Step 1 adding specific target
{
  const result = evaluateExpansionAttempt("I'm coding", "I'm building a login page", 1);
  assert(
    result.outcome === 'VALID_EXPANSION' && result.isValid === true && (result.addedWords?.length || 0) >= 2,
    2,
    'Accepts "I\'m building a login page" as VALID_EXPANSION with new semantic words',
    `Received outcome=${result.outcome}, isValid=${result.isValid}`
  );
}

// Test 3: Valid expansion at Step 2 adding context/purpose
{
  const result = evaluateExpansionAttempt(
    "I'm building a login page",
    "I'm building a login page for my university project",
    2
  );
  assert(
    result.outcome === 'VALID_EXPANSION' && result.isValid === true,
    3,
    'Accepts "for my university project" as valid Step 2 expansion',
    `Received outcome=${result.outcome}, isValid=${result.isValid}`
  );
}

// Test 4: Valid WHY response (DevFest Overview Section 4: "Students need to sign in securely.")
{
  const result = evaluateWhyAttempt(GOLDEN_DEMO_PATH.stepC_why);
  assert(
    result.outcome === 'VALID_WHY' && result.isValid === true,
    4,
    'Validates purpose in WHY answer ("Students need to sign in securely.")',
    `Received outcome=${result.outcome}, isValid=${result.isValid}`
  );
}

// Test 5: Rejecting repeated WHY answer for HOW question
{
  const whyAnswer = GOLDEN_DEMO_PATH.stepC_why;
  const result = evaluateHowAttempt(whyAnswer, whyAnswer);
  assert(
    result.outcome === 'REPEATED_WHY_AS_HOW' && result.isValid === false,
    5,
    'Rejects repeating WHY answer for HOW question with REPEATED_WHY_AS_HOW',
    `Received outcome=${result.outcome}, isValid=${result.isValid}`
  );
}

// Test 6: Valid HOW response describing tools & implementation
{
  const result = evaluateHowAttempt(
    GOLDEN_DEMO_PATH.stepC_how,
    GOLDEN_DEMO_PATH.stepC_why
  );
  assert(
    result.outcome === 'VALID_HOW' && result.isValid === true,
    6,
    'Accepts "I\'m using React with an authentication API." as VALID_HOW',
    `Received outcome=${result.outcome}, isValid=${result.isValid}`
  );
}

// Test 7: Detects already-complete thought across coding & everyday scenes
{
  const completeCoding =
    'I am building a student login page for my university project because students need to sign in tonight';
  const completeEveryday =
    'I am brewing hot coffee in my kitchen before morning class so that I stay focused';
  assert(
    isThoughtAlreadyComplete(completeCoding) === true &&
      isThoughtAlreadyComplete(completeEveryday) === true,
    7,
    'Identifies already-complete thought across both coding and everyday real-world contexts',
    `coding=${isThoughtAlreadyComplete(completeCoding)}, everyday=${isThoughtAlreadyComplete(completeEveryday)}`
  );
}

// Test 8: Dynamic framework routing
{
  const actionThought = "I'm building a login page with React";
  const opinionThought = 'I prefer studying alone because it is quieter';
  const framework1 = determineFramework(actionThought);
  const framework2 = determineFramework(opinionThought);

  assert(
    framework1 === '5W1H' && framework2 === 'IDEA_REASON_EXAMPLE',
    8,
    'Routes action to 5W1H and opinion to IDEA_REASON_EXAMPLE',
    `action=${framework1}, opinion=${framework2}`
  );
}

// Test 9: Guided Self-Talk monologue evaluation (DevFest Overview Section 4)
{
  const selfTalkResult = evaluateSelfTalkMonologue(GOLDEN_DEMO_PATH.stepD_selfTalk);
  assert(
    selfTalkResult.isValid === true && selfTalkResult.connectorsFound.length >= 2,
    9,
    'Validates DevFest Section 4 Self-Talk monologue ("Something isn\'t working with authentication...")',
    `isValid=${selfTalkResult.isValid}, connectors=${JSON.stringify(selfTalkResult.connectorsFound)}`
  );
}

// Test 10: Independent recall semantic validation without visual hints
{
  const recallResult = evaluateIndependentRecall(GOLDEN_DEMO_PATH.stepE_recall, false);
  assert(
    recallResult.isValid === true && recallResult.ideasIdentified.length >= 3,
    10,
    'Validates independent recall based on semantic meaning rather than verbatim wording',
    `isValid=${recallResult.isValid}, ideas=${JSON.stringify(recallResult.ideasIdentified)}`
  );
}

// Test 11: Generalized expansion on non-coding real-world scene (Morning Coffee)
{
  const r1 = evaluateExpansionAttempt(
    "I'm drinking coffee.",
    "I'm drinking hot black coffee at my kitchen table.",
    1,
    'Morning Coffee Kitchen'
  );
  assert(
    r1.isValid && r1.outcome === 'VALID_EXPANSION',
    11,
    'Accepts real-world non-coding expansion ("drinking hot black coffee at my kitchen table")',
    `outcome=${r1.outcome}`
  );
}

// Test 12: Generalized WHY & HOW on non-coding real-world scene
{
  const whyRes = evaluateWhyAttempt(
    'Because I have two morning classes and want to stay awake.',
    'Morning Coffee Kitchen'
  );
  const howRes = evaluateHowAttempt(
    'I brew fresh espresso at home while checking my lecture notes.',
    'Because I have two morning classes and want to stay awake.',
    'Morning Coffee Kitchen'
  );
  assert(
    whyRes.isValid && howRes.isValid,
    12,
    'Validates non-coding WHY and HOW answers without requiring React/API keywords',
    `why=${whyRes.outcome}, how=${howRes.outcome}`
  );
}

// Test 13: IDEA_REASON_EXAMPLE validation & REPEATED_REASON_AS_EXAMPLE protection
{
  const reason = 'Because studying in a quiet cafe helps me concentrate deeply.';
  const validReason = evaluateIdeaDevelopmentAttempt('Reason', reason);
  const repeatedAsExample = evaluateIdeaDevelopmentAttempt('Example', reason, reason);
  const validExample = evaluateIdeaDevelopmentAttempt(
    'Example',
    'For example, yesterday I finished three chapters in just one hour at the corner cafe.',
    reason
  );
  assert(
    validReason.isValid &&
      !repeatedAsExample.isValid &&
      repeatedAsExample.outcome === 'REPEATED_REASON_AS_EXAMPLE' &&
      validExample.isValid &&
      validExample.outcome === 'VALID_EXAMPLE',
    13,
    'Validates Reason & Example turns and rejects repeating Reason as Example',
    `reason=${validReason.outcome}, repeat=${repeatedAsExample.outcome}, example=${validExample.outcome}`
  );
}

// Test 14: Reference-grounded Independent Recall for arbitrary real camera scene
{
  const recall = evaluateIndependentRecall(
    'Tonight I am cooking pasta with fresh tomatoes for my family because everyone had a long day, and first I will boil the water and chop garlic.',
    false,
    [
      "I'm cooking dinner.",
      "I'm cooking pasta with fresh tomatoes for my family.",
      'Because everyone had a long busy day.',
      'I boil water first and chop garlic in olive oil.',
    ]
  );
  assert(
    recall.isValid && recall.coverageScore >= 0.66 && recall.ideasIdentified.length >= 2,
    14,
    'Evaluates independent recall dynamically against learner utterances in any real camera scene',
    `coverage=${recall.coverageScore}, ideas=${JSON.stringify(recall.ideasIdentified)}`
  );
}

// Test 15: computeSessionMetrics produces accurate 6 Observable SLA Metrics (0 hints)
{
  const metrics = computeSessionMetrics({
    initialThought: GOLDEN_DEMO_PATH.stepA_root,
    acceptedExpansions: [
      GOLDEN_DEMO_PATH.stepA_root,
      GOLDEN_DEMO_PATH.stepB_expansion1,
      GOLDEN_DEMO_PATH.stepB_expansion2,
    ],
    expansionTotalAttempts: 2,
    whyAnswer: GOLDEN_DEMO_PATH.stepC_why,
    howAnswer: GOLDEN_DEMO_PATH.stepC_how,
    selfTalkTranscript: GOLDEN_DEMO_PATH.stepD_selfTalk,
    independentRecallTranscript: GOLDEN_DEMO_PATH.stepE_recall,
    recallIdeasIdentified: ['Project & Feature Goal', 'Problem & Cause', 'Next Immediate Step'],
    hintEvents: [],
    attempts: [
      { source: 'microphone', durationSeconds: 4, isValid: true },
      { source: 'microphone', durationSeconds: 5, isValid: true },
      { source: 'microphone', durationSeconds: 5, isValid: true },
      { source: 'microphone', durationSeconds: 6, isValid: true },
      { source: 'microphone', durationSeconds: 22, isValid: true },
      { source: 'microphone', durationSeconds: 28, isValid: true },
    ],
    selfTalkDurationSeconds: 22,
    recallDurationSeconds: 28,
    stagesCompleted: 4,
  });

  assert(
    metrics.meaningfulIdeaUnits >= 5 &&
      metrics.expansionSuccess.ratePercent === 100 &&
      metrics.hintUsage.dependencyLabel === 'Independent' &&
      metrics.speechContinuity.totalSpeakingSeconds === 70 &&
      metrics.independentRecall.usedWithoutHints === true &&
      metrics.sessionCompletion.completedCoreJourney === true,
    15,
    'Computes all 6 Observable MVP Success Metrics accurately for an independent spoken session',
    JSON.stringify(metrics)
  );
}

// Test 16: computeSessionMetrics tracks hint dependency & expansion retry rate honestly
{
  const metricsWithHints = computeSessionMetrics({
    initialThought: "I'm coding.",
    acceptedExpansions: [
      "I'm coding.",
      "I'm building a login page.",
      "I'm building a login page for my university project.",
    ],
    expansionTotalAttempts: 3, // 1 repeat attempt ("im coding") + 2 valid
    whyAnswer: GOLDEN_DEMO_PATH.stepC_why,
    howAnswer: GOLDEN_DEMO_PATH.stepC_how,
    selfTalkTranscript: GOLDEN_DEMO_PATH.stepD_selfTalk,
    independentRecallTranscript: GOLDEN_DEMO_PATH.stepE_recall,
    recallIdeasIdentified: ['Project & Feature Goal', 'Next Immediate Step'],
    hintEvents: [
      { stageKey: 'EXPANSION', questionId: 'EXP_1', hintLevel: 1, isVietnameseRescue: false, timestamp: 1 },
      { stageKey: 'IDEA_DEVELOPMENT', questionId: 'IDEA_2', hintLevel: 2, isVietnameseRescue: true, timestamp: 2 },
    ],
    attempts: [{ source: 'typing', durationSeconds: 0, isValid: true }],
    selfTalkDurationSeconds: 18,
    recallDurationSeconds: 20,
    stagesCompleted: 4,
  });

  assert(
    metricsWithHints.expansionSuccess.ratePercent === 67 &&
      metricsWithHints.hintUsage.totalHintsUsed === 2 &&
      metricsWithHints.hintUsage.vietnameseRescueUsed === true &&
      metricsWithHints.hintUsage.dependencyLabel === 'Light support',
    16,
    'Reflects retry rate and Vietnamese rescue hint usage transparently in SessionMetrics',
    JSON.stringify(metricsWithHints)
  );
}

// Test 17: buildNaturalUpgrade catches Vietnamese L1 "because ... so ..." and "for not ..." habits
{
  const becauseSo = buildNaturalUpgrade({
    independentRecall:
      'Because I have two deadlines this week, so I plan my schedule early.',
  });
  const forNot = buildNaturalUpgrade({
    independentRecall: 'I write a checklist for not forget urgent tasks.',
  });

  assert(
    becauseSo.naturalPhrasing.startsWith('Since ') &&
      !becauseSo.naturalPhrasing.toLowerCase().includes(', so ') &&
      forNot.naturalPhrasing.includes("so I don't forget urgent tasks"),
    17,
    'SLA Recast Engine (buildNaturalUpgrade) upgrades Vietnamese L1 transfer patterns while keeping exact meaning',
    JSON.stringify({ becauseSo, forNot })
  );
}

// Test 18: Spaced Repetition (1d -> 3d -> 7d) due calculation via getSessionSrsInfo
{
  const now = Date.now();
  const dueSession = {
    ...SEEDED_HISTORY_SESSIONS[0],
    srsStage: 0 as const,
    nextReviewAt: now - 5000,
  };
  const futureSession = {
    ...SEEDED_HISTORY_SESSIONS[1],
    srsStage: 1 as const,
    nextReviewAt: now + 1000 * 60 * 60 * 48,
  };
  const dueStatus = getSessionSrsInfo(dueSession, now);
  const futureStatus = getSessionSrsInfo(futureSession, now);

  assert(
    dueStatus.isDue === true &&
      dueStatus.badgeLabel === 'Due · 24h Recall' &&
      futureStatus.isDue === false &&
      futureStatus.badgeLabel === 'Recall in 2d',
    18,
    'Computes Spaced Repetition (SRS) due vs scheduled states accurately',
    JSON.stringify({ dueStatus, futureStatus })
  );
}

// Test 19: computePortfolioSummary separates seeded samples & tracks Active Expression spoken reuse
{
  const withSamples = computePortfolioSummary(SEEDED_HISTORY_SESSIONS, {
    excludeSamples: false,
  });
  const personalOnly = computePortfolioSummary(SEEDED_HISTORY_SESSIONS, {
    excludeSamples: true,
  });
  const spokenExpr = withSamples.learnedExpressions.find(
    (e) => e.phrase.toLowerCase() === 'review my slides' || e.spokenCount >= 1
  );

  assert(
    withSamples.totalSessions === 2 &&
      withSamples.hasSampleSessions === true &&
      personalOnly.totalSessions === 0 &&
      Boolean(spokenExpr && spokenExpr.spokenCount >= 1),
    19,
    'Separates demo baseline from personal sessions and tracks active expression spoken reuse',
    JSON.stringify({
      withSamplesCount: withSamples.totalSessions,
      personalCount: personalOnly.totalSessions,
      spokenExpr,
    })
  );
}

// Test 20: 12 No-Camera Daily Speaking Prompts span all 3 everyday categories cleanly
{
  const workCount = DAILY_SPEAKING_PROMPTS.filter(
    (p) => p.category === 'work_tech'
  ).length;
  const campusCount = DAILY_SPEAKING_PROMPTS.filter(
    (p) => p.category === 'campus_study'
  ).length;
  const dailyCount = DAILY_SPEAKING_PROMPTS.filter(
    (p) => p.category === 'daily_life'
  ).length;
  const allHaveExpressions = DAILY_SPEAKING_PROMPTS.every(
    (p) =>
      p.scene.suggestedExpressions.length >= 3 &&
      Boolean(p.scene.initialSuggestedThought)
  );

  assert(
    DAILY_SPEAKING_PROMPTS.length === 12 &&
      workCount === 4 &&
      campusCount === 4 &&
      dailyCount === 4 &&
      allHaveExpressions,
    20,
    'Provides 12 complete No-Camera Daily Prompts balanced across Work, Campus, and Daily Life',
    JSON.stringify({ total: DAILY_SPEAKING_PROMPTS.length, workCount, campusCount, dailyCount })
  );
}

const allPassed = results.every((r) => r.passed);
const passedCount = results.filter((r) => r.passed).length;
console.log('\n======================================================');
console.log(`   Results: ${passedCount}/${results.length} tests passed.`);
console.log(`   Status:  ${allPassed ? `ALL ${results.length} TESTS PASSED` : 'SOME TESTS FAILED'}`);
console.log('======================================================\n');

if (!allPassed) {
  process.exit(1);
}
