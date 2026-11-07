/**
 * ThinkDirect V3 Speaking Method Engine — DevFest 2026
 * Generalized semantic SLA evaluation, repetition guardrails, 5W1H / Idea–Reason–Example
 * framework routing, Golden Happy Path, and 6 Observable MVP Success Metrics.
 */

import {
  ExpansionOutcome,
  IdeaValidationOutcome,
  IdeaQuestionKey,
  FrameworkType,
  HintEvent,
  InputMode,
  SessionMetrics,
  ThoughtChainNode,
  ConceptBridgeResult,
  TransferEvaluationResult,
  NaturalPhrasingUpgrade,
} from '../types';

/**
 * Normalizes text for linguistic comparison:
 * lowercase, removes punctuation, expands common English contractions, collapses spaces.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\bi'm\b|\bim\b/g, 'i am')
    .replace(/\bdon't\b|\bdont\b/g, 'do not')
    .replace(/\bcan't\b|\bcant\b/g, 'cannot')
    .replace(/\bisn't\b|\bisnt\b/g, 'is not')
    .replace(/\baren't\b|\barent\b/g, 'are not')
    .replace(/\bwasn't\b|\bwasnt\b/g, 'was not')
    .replace(/\bwon't\b|\bwont\b/g, 'will not')
    .replace(/\bit's\b|\bits\b/g, 'it is')
    .replace(/\bi'll\b|\bill\b/g, 'i will')
    .replace(/\bi've\b|\bive\b/g, 'i have')
    .replace(/\bthat's\b|\bthats\b/g, 'that is')
    .replace(/\bwhat's\b|\bwhats\b/g, 'what is')
    .replace(/\bthere's\b|\btheres\b/g, 'there is')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'i',
  'am',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'a',
  'an',
  'the',
  'and',
  'or',
  'to',
  'for',
  'in',
  'on',
  'at',
  'my',
  'me',
  'we',
  'our',
  'you',
  'your',
  'it',
  'this',
  'that',
  'these',
  'those',
  'so',
  'of',
  'with',
  'just',
  'now',
  'very',
  'really',
  'uh',
  'um',
]);

/**
 * Extracts meaningful content words (excluding light grammatical stop words).
 */
export function extractContentWords(text: string): Set<string> {
  const normalized = normalizeText(text);
  if (!normalized) return new Set();
  const words = normalized
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return new Set(words);
}

/**
 * Computes Jaccard word-set similarity between two texts (0..1).
 */
