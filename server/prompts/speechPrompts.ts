export interface SttPromptParams {
  sceneContext?: string;
  hintVocabulary?: string[];
}

/**
 * Multimodal ASR prompt calibrated for Vietnamese learners speaking English
 * around a known visual scene, preventing silent-audio hallucinations while
 * resolving Vietnamese-accented phonetic near-misses using scene vocabulary.
 */
export function buildSttTranscriptionPrompt({
  sceneContext = '',
  hintVocabulary = [],
}: SttPromptParams): string {
  const cleanScene = sceneContext.trim();
  const cleanVocab = hintVocabulary
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 12);

  const contextLine = cleanScene ? `Scene topic: "${cleanScene}".` : '';
  const vocabLine =
    cleanVocab.length > 0
      ? `Domain & object words visible in this scene: ${cleanVocab.join(', ')}.`
      : '';

  return `Transcribe the speaker's English speech from this audio clip accurately.
${contextLine} ${vocabLine}

STRICT TRANSCRIPTION RULES:
1. Return ONLY the exact English words spoken by the learner, with natural punctuation and contractions (e.g., "I'm", "it's", "don't").
2. VIETNAMESE ACCENT AWARENESS: The speaker is a Vietnamese learner of English. Use the scene topic and visible object words ONLY to disambiguate unclear final consonants or homophones when acoustically consistent with what was actually spoken — NEVER add extra words or fix their grammar.
3. IGNORE HESITATION NOISES: Omit non-lexical throat clearing or mic clicks, and if the clip contains ONLY silence, background noise, breathing, or unintelligible sound, return an empty string "" with zero text.
4. Output plain transcript text ONLY — no quotes, no prefixes, no brackets, no commentary.`;
}

/**
 * Sanitizes and formats spoken text for Gemini TTS (`Kore`) so short object
 * chunks and full sentences are read naturally without vocalizing smart quotes,
 * markdown markers, or meta-instructions.
 */
export function buildTtsCoachPrompt(rawText: string): string {
  const cleaned = (rawText || '')
    .trim()
    .replace(/^[“"']+|[”"']+$/g, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}
