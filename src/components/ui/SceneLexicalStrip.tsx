import React, { useState, useMemo } from 'react';
import { Tag, Check, Volume2, Eye, EyeOff } from 'lucide-react';
import { SceneData } from '../../types';
import { playPronunciation } from '../../utils/audioUtils';

interface SceneLexicalStripProps {
  scene: SceneData;
  spokenText: string;
  mode?: 'active' | 'faded';
  onTapPhrase?: (phrase: string) => void;
}

interface LexicalTarget {
  id: string;
  display: string;
  matchTokens: string[];
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'my',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'is',
  'be',
  'while',
  'before',
]);

function buildLexicalTargets(scene: SceneData): LexicalTarget[] {
  const objTargets: LexicalTarget[] = (scene.objects || [])
    .slice(0, 2)
    .map((obj) => {
      const lower = obj.name.toLowerCase();
      const tokens = lower
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
      return {
        id: `obj_${lower}`,
        display: lower,
        matchTokens: tokens.length > 0 ? tokens : [lower],
      };
    });

  const exprTargets: LexicalTarget[] = (scene.suggestedExpressions || [])
    .slice(0, 2)
    .map((expr) => {
      const lower = expr.phrase.toLowerCase();
      const tokens = lower
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
      return {
        id: `expr_${lower}`,
        display: expr.phrase,
        matchTokens: tokens.length > 0 ? tokens : [lower],
      };
    });

  return [...objTargets, ...exprTargets];
}

function isTargetWovenIn(target: LexicalTarget, normalizedCorpus: string): boolean {
  if (!normalizedCorpus) return false;
  if (normalizedCorpus.includes(target.display.toLowerCase())) return true;
  if (target.matchTokens.length === 1) {
    return normalizedCorpus.includes(target.matchTokens[0]);
  }
  const hits = target.matchTokens.filter((tok) =>
    normalizedCorpus.includes(tok)
  ).length;
  return hits >= Math.min(2, target.matchTokens.length);
}

export const SceneLexicalStrip: React.FC<SceneLexicalStripProps> = ({
  scene,
  spokenText,
  mode = 'active',
  onTapPhrase,
}) => {
  const [peekOpen, setPeekOpen] = useState<boolean>(false);

  const targets = useMemo(() => buildLexicalTargets(scene), [scene]);
  const normalizedCorpus = useMemo(
    () =>
      spokenText
        .toLowerCase()
        .replace(/[^a-z0-9\s']/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    [spokenText]
  );

  const evaluated = useMemo(
    () =>
      targets.map((t) => ({
        ...t,
        used: isTargetWovenIn(t, normalizedCorpus),
      })),
    [targets, normalizedCorpus]
  );

  if (evaluated.length === 0) return null;

  const usedCount = evaluated.filter((item) => item.used).length;

  if (mode === 'faded') {
    return (
      <div className="rounded-[15px] bg-[#EFF2EF] px-3 py-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Tag className="w-3.5 h-3.5 text-[#148343] stroke-[2.2] shrink-0" />
            <span className="text-[11.5px] font-bold text-[#25332C]">
              Fading labels · {usedCount}/{evaluated.length} recalled
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPeekOpen((v) => !v)}
            className="text-[11px] font-bold text-[#148343] bg-white/90 hover:bg-white px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 apple-shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
          >
            {peekOpen ? (
              <>
                <EyeOff className="w-3 h-3 shrink-0" />
                <span>Hide</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3 shrink-0" />
                <span>Peek words</span>
              </>
            )}
          </button>
        </div>

        {peekOpen && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {evaluated.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  playPronunciation(item.display);
                  onTapPhrase?.(item.display);
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                  item.used
                    ? 'bg-[#DFF2E6] text-[#116E37]'
                    : 'bg-white text-[#2E3C34] apple-shadow-xs'
                }`}
              >
                {item.used ? (
                  <Check className="w-3 h-3 text-[#148343] stroke-[2.8] shrink-0" />
                ) : (
                  <Volume2 className="w-3 h-3 text-[#148343] stroke-[2.1] shrink-0" />
                )}
                <span>{item.display}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[16px] bg-white/92 px-3 py-2.5 apple-shadow-xs flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-[#148343] stroke-[2.2] shrink-0" />
          <span className="text-[11.5px] font-bold text-[#101E17]">
            Scene labels → thoughts
          </span>
        </div>
        <span className="text-[10.5px] font-bold bg-[#EAF6EE] text-[#148343] px-2 py-0.5 rounded-full tabular-nums whitespace-nowrap">
          {usedCount}/{evaluated.length} woven in
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {evaluated.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              playPronunciation(item.display);
              onTapPhrase?.(item.display);
            }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ${
              item.used
                ? 'bg-[#EAF6EE] text-[#148343]'
                : 'bg-[#F3F5F3] hover:bg-[#EAF6EE] text-[#1B2922]'
            }`}
          >
            {item.used ? (
              <Check className="w-3 h-3 text-[#148343] stroke-[2.8] shrink-0" />
            ) : (
              <Volume2 className="w-3 h-3 text-[#148343] stroke-[2.1] shrink-0" />
            )}
            <span>{item.display}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
