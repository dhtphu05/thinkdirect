/**
 * ThinkDirect V3 — Practice Adapters, Audio DataURL Parsing & Portfolio Storage Tests
 */

import {
  DemoPracticeAdapter,
  RealPracticeAdapter,
  PRACTICE_CONTEXTS,
} from '../src/services/practiceAdapters';
import {
  SEEDED_HISTORY_SESSIONS,
  computePortfolioSummary,
  computeScaffoldingDecay,
} from '../src/utils/storageUtils';
import {
  extractThoughtChainNodes,
  resolveConceptBridgeFallback,
  evaluateTransferAttempt,
  GOLDEN_DEMO_PATH,
} from '../src/services/speakingEngine';
import { stripDataUrlPrefix } from '../server';
import { PracticeContextKey, SceneData } from '../src/types';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  details?: string;
}

const testResults: TestResult[] = [];

function assert(condition: boolean, id: number, testName: string, failureDetails = '') {
  if (condition) {
    testResults.push({ id, name: testName, passed: true });
    console.log(`✓ [PASS ${id}/9] ${testName}`);
  } else {
    testResults.push({ id, name: testName, passed: false, details: failureDetails });
    console.error(`✗ [FAIL ${id}/9] ${testName} - ${failureDetails}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   ThinkDirect V3 — Adapter, Audio & Portfolio Tests');
  console.log('======================================================\n');

  // 1. DemoPracticeAdapter: Rejects repeated answer "im coding"
  {
    const adapter = new DemoPracticeAdapter('STUDY_WORKSPACE');
    const result = await adapter.evaluateExpansion("I'm coding.", 'im coding', 1);
    assert(
      result.outcome === 'REPEAT' && !result.isValid,
      1,
      'Demo adapter rejects "im coding" after "I\'m coding." with outcome REPEAT',
      `Received outcome: ${result.outcome}`
    );
  }

  // 2. DemoPracticeAdapter: Exact DevFest Overview Section 4 progression
  {
    const adapter = new DemoPracticeAdapter('STUDY_WORKSPACE');
    const exp1 = await adapter.evaluateExpansion(
      adapter.contextData.initialThought,
      adapter.contextData.expansion1Sample,
      1
    );
    const exp2 = await adapter.evaluateExpansion(
      exp1.synthesizedThought,
      adapter.contextData.expansion2Sample,
      2
    );
    const why = await adapter.evaluateIdeaTurn('Why', adapter.contextData.whySample);
    const how = await adapter.evaluateIdeaTurn(
      'How',
      adapter.contextData.howSample,
      adapter.contextData.whySample
    );
    assert(
      exp1.isValid && exp2.isValid && why.isValid && how.isValid,
      2,
      'Validates complete DevFest Section 4 progression (Expand 1 -> Expand 2 -> Why -> How)',
      `exp1=${exp1.isValid}, exp2=${exp2.isValid}, why=${why.isValid}, how=${how.isValid}`
    );
  }

  // 3. Multi-context completeness (STUDY_WORKSPACE, MORNING_COFFEE, PLANNING_DAY)
  {
    const contexts: PracticeContextKey[] = [
      'STUDY_WORKSPACE',
      'MORNING_COFFEE',
      'PLANNING_DAY',
    ];
    const allLoaded = contexts.every((k) => {
      const adapter = new DemoPracticeAdapter(k);
      return (
        adapter.contextData.topicLabel &&
        adapter.contextData.initialThought &&
        adapter.contextData.thinkingPrompts.length === 4 &&
        adapter.contextData.selfTalkMonologue.length > 20 &&
        Boolean(adapter.contextData.reasonSample) &&
        Boolean(adapter.contextData.exampleSample)
      );
    });
    assert(
      allLoaded,
      3,
      'All 3 practice contexts include 5W1H, Reason-Example, Self-Talk, and Recall samples',
      'Missing fields in one or more contexts'
    );
  }

  // 4. Guided Self-Talk monologue validation
  {
    const adapter = new DemoPracticeAdapter('STUDY_WORKSPACE');
    const evaluation = await adapter.evaluateSelfTalk(
      adapter.contextData.selfTalkMonologue
    );
    assert(
      evaluation.isValid && evaluation.connectorsFound.length >= 2,
      4,
      'Evaluates DevFest self-talk monologue ("Something isn\'t working with authentication...")',
      `Connectors: ${JSON.stringify(evaluation.connectorsFound)}`
    );
  }

  // 5. Independent Recall comparison with reference utterances
  {
    const adapter = new DemoPracticeAdapter('STUDY_WORKSPACE');
    const ctx = PRACTICE_CONTEXTS.STUDY_WORKSPACE;
    const recallResult = await adapter.evaluateRecall(
      ctx.independentRecallSample,
      false,
      [ctx.expansion2Sample, ctx.whySample, ctx.howSample, ctx.selfTalkMonologue]
    );
    assert(
      recallResult.isValid && recallResult.coverageScore >= 0.66,
      5,
      'Independent recall verifies retained concepts across all 4 methods',
      `Coverage score: ${recallResult.coverageScore}`
    );
  }

  // 6. Chrome MediaRecorder `audio/webm;codecs=opus` base64 prefix stripping
  {
    const rawOpusDataUrl = 'data:audio/webm;codecs=opus;base64,GkXfo59ChoEBQveBAULygQRC';
    const parsed = stripDataUrlPrefix(rawOpusDataUrl, 'audio/webm;codecs=opus');
    assert(
      parsed.cleanMimeType === 'audio/webm' &&
        parsed.base64 === 'GkXfo59ChoEBQveBAULygQRC',
      6,
      'Correctly strips data:audio/webm;codecs=opus;base64, prefix and normalizes MIME type',
      JSON.stringify(parsed)
    );
  }

  // 7. RealPracticeAdapter dynamically grounds prompts in custom captured SceneData
  {
    const customScene: SceneData = {
      title: 'Cozy Bookstore Corner',
      description: 'Wooden bookshelf with English novels and a warm reading lamp.',
      imageUrl: '/bookstore.jpg',
      isSample: false,
      openingQuestion: 'What book caught your eye here?',
      initialSuggestedThought: "I'm browsing books.",
      suggestedFramework: 'IDEA_REASON_EXAMPLE',
      objects: [
        {
          name: 'Paperback Novel',
          definition: 'A light book easy to carry in a backpack.',
          contextualSentence: "I'm browsing a short sci-fi novel.",
        },
      ],
      suggestedExpressions: [
        {
          phrase: 'unwind after work',
          meaning: 'relax mentally after a busy day',
          example: 'Reading fiction helps me unwind after work.',
        },
      ],
    };
    const realAdapter = new RealPracticeAdapter('STUDY_WORKSPACE', customScene);
    const repeatCheck = await realAdapter.evaluateExpansion(
      "I'm browsing books.",
      'im browsing books',
      1
    );
    assert(
      realAdapter.mode === 'real' &&
        realAdapter.contextData.title === 'Cozy Bookstore Corner' &&
        realAdapter.contextData.initialThought === "I'm browsing books." &&
        repeatCheck.outcome === 'REPEAT',
      7,
      'RealPracticeAdapter grounds prompts in captured SceneData and catches instant repetition',
      `title=${realAdapter.contextData.title}, repeat=${repeatCheck.outcome}`
    );
  }

  // 8. IDEA_REASON_EXAMPLE turn validation through adapter
  {
    const adapter = new DemoPracticeAdapter('STUDY_WORKSPACE');
    const reason = await adapter.evaluateIdeaTurn(
      'Reason',
      adapter.contextData.reasonSample || ''
    );
    const example = await adapter.evaluateIdeaTurn(
      'Example',
      adapter.contextData.exampleSample || '',
      adapter.contextData.reasonSample
    );
    assert(
      reason.isValid && example.isValid,
      8,
      'Adapter validates both Reason and Example turns cleanly',
      `reason=${reason.outcome}, example=${example.outcome}`
    );
  }

  // 9. Portfolio summary computes observable totals & deduplicates learned expressions
  {
    const summary = computePortfolioSummary(SEEDED_HISTORY_SESSIONS);
    assert(
      summary.totalSessions === 2 &&
        summary.totalIdeas === 10 &&
        summary.learnedExpressions.length >= 4 &&
        summary.totalSpeakingMinutes >= 2,
      9,
      'Portfolio summary aggregates seeded history ideas, speaking minutes, and expressions',
      JSON.stringify(summary)
    );
  }

  // 10. Live Thought-Chain Nodes detect all 5 semantic pillars on complete recall and identify missing pillar on partial speech
  {
    const fullChain = extractThoughtChainNodes(GOLDEN_DEMO_PATH.stepE_recall);
    const partialChain = extractThoughtChainNodes(
      "I'm building a login page for my university project."
    );
    assert(
      fullChain.completedCount === 5 &&
        partialChain.completedCount >= 2 &&
        Boolean(partialChain.missingPrompt),
      10,
      'Live Thought-Chain Nodes detect 5/5 semantic links on full recall and prompt missing link on partial speech',
      `full=${fullChain.completedCount}, partial=${partialChain.completedCount}, next=${partialChain.missingPrompt}`
    );
  }

  // 11. Vietnamese Stuck-Moment Concept Bridge returns short 2-5 word English chunk + self-build prompt (never full sentence)
  {
    const bridge = resolveConceptBridgeFallback(
      'token hết hạn',
      'University Study Workspace'
    );
    const chunkWords = bridge.englishChunk.trim().split(/\s+/).length;
    assert(
      bridge.englishChunk === 'token has expired' &&
        chunkWords >= 2 &&
        chunkWords <= 5 &&
        bridge.selfBuildPrompt.includes('___'),
      11,
      'Concept Bridge resolves Vietnamese stuck idea into concise English chunk + open self-expression frame',
      JSON.stringify(bridge)
    );
  }

  // 12. 30s Unseen Scene Transfer Challenge verifies 4-pillar transfer on unseen Morning Coffee context
  {
    const transferRes = evaluateTransferAttempt(
      "I'm having coffee before my morning class because I have a team presentation today. Traffic might be heavy this morning, so I'll review my slides and leave early.",
      'Morning Routine & Coffee'
    );
    assert(
      transferRes.isValid &&
        transferRes.isTransferVerified &&
        transferRes.pillarsTransferred === 4,
      12,
      'Unseen Scene Transfer Challenge verifies 4/4 thought pillars without Step 1-3 scaffolding',
      `pillars=${transferRes.pillarsTransferred}, verified=${transferRes.isTransferVerified}`
    );
  }

  // 13. Scaffolding Decay computes rising independence trajectory across sessions (3 hints -> 1 hint)
  {
    const decay = computeScaffoldingDecay(SEEDED_HISTORY_SESSIONS);
    assert(
      decay.length === 2 &&
        decay[0].hintsUsed === 3 &&
        decay[1].hintsUsed === 1 &&
        decay[1].independencePercent > decay[0].independencePercent,
      13,
      'Scaffolding Decay tracks chronological drop in hint dependency and rising independence',
      JSON.stringify(decay)
    );
  }

  const allPassed = testResults.every((t) => t.passed);
  console.log('\n------------------------------------------------------');
  console.log(
    `Results: ${testResults.filter((t) => t.passed).length}/${testResults.length} passed.`
  );
  if (!allPassed) {
    process.exit(1);
  } else {
    console.log(
      `All ${testResults.length} Adapter, Audio, Portfolio & Thesis-Expansion tests passed!\n`
    );
  }
}

runTests();