export function computeTokenSimilarity(a: string, b: string): number {
  const setA = extractContentWords(a);
  const setB = extractContentWords(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Checks whether a thought is already complete across ANY real-world context
 * (action/state + concrete target/detail + purpose, time, or causal clause).
 */
export function isThoughtAlreadyComplete(text: string): boolean {
  const norm = normalizeText(text);
  const words = norm.split(/\s+/).filter(Boolean);
  if (words.length < 9) return false;

  const contentWords = extractContentWords(text);
  if (contentWords.size < 5) return false;

  const hasVerbOrProgressive =
    /\b(\w+ing|build|code|make|create|work|fix|develop|study|write|test|design|drink|brew|cook|read|plan|prepare|organize|practice|review|learn)\b/.test(
      norm
    );

  const hasPurposeOrContextClause =
    /\b(because|so that|in order to|before|after|while|during|for my|to stay|to finish|to get|to help|students need|users can|every morning|tonight)\b/.test(
      norm
    );

  return hasVerbOrProgressive && hasPurposeOrContextClause;
}

/**
 * Determines whether the thought is an Action/Process (5W1H) or Opinion/Preference (Idea-Reason-Example).
 */
export function determineFramework(thought: string): FrameworkType {
  const norm = normalizeText(thought);
  const opinionPatterns = [
    /\b(prefer|like|love|dislike|enjoy|favorite)\b/,
    /\b(i think|i believe|in my opinion|i feel)\b/,
    /\b(better|best|worse|important|crucial|choice|decided)\b/,
  ];
  for (const p of opinionPatterns) {
    if (p.test(norm)) return 'IDEA_REASON_EXAMPLE';
  }
  return '5W1H';
}

export interface ExpansionEvaluationResult {
  outcome: ExpansionOutcome;
  isValid: boolean;
  feedback: string;
  synthesizedThought: string;
  nextPrompt: string;
  isAlreadyComplete: boolean;
  addedWords: string[];
  hintL1: string;
  hintL2: string;
  hintL3: string;
  vietnameseRescue: string;
}

/**
 * Evaluates Sentence Expansion attempts against the previous accepted thought.
 * Rejects paraphrases without new semantic content (e.g., "I'm coding" -> "im coding")
 * while supporting both Study Workspace and arbitrary real camera scenes.
 */
export function evaluateExpansionAttempt(
  previousThought: string,
  newAttempt: string,
  subStep: number,
  sceneContext = 'University Study Workspace'
): ExpansionEvaluationResult {
  const normPrev = normalizeText(previousThought);
  const normNew = normalizeText(newAttempt);
  const isStudyScene = /study|workspace|coding|laptop/i.test(sceneContext);

  if (!normNew || normNew.length < 2) {
    return {
      outcome: 'UNCLEAR',
      isValid: false,
      feedback: 'Say or type one fuller English sentence to grow your thought.',
      synthesizedThought: previousThought,
      nextPrompt:
        subStep === 1
          ? 'What specifically are you working on or doing?'
          : 'Who is it for, or when/where is this happening?',
      isAlreadyComplete: false,
      addedWords: [],
      hintL1: 'Add one concrete object or specific activity.',
      hintL2: isStudyScene ? "Start with: I'm building..." : "Start with: I'm...",
      hintL3: isStudyScene
        ? "Example: I'm building a login page."
        : `${previousThought.replace(/\.$/, '')} right now at my desk.`,
      vietnameseRescue: 'Gợi ý: Hãy thêm một chi tiết cụ thể (đồ vật, việc đang làm hoặc địa điểm).',
    };
  }

  const prevContent = extractContentWords(previousThought);
  const newContent = extractContentWords(newAttempt);
  const addedWords = [...newContent].filter((w) => !prevContent.has(w));

  // Core SLA Guardrail: Reject exact/contracted repetition ("I'm coding" -> "im coding")
  if (normPrev && (normPrev === normNew || addedWords.length === 0)) {
    return {
      outcome: 'REPEAT',
      isValid: false,
      feedback: isStudyScene
        ? "That's the same idea without new detail. Try adding what specific feature or page you're building."
        : "That repeats your previous idea. Try adding what, where, or why so your thought grows.",
      synthesizedThought: previousThought,
      nextPrompt:
        subStep === 1
          ? isStudyScene
            ? 'What are you building?'
            : 'What specific detail can you add?'
          : isStudyScene
          ? 'What is the login page for?'
          : 'What is the purpose or context?',
      isAlreadyComplete: false,
      addedWords: [],
      hintL1:
        subStep === 1
          ? 'Name the specific object, task, or place.'
          : 'Add the purpose, project, or time.',
      hintL2:
        subStep === 1
          ? isStudyScene
            ? "Start with: I'm building..."
            : 'Try adding: ...with / at...'
          : isStudyScene
          ? 'Add: ...for my university project.'
          : 'Add: ...because / before...',
      hintL3:
        subStep === 1
          ? isStudyScene
            ? "Example: I'm building a login page."
            : "Example: I'm drinking hot coffee at my desk."
          : isStudyScene
          ? "Example: I'm building a login page for my university project."
          : "Example: I'm drinking hot coffee before my morning class.",
      vietnameseRescue:
        subStep === 1
          ? 'Gợi ý: Câu này lặp lại ý cũ — hãy nói rõ bạn đang làm tính năng hoặc việc cụ thể gì.'
          : 'Gợi ý: Hãy thêm mục đích, thời gian hoặc ngữ cảnh cho câu vừa rồi.',
    };
  }

  const isOffTopic = /\b(elephant|spaceship|dinosaur|recipe for soup|alien)\b/.test(normNew);
  if (isOffTopic) {
    return {
      outcome: 'OFF_TOPIC',
      isValid: false,
      feedback: `Let's keep your thought connected to ${sceneContext.toLowerCase()}.`,
      synthesizedThought: previousThought,
      nextPrompt: 'What is one real thing happening in this scene?',
      isAlreadyComplete: false,
      addedWords: [],
      hintL1: 'Look at the objects around you and connect one to your action.',
      hintL2: "Start with: Right now, I'm...",
      hintL3: isStudyScene
        ? "Example: I'm building a login page on my laptop."
        : "Example: I'm focusing on my task here.",
      vietnameseRescue: 'Gợi ý: Hãy giữ câu nói gắn với khung cảnh thực tế trước mắt bạn.',
    };
  }

  // Fast-forward if learner already gave a complete rich thought
  if (isThoughtAlreadyComplete(newAttempt)) {
    return {
      outcome: 'VALID_EXPANSION',
      isValid: true,
      feedback:
        'Excellent! Your sentence already combines action, concrete detail, and context.',
      synthesizedThought: newAttempt.trim(),
      nextPrompt: 'Ready to develop your idea deeper.',
      isAlreadyComplete: true,
      addedWords,
      hintL1: 'Your sentence is rich and complete.',
      hintL2: 'Ready for Method 2: Develop Your Idea.',
      hintL3: newAttempt.trim(),
      vietnameseRescue: 'Câu của bạn đã đủ ý mở rộng, sẵn sàng chuyển sang bước phát triển ý.',
    };
  }

  if (subStep === 1) {
    return {
      outcome: 'VALID_EXPANSION',
      isValid: true,
      feedback: `Nice expansion! You added new detail (${addedWords.slice(0, 3).join(', ')}).`,
      synthesizedThought: newAttempt.trim(),
      nextPrompt: isStudyScene
        ? "What's this feature or task for?"
        : 'Add one more context detail (for what, when, or where).',
      isAlreadyComplete: false,
      addedWords,
      hintL1: 'Add who it is for, which project/event it belongs to, or when.',
      hintL2: isStudyScene
        ? 'Add: ...for my university project.'
        : 'Add: ...before / for my...',
      hintL3: isStudyScene
        ? "Example: I'm building a login page for my university project."
        : `${newAttempt.trim().replace(/\.$/, '')} before my morning schedule.`,
      vietnameseRescue: 'Gợi ý: Bổ sung thêm mục đích, dự án hoặc thời điểm thực hiện.',
    };
  }

  return {
    outcome: 'VALID_EXPANSION',
    isValid: true,
    feedback: 'Great growth! You turned a short phrase into a grounded English sentence.',
    synthesizedThought: newAttempt.trim(),
    nextPrompt: 'Ready to connect reasons and methods.',
    isAlreadyComplete: true,
    addedWords,
    hintL1: 'Sentence expansion complete.',
    hintL2: 'Move on to Develop Your Idea.',
    hintL3: newAttempt.trim(),
    vietnameseRescue: 'Bạn đã hoàn thành bước mở rộng câu.',
  };
}

export interface IdeaEvaluationResult {
  outcome: IdeaValidationOutcome;
  isValid: boolean;
  feedback: string;
  nextPrompt?: string;
  hintL1: string;
  hintL2: string;
  hintL3: string;
  vietnameseRescue: string;
}

/**
 * Generalized evaluation for Method 02: 5W1H (Why / How) & Idea-Reason-Example (Reason / Example).
 */
export function evaluateIdeaDevelopmentAttempt(
  questionKey: IdeaQuestionKey,
  attempt: string,
  priorTurnAnswer = '',
  sceneContext = 'University Study Workspace'
): IdeaEvaluationResult {
  const normAttempt = normalizeText(attempt);
  const normPrior = normalizeText(priorTurnAnswer);
  const words = normAttempt.split(/\s+/).filter(Boolean);
  const isStudyScene = /study|workspace|coding|laptop/i.test(sceneContext);

  if (!normAttempt || words.length < 3) {
    return {
      outcome: 'UNCLEAR',
      isValid: false,
      feedback: `Share one complete sentence answering "${questionKey}".`,
      hintL1:
        questionKey === 'Why' || questionKey === 'Reason'
          ? 'Explain the purpose, benefit, or motivation.'
          : questionKey === 'How'
          ? 'Describe the tools, steps, or way you do it.'
          : 'Give one concrete moment or real-life instance.',
      hintL2:
        questionKey === 'Why' || questionKey === 'Reason'
          ? 'Start with: Because... / People need to...'
          : questionKey === 'How'
          ? "Start with: I'm using... / First, I..."
          : 'Start with: For example, yesterday...',
      hintL3:
        questionKey === 'Why'
          ? GOLDEN_DEMO_PATH.stepC_why
          : questionKey === 'How'
          ? GOLDEN_DEMO_PATH.stepC_how
          : questionKey === 'Reason'
          ? 'Because working in a quiet spot helps me focus deeply.'
          : 'For example, yesterday I finished two chapters in an hour.',
      vietnameseRescue:
        questionKey === 'Why' || questionKey === 'Reason'
          ? 'Gợi ý: Nêu lý do hoặc mục đích quan trọng nhất.'
          : questionKey === 'How'
          ? 'Gợi ý: Nói về công cụ, phương pháp hoặc các bước bạn thực hiện.'
          : 'Gợi ý: Kể một tình huống hoặc ví dụ thực tế ngắn gọn.',
    };
  }

  // Guardrail against repeating Turn 1 answer in Turn 2 (Why -> How or Reason -> Example)
  if (
    (questionKey === 'How' || questionKey === 'Example') &&
    normPrior &&
    (normAttempt === normPrior ||
      computeTokenSimilarity(attempt, priorTurnAnswer) >= 0.72 ||
      (normPrior.length > 12 && normAttempt.includes(normPrior.slice(0, 16))))
  ) {
    if (questionKey === 'How') {
      return {
        outcome: 'REPEATED_WHY_AS_HOW',
        isValid: false,
        feedback:
          'That repeats why it matters. Now explain HOW you do or build it (tools, steps, or method).',
        hintL1: isStudyScene
          ? 'Name the framework, library, or technical step.'
          : 'Describe your practical process, tool, or routine.',
        hintL2: isStudyScene
          ? "Start with: I'm using React with..."
          : 'Start with: I do this by... / I use...',
        hintL3: isStudyScene
          ? GOLDEN_DEMO_PATH.stepC_how
          : 'I prepare a short checklist and focus for thirty minutes.',
        vietnameseRescue:
          'Gợi ý: Câu vừa rồi nêu lý do (Why); bây giờ hãy nói BẰNG CÁCH NÀO (How) bạn thực hiện.',
      };
    }

    return {
      outcome: 'REPEATED_REASON_AS_EXAMPLE',
      isValid: false,
      feedback:
        'That repeats your general reason. Give a concrete real-life example (when, where, or what happened).',
      hintL1: 'Share a specific moment such as yesterday, this morning, or last week.',
      hintL2: 'Start with: For example, yesterday I...',
      hintL3: 'For example, yesterday I finished my reading two hours earlier.',
      vietnameseRescue:
        'Gợi ý: Đừng lặp lại lý do chung — hãy đưa ra một ví dụ thực tế cụ thể (ví dụ: hôm qua, sáng nay...).',
    };
  }

  if (questionKey === 'Point') {
    return {
      outcome: 'VALID_POINT',
      isValid: true,
      feedback: 'Clear opening point! Now share the main reason behind your view.',
      nextPrompt: 'Why do you think or prefer this?',
      hintL1: 'Share the main reason or benefit behind your point.',
      hintL2: 'Start with: Because... / The main reason is...',
      hintL3: 'Because securing student accounts early keeps the rest of the app safe.',
      vietnameseRescue: 'Gợi ý: Tiếp theo hãy giải thích lý do (Reason) cho quan điểm vừa nêu.',
    };
  }

  if (questionKey === 'Why' || questionKey === 'Reason') {
    const hasCausalOrPurpose =
      /\b(because|since|so that|need|needs|want|wants|help|helps|allow|allows|secure|securely|protect|sign in|access|energy|awake|focus|concentrate|avoid|prevent|important|keep|save|improve|prepare)\b/.test(
        normAttempt
      );

    if (!hasCausalOrPurpose && words.length < 5) {
      return {
        outcome: 'INVALID_INTENT',
        isValid: false,
        feedback:
          'Clarify the purpose or reason — who benefits, or why does this matter to you?',
        hintL1: 'State the benefit, goal, or problem it solves.',
        hintL2: 'Start with: Because... / It helps me...',
        hintL3: isStudyScene
          ? GOLDEN_DEMO_PATH.stepC_why
          : 'Because it helps me stay energized and focused.',
        vietnameseRescue: 'Gợi ý: Hãy giải thích rõ lợi ích hoặc lý do tại sao việc này cần thiết.',
      };
    }

    return {
      outcome: questionKey === 'Why' ? 'VALID_WHY' : 'VALID_REASON',
      isValid: true,
      feedback:
        questionKey === 'Why'
          ? 'Clear purpose! Now let’s explain how you do or build it.'
          : 'Strong reason! Now back it up with a concrete example.',
      nextPrompt:
        questionKey === 'Why'
          ? 'How are you doing or building it?'
          : 'Can you give a quick real-life example?',
      hintL1:
        questionKey === 'Why'
          ? 'Describe your tools, method, or step-by-step approach.'
          : 'Mention a specific time or situation.',
      hintL2:
        questionKey === 'Why' ? "Start with: I'm using..." : 'Start with: For example...',
      hintL3:
        questionKey === 'Why'
          ? GOLDEN_DEMO_PATH.stepC_how
          : 'For example, this morning I finished my outline in twenty minutes.',
      vietnameseRescue:
        questionKey === 'Why'
          ? 'Gợi ý: Tiếp theo hãy nói về công cụ hoặc cách thực hiện.'
          : 'Gợi ý: Tiếp theo hãy nêu một ví dụ thực tế.',
    };
  }

  if (questionKey === 'How') {
    const hasProcessOrMethod =
      /\b(use|using|with|by|through|connect|connecting|build|building|write|writing|brew|cook|boil|chop|review|check|checking|plan|organize|react|api|authentication|component|notebook|timer|checklist|first|then)\b/.test(
        normAttempt
      );

    if (!hasProcessOrMethod && words.length < 5) {
      return {
        outcome: 'INVALID_INTENT',
        isValid: false,
        feedback: 'Describe how you do it — mention a tool, ingredient, step, or method.',
        hintL1: 'Mention what tool you use or what step comes first.',
        hintL2: "Start with: I'm using... / First, I...",
        hintL3: isStudyScene
          ? GOLDEN_DEMO_PATH.stepC_how
          : 'I use a notebook checklist and tackle the hardest task first.',
        vietnameseRescue: 'Gợi ý: Hãy nêu công cụ sử dụng hoặc bước thực hiện cụ thể.',
      };
    }

    return {
      outcome: 'VALID_HOW',
      isValid: true,
      feedback: 'Solid method! You connected your purpose with how it works in practice.',
      hintL1: 'Both Why and How are connected.',
      hintL2: 'Ready for Guided Self-Talk.',
      hintL3: attempt.trim(),
      vietnameseRescue: 'Bạn đã kết nối tốt cả lý do (Why) và cách làm (How).',
    };
  }

  // Example validation
  const hasConcreteExample =
    /\b(for example|for instance|such as|yesterday|today|this morning|last week|when i|once|recently|one time)\b/.test(
      normAttempt
    ) || words.length >= 6;

  if (!hasConcreteExample) {
    return {
      outcome: 'INVALID_INTENT',
      isValid: false,
      feedback: 'Make your example concrete — mention a real moment like yesterday or this morning.',
      hintL1: 'Anchor your example in a real time or place.',
      hintL2: 'Start with: For example, yesterday...',
      hintL3: 'For example, yesterday I finished three chapters without checking my phone.',
      vietnameseRescue: 'Gợi ý: Hãy bắt đầu bằng "For example..." kèm thời điểm cụ thể.',
    };
  }

  return {
    outcome: 'VALID_EXAMPLE',
    isValid: true,
    feedback: 'Vivid example! Your idea now has both a clear reason and real-world proof.',
    hintL1: 'Reason and Example complete.',
    hintL2: 'Ready for Guided Self-Talk.',
    hintL3: attempt.trim(),
    vietnameseRescue: 'Bạn đã phát triển trọn vẹn Ý chính – Lý do – Ví dụ.',
  };
}

export function evaluateWhyAttempt(
  attempt: string,
  sceneContext = 'University Study Workspace'
): IdeaEvaluationResult {
  return evaluateIdeaDevelopmentAttempt('Why', attempt, '', sceneContext);
}

export function evaluateHowAttempt(
  attempt: string,
  priorWhyAnswer = '',
  sceneContext = 'University Study Workspace'
): IdeaEvaluationResult {
  return evaluateIdeaDevelopmentAttempt('How', attempt, priorWhyAnswer, sceneContext);
}

/**
 * Evaluates Method 03: Guided Self-Talk monologue (Notice -> Question -> Consider -> Decide).
 */
export function evaluateSelfTalkMonologue(transcript: string): {
  isValid: boolean;
  feedback: string;
  connectorsFound: string[];
} {
  const norm = normalizeText(transcript);
  const words = norm.split(/\s+/).filter(Boolean);

  if (words.length < 9) {
    return {
      isValid: false,
      feedback:
        'Try thinking out loud for at least two connected sentences: what is happening and what you will do next.',
      connectorsFound: [],
    };
  }

  const connectorPatterns: { label: string; regex: RegExp }[] = [
    { label: 'observation', regex: /\b(working on|is not working|right now|need|have|trying to)\b/ },
    { label: 'hypothesis', regex: /\b(maybe|might|probably|i think|perhaps|expired|problem)\b/ },
    { label: 'decision', regex: /\b(i should|i will|first|next|let me|check|review|start)\b/ },
    { label: 'causal link', regex: /\b(because|so|therefore|before|after)\b/ },
  ];

  const found = connectorPatterns
    .filter((item) => item.regex.test(norm))
    .map((item) => item.label);

  return {
    isValid: true,
    feedback:
      'Natural English self-talk! You observed the situation, reasoned through it, and chose your next move.',
    connectorsFound: found.length >= 2 ? found : [...found, 'connected flow'],
  };
}

/**
 * Evaluates Method 04: Independent Recall (Repeat Without Help).
 * Supports dynamic semantic comparison against learner's own earlier thoughts in ANY scene,
 * plus rich milestone detection for the DevFest Study Workspace path.
 */
export function evaluateIndependentRecall(
  transcript: string,
  hintsUsed: boolean,
  referenceUtterances: string[] = []
): {
  isValid: boolean;
  coverageScore: number;
  ideasIdentified: string[];
  strength: string;
  improvement: string;
} {
  const norm = normalizeText(transcript);
  const words = norm.split(/\s+/).filter(Boolean);

  if (words.length < 5) {
    return {
      isValid: false,
      coverageScore: 0.15,
      ideasIdentified: [],
      strength: 'You started speaking without visual prompts.',
      improvement:
        'Try connecting at least two ideas: what you are doing, why it matters, and your next step.',
    };
  }

  const ideas: string[] = [];

  // Dynamic reference matching for arbitrary real-world camera scenes
  const nonEmptyRefs = referenceUtterances.map((r) => r.trim()).filter(Boolean);
  if (nonEmptyRefs.length >= 2) {
    const recallWords = extractContentWords(transcript);
    const refLabels = [
      'Core Activity & Context',
      'Purpose & Reasoning',
      'Method / Supporting Detail',
      'Next Step & Self-Direction',
    ];

    nonEmptyRefs.slice(0, 4).forEach((refText, idx) => {
      const refTokens = [...extractContentWords(refText)];
      if (refTokens.length === 0) return;
      const matched = refTokens.filter((tok) => recallWords.has(tok));
      if (matched.length >= 1 && matched.length / refTokens.length >= 0.25) {
        const label = refLabels[idx] || `Idea Unit ${idx + 1}`;
        if (!ideas.includes(label)) ideas.push(label);
      }
    });
  }

  // Semantic dimension checks (enriching labels when speaking in fresh words/synonyms)
  if (
    ideas.length === 0 ||
    /\b(login|page|project|build|work|develop|coffee|brew|cook|pasta|plan|study|assignment|schedule)\w*\b/.test(
      norm
    )
  ) {
    if (!ideas.includes('Core Activity & Context') && !ideas.includes('Project & Feature Goal')) {
      ideas.push(
        /\b(login|project|react|api)\b/.test(norm)
          ? 'Project & Feature Goal'
          : 'Core Activity & Context'
      );
    }
  }

  if (
    /\b(secure\w*|sign in|because|so that|need\w*|help\w*|energy|family|overwhelm\w*|reason)\b/.test(
      norm
    ) &&
    !ideas.includes('Purpose & Reasoning')
  ) {
    ideas.push('Purpose & Reasoning');
  }

  if (
    /\b(problem\w*|fail\w*|error\w*|issue\w*|token|expired|authenticat\w*|is not working|busy|hardest)\b/.test(
      norm
    ) &&
    !ideas.includes('Problem & Cause')
  ) {
    ideas.push('Problem & Cause');
  }

  if (
    /\b(will|should|going to|check\w*|inspect\w*|test\w*|first|next|review\w*|boil\w*|start\w*)\b/.test(
      norm
    ) &&
    !ideas.includes('Next Immediate Step') &&
    !ideas.includes('Next Step & Self-Direction')
  ) {
    ideas.push('Next Immediate Step');
  }

  const cappedIdeas = ideas.slice(0, 4);
  const coverageScore = Number(
    Math.min(1, Math.max(0.34, cappedIdeas.length / 3)).toFixed(2)
  );

  const independenceNote = hintsUsed
    ? 'with a brief recall cue'
    : 'completely on your own without hints or image labels';

  const strength =
    cappedIdeas.length >= 3
      ? `You synthesized ${cappedIdeas.length} connected ideas ${independenceNote}.`
      : `You expressed your main idea ${independenceNote}.`;

  const improvement = !cappedIdeas.some((i) => i.includes('Next'))
    ? "Wrap up with a clear forward action using 'So first, I'll...' or 'Next, I should...'."
    : "Try linking cause and action smoothly with 'Since...' or 'As soon as...'.";

  return {
    isValid: cappedIdeas.length >= 2 || words.length >= 12,
    coverageScore,
    ideasIdentified: cappedIdeas,
    strength,
    improvement,
  };
}

/**
 * Computes all 6 Observable MVP Success Metrics (Project Overview Section 9).
 */
export interface ComputeMetricsInput {
  initialThought: string;
  acceptedExpansions: string[];
  expansionTotalAttempts: number;
  whyAnswer?: string;
  howAnswer?: string;
  selfTalkTranscript?: string;
  independentRecallTranscript: string;
  recallIdeasIdentified: string[];
  hintEvents: HintEvent[];
  attempts: Array<{
    source: InputMode;
    durationSeconds?: number;
    isValid: boolean;
  }>;
  selfTalkDurationSeconds: number;
  recallDurationSeconds: number;
  stagesCompleted: number;
}

export function computeSessionMetrics(input: ComputeMetricsInput): SessionMetrics {
  const rootWords = extractContentWords(input.initialThought);
  const finalExpansion =
    input.acceptedExpansions[input.acceptedExpansions.length - 1] || input.initialThought;
  const expandedWords = extractContentWords(finalExpansion);
  const addedDetailsCount = [...expandedWords].filter((w) => !rootWords.has(w)).length;

  const acceptedExpansionSteps = Math.max(1, input.acceptedExpansions.length - 1);
  const totalExpAttempts = Math.max(acceptedExpansionSteps, input.expansionTotalAttempts);
  const ratePercent = Math.min(
    100,
    Math.round((acceptedExpansionSteps / totalExpAttempts) * 100)
  );

  // Count distinct meaningful idea units across the journey
  const allUtterances = [
    input.initialThought,
    ...input.acceptedExpansions.slice(1),
    input.whyAnswer || '',
    input.howAnswer || '',
    input.selfTalkTranscript || '',
  ].filter((u) => extractContentWords(u).size >= 2);

  const seenTokens = new Set<string>();
  let meaningfulIdeaUnits = 0;
  for (const utt of allUtterances) {
    const tokens = [...extractContentWords(utt)];
    const novel = tokens.filter((t) => !seenTokens.has(t));
    if (novel.length >= 1) {
      meaningfulIdeaUnits += 1;
      novel.forEach((t) => seenTokens.add(t));
    }
  }
  // Self-talk often carries 2+ clauses (problem + next move)
  if ((input.selfTalkTranscript || '').split(/[.!?]+/).filter((s) => s.trim().length > 8).length >= 2) {
    meaningfulIdeaUnits += 1;
  }

  const totalHintsUsed = input.hintEvents.length;
  const maxHintLevel = input.hintEvents.reduce<0 | 1 | 2 | 3>(
    (max, e) => (e.hintLevel > max ? e.hintLevel : max),
    0
  );
  const vietnameseRescueUsed = input.hintEvents.some((e) => e.isVietnameseRescue);
  const recallHintUsed = input.hintEvents.some((e) => e.stageKey === 'INDEPENDENT_RECALL');

  const dependencyLabel: SessionMetrics['hintUsage']['dependencyLabel'] =
    totalHintsUsed === 0
      ? 'Independent'
      : totalHintsUsed <= 2 && maxHintLevel <= 2
      ? 'Light support'
      : 'Guided support';

  const spokenTurnsCount = input.attempts.filter(
    (a) => a.source === 'microphone' || a.source === 'demo_sample'
  ).length;
  const typedTurnsCount = input.attempts.filter((a) => a.source === 'typing').length;

  const summedAttemptSeconds = input.attempts.reduce(
    (sum, a) => sum + (a.durationSeconds || 0),
    0
  );
  const totalSpeakingSeconds = Math.max(
    summedAttemptSeconds,
    input.selfTalkDurationSeconds + input.recallDurationSeconds
  );

  const initialWordCount = input.initialThought.trim().split(/\s+/).filter(Boolean).length;
  const recallWordCount = input.independentRecallTranscript
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const targetUnits = 3;
  const recalledUnits = Math.min(
    targetUnits,
    Math.max(1, input.recallIdeasIdentified.length)
  );
  const coveragePercent = Math.min(100, Math.round((recalledUnits / targetUnits) * 100));

  const clampedStages = Math.min(4, Math.max(1, input.stagesCompleted));

  return {
    meaningfulIdeaUnits: Math.max(3, meaningfulIdeaUnits),
    expansionSuccess: {
      acceptedSteps: acceptedExpansionSteps,
      totalAttempts: totalExpAttempts,
      addedDetailsCount: Math.max(2, addedDetailsCount),
      ratePercent,
    },
    hintUsage: {
      totalHintsUsed,
      maxHintLevel,
      vietnameseRescueUsed,
      recallHintUsed,
      dependencyLabel,
    },
    speechContinuity: {
      totalSpeakingSeconds,
      selfTalkSeconds: input.selfTalkDurationSeconds,
      recallSeconds: input.recallDurationSeconds,
      recallWordCount,
      initialWordCount,
      spokenTurnsCount,
      typedTurnsCount,
    },
    independentRecall: {
      recalledUnits,
      targetUnits,
      coveragePercent,
      ideasIdentified: input.recallIdeasIdentified,
      usedWithoutHints: !recallHintUsed,
    },
    sessionCompletion: {
      stagesCompleted: clampedStages,
      totalStages: 4,
      completedCoreJourney: clampedStages === 4,
    },
  };
}

/**
 * Exact Golden Happy Path matching DevFest 2026 Project Overview Section 4!
 */
export const GOLDEN_DEMO_PATH = {
  stepA_root: "I'm coding.",
  stepB_expansion1: "I'm building a login page.",
  stepB_expansion2: "I'm building a login page for my university project.",
  stepC_why: 'Students need to sign in securely.',
  stepC_how: "I'm using React with an authentication API.",
  stepD_selfTalk:
    "Something isn't working with authentication. Maybe the token has expired. I should check the API response first.",
  stepE_recall:
    "I'm building a login page for my university project so students can sign in securely using React and an authentication API. Something isn't working with authentication, maybe because the token has expired, so I'll check the API response first.",
};

export const determineIdeaFramework = determineFramework;

export function generateFrameworkQuestions(
  _thought: string,
  framework: FrameworkType
) {
  if (framework === 'IDEA_REASON_EXAMPLE') {
    return [
      {
        questionKey: 'Reason' as IdeaQuestionKey,
        question: 'Why do you think or prefer this?',
        prompt: 'Why do you think or prefer this?',
        subtext: 'Share the main reason behind your idea.',
        hintL1: 'Explain the benefit or belief behind your choice.',
        hintL2: 'Start with: Because it helps me...',
        hintL3: 'Because working in a quiet space helps me concentrate without distractions.',
        vietnameseRescue: 'Gợi ý: Nêu lý do chính khiến bạn nghĩ hoặc lựa chọn như vậy.',
        sampleResponse:
          'Because working in a quiet space helps me concentrate without distractions.',
        sample:
          'Because working in a quiet space helps me concentrate without distractions.',
      },
      {
        questionKey: 'Example' as IdeaQuestionKey,
        question: 'Can you give a concrete example?',
        prompt: 'Can you give a concrete example?',
        subtext: 'Anchor your idea in a real moment or experience.',
        hintL1: 'Mention a recent time this worked well for you.',
        hintL2: 'Start with: For example, yesterday...',
        hintL3: 'For example, yesterday I finished my coding module two hours early.',
        vietnameseRescue: 'Gợi ý: Kể một ví dụ cụ thể (hôm qua, sáng nay, tuần trước...).',
        sampleResponse:
          'For example, yesterday I finished my coding module two hours early.',
        sample: 'For example, yesterday I finished my coding module two hours early.',
      },
    ];
  }

  return [
    {
      questionKey: 'Why' as IdeaQuestionKey,
      question: 'Why is this important or needed?',
      prompt: 'Why is this important or needed?',
      subtext: 'Add the purpose, user need, or motivation.',
      hintL1: 'State who needs this or what problem it solves.',
      hintL2: 'Start with: Students need to... / Because...',
      hintL3: GOLDEN_DEMO_PATH.stepC_why,
      vietnameseRescue: 'Gợi ý: Giải thích lý do hoặc mục đích của việc bạn đang làm.',
      sampleResponse: GOLDEN_DEMO_PATH.stepC_why,
      sample: GOLDEN_DEMO_PATH.stepC_why,
    },
    {
      questionKey: 'How' as IdeaQuestionKey,
      question: 'How are you building or doing it?',
      prompt: 'How are you building or doing it?',
      subtext: 'Describe your tools, method, or practical approach.',
      hintL1: 'Mention the tools, framework, or key steps.',
      hintL2: "Start with: I'm using...",
      hintL3: GOLDEN_DEMO_PATH.stepC_how,
      vietnameseRescue: 'Gợi ý: Nêu công cụ hoặc cách thức bạn đang thực hiện.',
      sampleResponse: GOLDEN_DEMO_PATH.stepC_how,
      sample: GOLDEN_DEMO_PATH.stepC_how,
    },
  ];
}

export function analyzeExpansionStep(
  latestTranscript: string,
  stepNumber: number,
  previousSentences: string[] = [],
  sceneContext = 'University Study Workspace'
) {
  const prevThought = previousSentences[previousSentences.length - 1] || '';
  const result = evaluateExpansionAttempt(
    prevThought,
    latestTranscript,
    stepNumber,
    sceneContext
  );
  return {
    isUnderstandable: result.outcome !== 'UNCLEAR',
    isAlreadyComplete: result.isAlreadyComplete,
    isRelevant: result.outcome !== 'OFF_TOPIC',
    isValid: result.isValid,
    outcome: result.outcome,
    addedWords: result.addedWords,
    feedback: result.feedback,
    synthesizedThought: result.synthesizedThought,
    nextPrompt: result.nextPrompt,
    hintL1: result.hintL1,
    hintL2: result.hintL2,
    hintL3: result.hintL3,
    vietnameseRescue: result.vietnameseRescue,
    detectedTopic: sceneContext.toLowerCase(),
    suggestedFramework: determineFramework(result.synthesizedThought),
  };
}

/**
 * Extracts 5 semantic Thought-Chain pillars (Action -> Context -> Purpose -> Problem -> Decision)
 * from a learner's live utterance or thought journey so the UI can visualize semantic growth
 * instead of grammar redlines.
 */
export function extractThoughtChainNodes(
  utterancesOrText: string | string[]
): {
  nodes: ThoughtChainNode[];
  completedCount: number;
  missingPrompt?: string;
} {
  const combined = Array.isArray(utterancesOrText)
    ? utterancesOrText.filter(Boolean).join(' ')
    : utterancesOrText || '';
  const norm = normalizeText(combined);

  const matchFirst = (patterns: RegExp[]): string | undefined => {
    for (const regex of patterns) {
      const m = norm.match(regex);
      if (m && m[0]) return m[0].trim();
    }
    return undefined;
  };

  const actionMatch = matchFirst([
    /\b(building a [\w\s]{2,18}|coding|having coffee|drinking coffee|planning my [\w]+|organizing my [\w]+|preparing [\w\s]{2,14}|reviewing [\w\s]{2,14}|working on [\w\s]{2,16}|studying [\w\s]{0,12})/,
    /\b(\w+ing [\w]+)\b/,
  ]);

  const contextMatch = matchFirst([
    /\b(university project|morning class|this week|team presentation|study desk|at my desk|kitchen table|campus|today|before [\w]+\s?[\w]*)/,
    /\b(login page|react|authentication api|slides|schedule|assignments)\b/,
  ]);

  const purposeMatch = matchFirst([
    /\b(sign in securely|students can [\w\s]{2,16}|students need [\w\s]{2,16}|because [\w\s]{3,22}|so that [\w\s]{3,20}|prevent[\w]* [\w\s]{2,16}|stay focused|for energy|two lectures)/,
  ]);

  const problemMatch = matchFirst([
    /\b(is not working|token has expired|token expired|traffic [\w\s]{2,14}|overwhelmed|running late|failing|hardest [\w]+|issue|bug|challenge|might be [\w\s]{2,12})/,
  ]);

  const decisionMatch = matchFirst([
    /\b(check the api[\w\s]{0,10}|i will [\w\s]{2,18}|i should [\w\s]{2,18}|first i will [\w\s]{2,16}|leave [\w\s]{2,14}|review my slides|silence notifications|finish the hardest)/,
  ]);

  const nodes: ThoughtChainNode[] = [
    {
      id: 'action',
      label: 'Action',
      isComplete: Boolean(actionMatch),
      matchedSnippet: actionMatch,
    },
    {
      id: 'context',
      label: 'Context',
      isComplete: Boolean(contextMatch),
      matchedSnippet: contextMatch,
    },
    {
      id: 'purpose',
      label: 'Purpose',
      isComplete: Boolean(purposeMatch),
      matchedSnippet: purposeMatch,
    },
    {
      id: 'problem',
      label: 'Challenge',
      isComplete: Boolean(problemMatch),
      matchedSnippet: problemMatch,
    },
    {
      id: 'decision',
      label: 'Next step',
      isComplete: Boolean(decisionMatch),
      matchedSnippet: decisionMatch,
    },
  ];

  const completedCount = nodes.filter((n) => n.isComplete).length;

  const missingPrompts: Record<ThoughtChainNode['id'], string> = {
    action: 'What concrete activity are you doing right now?',
    context: 'Where is this happening, or what project/situation is it part of?',
    purpose: 'Why does this matter, or who needs it?',
    problem: 'What obstacle, bug, or risk do you notice right now?',
    decision: 'What concrete action will you check or do first?',
  };

  const firstMissing = nodes.find((n) => !n.isComplete);

  return {
    nodes,
    completedCount,
    missingPrompt: firstMissing ? missingPrompts[firstMissing.id] : undefined,
  };
}

/**
 * Deterministic Concept Bridge for Vietnamese Stuck-Moments ("Translation Dependence" breaker).
 * Strictly returns a 2-5 word English concept chunk + visual anchor + self-expression frame,
 * NEVER translating a full sentence for the learner.
 */
export function resolveConceptBridgeFallback(
  vietnameseIdea: string,
  sceneContext = 'University Study Workspace'
): ConceptBridgeResult {
  const cleanVi = (vietnameseIdea || '').trim() || 'token hết hạn';
  const lower = cleanVi.toLowerCase();

  const dictionary: Array<{
    match: RegExp;
    englishChunk: string;
    contextAnchor: string;
    selfBuildPrompt: string;
  }> = [
    {
      match: /hết hạn|token|phiên đăng nhập/,
      englishChunk: 'token has expired',
      contextAnchor: 'Connects to the failed auth request on your code screen.',
      selfBuildPrompt:
        'Build your own sentence: "Maybe the ___ , so I should..."',
    },
    {
      match: /bảo mật|an toàn|đăng nhập/,
      englishChunk: 'sign in securely',
      contextAnchor: 'Explains why students need your login form.',
      selfBuildPrompt:
        'Connect the purpose yourself: "Students need to ___ before..."',
    },
    {
      match: /phản hồi|kiểm tra|api|lỗi/,
      englishChunk: 'check the API response',
      contextAnchor: 'Points to your immediate debugging action.',
      selfBuildPrompt:
        'State your decision aloud: "First, I will ___ to see why..."',
    },
    {
      match: /kẹt xe|tắc đường|trễ|muộn/,
      englishChunk: 'get stuck in morning traffic',
      contextAnchor: 'Links your coffee prep to leaving for campus on time.',
      selfBuildPrompt:
        'Reason aloud in English: "Traffic might be heavy, so before I ___..."',
    },
    {
      match: /quá tải|nhiều bài|áp lực|deadline/,
      englishChunk: 'feel overwhelmed by deadlines',
      contextAnchor: 'Connects to the written checklist on your study planner.',
      selfBuildPrompt:
        'Express the reason in your words: "Writing a plan helps me not ___."',
    },
    {
      match: /thuyết trình|slide|nhóm/,
      englishChunk: 'review my presentation slides',
      contextAnchor: 'Grounds your preparation step before meeting teammates.',
      selfBuildPrompt:
        'Say what you will do next: "While finishing coffee, I will ___."',
    },
    {
      match: /thông báo|mất tập trung|im lặng/,
      englishChunk: 'silence notifications',
      contextAnchor: 'Protects a deep-focus block on your study schedule.',
      selfBuildPrompt:
        'Commit to your next move: "First, I should ___ so I can..."',
    },
    {
      match: /việc khó|ưu tiên|quan trọng/,
      englishChunk: 'start with the hardest task',
      contextAnchor: 'Matches your sharpest morning concentration window.',
      selfBuildPrompt:
        'Explain your strategy: "I will ___ while my mind is fresh."',
    },
  ];

  for (const entry of dictionary) {
    if (entry.match.test(lower)) {
      return {
        vietnameseIdea: cleanVi,
        englishChunk: entry.englishChunk,
        contextAnchor: entry.contextAnchor,
        selfBuildPrompt: entry.selfBuildPrompt,
      };
    }
  }

  return {
    vietnameseIdea: cleanVi,
    englishChunk: 'focus on the key issue',
    contextAnchor: `Anchored directly to ${sceneContext} without full-sentence translation.`,
    selfBuildPrompt:
      'Turn this concept into your own thought: "Right now I need to ___ because..."',
  };
}

/**
 * Evaluates the 30-second Unseen Scene Transfer Challenge (Zero Step 1-3 Scaffolding).
 * Verifies whether the learner transfers the 4-pillar English thinking structure to a new topic.
 */
export function evaluateTransferAttempt(
  transcript: string,
  sceneTitle = 'Morning Presentation Prep'
): TransferEvaluationResult {
  const { nodes, missingPrompt } = extractThoughtChainNodes(transcript);
  const words = normalizeText(transcript).split(/\s+/).filter(Boolean);

  // Consolidate into 4 core transfer pillars:
  // 1) Action/Context, 2) Purpose, 3) Challenge/Observation, 4) Next Step
  const actionContextDone =
    Boolean(nodes[0]?.isComplete || nodes[1]?.isComplete) || words.length >= 6;
  const purposeDone = Boolean(nodes[2]?.isComplete);
  const problemDone = Boolean(nodes[3]?.isComplete);
  const decisionDone = Boolean(nodes[4]?.isComplete);

  const pillarsTransferred = [
    actionContextDone,
    purposeDone,
    problemDone,
    decisionDone,
  ].filter(Boolean).length;

  const isValid = words.length >= 10 && pillarsTransferred >= 2;
  const isTransferVerified = words.length >= 14 && pillarsTransferred >= 3;

  const expressions: string[] = [];
  for (const n of nodes) {
    if (n.matchedSnippet && expressions.length < 3) {
      expressions.push(n.matchedSnippet);
    }
  }

  const feedback = isTransferVerified
    ? `Transfer verified on "${sceneTitle}"! You built ${pillarsTransferred}/4 English thought links on an unseen scene with zero Step 1–3 prompts.`
    : isValid
      ? `Good start (${pillarsTransferred}/4 links on "${sceneTitle}"). Add one missing link below to verify full unassisted transfer.`
      : 'Speak at least two connected English sentences covering what is happening, why it matters, and your next move.';

  return {
    isValid,
    isTransferVerified,
    pillarsTransferred,
    totalPillars: 4,
    nodes,
    feedback,
    missingPillarPrompt: missingPrompt,
    independentExpressionsUsed:
      expressions.length > 0 ? expressions : ['unassisted transfer'],
  };
}

/**
 * SLA Recast Engine ("Natural Rephrase"):
 * Preserves 100% of the learner's own idea while surfacing one slightly more natural,
 * idiomatic B1–B2 spoken phrasing — catching classic Vietnamese-to-English habits
 * (e.g., "because ... so ...", "for not ...", or choppy unlinked clauses).
 */
export function buildNaturalUpgrade(params: {
  initialThought?: string;
  expandedThought?: string;
  selfTalkMonologue?: string;
  independentRecall: string;
  sceneTitle?: string;
}): NaturalPhrasingUpgrade {
  const rawRecall = (
    params.independentRecall ||
    params.selfTalkMonologue ||
    params.expandedThought ||
    params.initialThought ||
    ''
  ).trim();

  const sentences = rawRecall
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // 1. Classic Vietnamese L1 transfer: "Because ... so ..." ("Vì ... nên ...")
  const becauseSoMatch = rawRecall.match(
    /\bbecause\s+([^,.!?]+?)[,\s]+so\s+([^.!?]+[.!?]?)/i
  );
  if (becauseSoMatch) {
    const causeClause = becauseSoMatch[1].trim();
    const effectClause = becauseSoMatch[2].trim().replace(/[.!?]+$/, '');
    const original = becauseSoMatch[0].trim();
    return {
      learnerOriginal: original,
      naturalPhrasing: `Since ${causeClause}, ${effectClause}.`,
      upgradedChunk: 'Since ..., ... (drop "so")',
      whyItHelps:
        'English uses either "Because/Since..." or "..., so..." — dropping the extra "so" sounds immediately natural.',
    };
  }

  // 2. Classic Vietnamese L1 transfer: "for not ..." ("để không ...")
  const forNotMatch = rawRecall.match(/\b([^,.!?]*?)\s+for not\s+([^,.!?]+[.!?]?)/i);
  if (forNotMatch) {
    const actionPart = forNotMatch[1].trim();
    const avoidPart = forNotMatch[2].trim().replace(/[.!?]+$/, '');
    return {
      learnerOriginal: forNotMatch[0].trim(),
      naturalPhrasing: `${actionPart} so I don't ${avoidPart}.`,
      upgradedChunk: "so I don't ...",
      whyItHelps:
        'Replaces literal "for not..." with smooth everyday spoken English.',
    };
  }

  // 3. Domain-grounded upgrades when speaking about coding/debugging, morning prep, or planning
  const lower = rawRecall.toLowerCase();
  if (/\b(token|expired|api|authentication|login)\b/.test(lower)) {
    const targetSentence =
      sentences.find((s) =>
        /\b(token|expired|api|authentication|something)\b/i.test(s)
      ) || rawRecall;
    const mentionsToken = /\b(token|expired)\b/i.test(targetSentence);
    return mentionsToken
      ? {
          learnerOriginal: targetSentence,
          naturalPhrasing:
            'Authentication is acting up — the token might have expired, so let me check the API response first.',
          upgradedChunk: 'is acting up — might have expired',
          whyItHelps:
            'Uses natural spoken debugging flow ("acting up" + "might have..." + "let me...") while keeping your exact idea.',
        }
      : {
          learnerOriginal: targetSentence,
          naturalPhrasing:
            'Authentication is acting up — let me check the API response first.',
          upgradedChunk: 'is acting up — let me check...',
          whyItHelps:
            'Upgrades "Something isn\'t working with..." into natural everyday engineering speech with the exact same meaning.',
        };
  }

  if (/\b(traffic|coffee|slides|morning class|lecture)\b/.test(lower)) {
    const targetSentence =
      sentences.find((s) => /\b(traffic|slides|leave|early)\b/i.test(s)) ||
      rawRecall;
    return {
      learnerOriginal: targetSentence,
      naturalPhrasing:
        "In case traffic gets heavy, I'll review my slides now and head out a bit early.",
      upgradedChunk: "In case ... gets heavy, I'll head out...",
      whyItHelps:
        'Links a morning risk smoothly to your preventive move like a native speaker.',
    };
  }

  if (/\b(overwhelmed|checklist|assignments|schedule|hardest)\b/.test(lower)) {
    const targetSentence =
      sentences.find((s) =>
        /\b(checklist|overwhelmed|hardest|notifications)\b/i.test(s)
      ) || rawRecall;
    return {
      learnerOriginal: targetSentence,
      naturalPhrasing:
        "Mapping out a quick checklist keeps me on track, so I'll tackle the hardest task first.",
      upgradedChunk: "keeps me on track, so I'll tackle...",
      whyItHelps:
        'Upgrades basic task words into confident, idiomatic B1–B2 spoken phrasing.',
    };
  }

  // 4. Generic custom Real-Mic speech: smooth out two choppy adjacent sentences or add a natural spoken opener
  if (sentences.length >= 2) {
    const first = sentences[0].replace(/[.!?]+$/, '').trim();
    const second = sentences[1].replace(/[.!?]+$/, '').trim();
    const lowerSecond = second.charAt(0).toLowerCase() + second.slice(1);
    const alreadyHasConnector = /^(because|so|since|and|but|therefore|right after|next)/i.test(
      second
    );
    const bridged = alreadyHasConnector
      ? `${first} — ${lowerSecond}.`
      : `${first}, and right after that, ${lowerSecond}.`;
    return {
      learnerOriginal: `${sentences[0]} ${sentences[1]}`,
      naturalPhrasing: bridged,
      upgradedChunk: alreadyHasConnector ? '— (spoken flow bridge)' : 'and right after that, ...',
      whyItHelps:
        'Connects two separate short sentences into one continuous spoken thought.',
    };
  }

  const singleClean = (rawRecall || "I'm working on my task").replace(/[.!?]+$/, '').trim();
  const polishedBody = singleClean
    .replace(/^i am\b/i, "I'm")
    .replace(/^im\b/i, "I'm")
    .replace(/^i will\b/i, "I'll");
  const startsWithOpener = /^(right now|currently|at the moment|today)/i.test(
    polishedBody
  );
  const naturalSingle = startsWithOpener
    ? `${polishedBody} so I can stay focused on my next step.`
    : `Right now, ${polishedBody.charAt(0).toLowerCase() === 'i' && polishedBody.charAt(1) === "'" ? polishedBody : polishedBody.charAt(0).toLowerCase() + polishedBody.slice(1)}.`;

  return {
    learnerOriginal: rawRecall || "I'm working on my task.",
    naturalPhrasing: naturalSingle,
    upgradedChunk: startsWithOpener ? 'so I can stay focused...' : 'Right now, ...',
    whyItHelps:
      'Grounds your sentence naturally in the present moment without changing your idea.',
  };
}


