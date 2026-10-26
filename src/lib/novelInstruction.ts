// Novel Writer instructions + parsers. NEW file (2026-10-26, multi-mode
// expansion) — the episode builder's systemInstruction.ts is generated and
// must never be hand-edited, so novel prompts live here instead.
//
// The novel writer mirrors the story creator's voice (everyday Burmese,
// warm, Myanmar feel) but writes long prose chapters, not episode packages.
//
// #67 changes (2026-10-26, JJ-approved): Job 1 returns exactly ONE draft
// (not 3) and the draft is saved as a thread the moment it arrives, so the
// user can resume later; episodes are BILINGUAL — Myanmar first, then the
// same chapter in English below (top/bottom stacked, never side-by-side).

export const NOVEL_INSTRUCTION = `You are StoryFlow's novel writer. You write novels in everyday Burmese — warm, natural, never formal written Burmese. Every story must smell like Myanmar life (places, food, dress, family order, festivals, seasons), never a generic placeless story. Characters sound different from each other. Never play cruelty for laughs. Endings are warm and hopeful.

You have TWO jobs, and the user's prompt tells you which one:

## Job 1 — Draft
When the user asks for a novel draft, output EXACTLY ONE draft (never three, never more). Use this exact layout, nothing before it and nothing after it:

DRAFT 1
Title: <short Burmese title, in quotes>
English Title: <short English title, in quotes>
Premise: <2-3 Burmese sentences: who, what problem, what is at stake>
English Premise: <the same premise in 2-3 English sentences>
Main Characters: <names with one line each>
Tone: <one line, e.g. warm family comedy>

## Job 2 — Episodes
When the user asks for one episode of a chosen novel, write ONE long prose chapter (several paragraphs, a complete chapter arc: opening → complication → turn → close). The chapter is BILINGUAL: the full chapter in Myanmar FIRST, then the SAME chapter in English BELOW it (a faithful translation, not a different story). Use this exact layout:

EPISODE TITLE: <short Burmese chapter title>
MYANMAR:
<the full chapter prose, Burmese, multiple paragraphs>
ENGLISH:
<the same chapter prose, English, multiple paragraphs>

Rules for episodes:
- Episode 1 opens the world, the characters, and the central problem. It does not resolve the novel.
- A middle episode deepens the problem, changes something real (new information, new emotion, or a new problem), and ends with a reason to keep reading. Never filler.
- The FINAL episode (the user prompt says so) wraps up the whole arc: the central problem resolves, every main character lands somewhere warm, and the ending fits the novel's tone. Never leave the arc open on the final episode.
- Stay consistent with the chosen draft: same title, same characters, same tone, same story-so-far. Never rename characters, never restart the story, never repeat an earlier episode's events as if they were new.
- Dialogue is short, everyday Burmese in the Myanmar version (and natural English in the English version). Show feelings through action and reaction, not long explanations.
`

export interface NovelDraft {
  title: string
  titleEn: string
  premise: string
  premiseEn: string
  characters: string
  tone: string
}

export interface NovelEpisode {
  number: number
  title: string
  /** Legacy combined text (old novels, or unparsed fallback). */
  text: string
  /** Myanmar chapter paragraphs. Falls back to text when absent. */
  myanmarText: string
  /** English chapter paragraphs. Empty when the model gave none. */
  englishText: string
}

export interface Novel {
  id: string
  title: string
  titleEn: string
  premise: string
  premiseEn: string
  characters: string
  tone: string
  /** 0 = draft only, no episodes yet (episode count chosen later). */
  totalEpisodes: number
  episodes: NovelEpisode[]
  /** The idea that produced the draft (for Regenerate). Old novels: "". */
  idea: string
  createdAt: number
}

export function buildNovelDraftsPrompt(idea: string): string {
  return `ဝတ္ထု draft ၁ ခု ရေးပေးပါ။ Idea: ${idea}\nDraft ကို layout အတိုင်း အတိအကျ ရေးပါ — မြန်မာ title + premise နဲ့ English title + premise နှစ်မျိုးလုံး ပါရမယ်။`
}

export function buildNovelEpisodePrompt(
  draft: Pick<
    NovelDraft,
    "title" | "titleEn" | "premise" | "premiseEn" | "characters" | "tone"
  >,
  episodeNumber: number,
  totalEpisodes: number,
  storySoFar: string,
): string {
  const lines = [
    `ဝတ္ထု "${draft.title}" ရဲ့ Episode ${episodeNumber} (စုစုပေါင်း ${totalEpisodes} ပိုင်း) ကို ရေးပေးပါ။`,
    `Title (Myanmar): ${draft.title}`,
    `Title (English): ${draft.titleEn}`,
    `Premise (Myanmar): ${draft.premise}`,
    `Premise (English): ${draft.premiseEn}`,
    `Main Characters: ${draft.characters}`,
    `Tone: ${draft.tone}`,
  ]
  if (storySoFar) {
    lines.push(`Story so far (အရင်အပိုင်းတွေရဲ့ အကျဉ်း — ဒါကို ပြန်မရေးနဲ့၊ ဆက်ရေးပါ):\n${storySoFar}`)
  }
  if (episodeNumber === totalEpisodes) {
    lines.push(
      "ဒါက နောက်ဆုံးအပိုင်း ဖြစ်တယ် — ဇာတ်လမ်း arc အပြည့် ပိတ်သိမ်းရမယ်။",
    )
  }
  return lines.join("\n")
}

/** Join previous episode texts into a bounded "story so far" block: the
 * opening (setup) plus the most recent text, so long novels stay in context
 * without growing the prompt without bound. Myanmar text only — it is the
 * primary version and keeps the prompt short. */
export function buildStorySoFar(episodes: NovelEpisode[]): string {
  if (episodes.length === 0) return ""
  const joined = episodes
    .map(
      (episode) =>
        `Episode ${episode.number} — ${episode.title}:\n${episode.myanmarText || episode.text}`,
    )
    .join("\n\n")
  const LIMIT = 6000
  if (joined.length <= LIMIT) return joined
  return `${joined.slice(0, 2000)}\n…\n${joined.slice(-4000)}`
}

/** Parse the single-draft layout. Tolerant: returns whatever drafts parsed
 * (usually exactly 1); an empty list means the output did not follow the
 * layout. Old 3-draft outputs still parse (callers take the first). */
export function parseNovelDrafts(text: string): NovelDraft[] {
  const drafts: NovelDraft[] = []
  const parts = text.split(/^DRAFT\s+\d+\s*$/im).slice(1)
  for (const part of parts) {
    const title = extractMultilineField(part, "Title")
    const titleEn = extractMultilineField(part, "English Title")
    const premise = extractMultilineField(part, "Premise")
    const premiseEn = extractMultilineField(part, "English Premise")
    const characters = extractMultilineField(part, "Main Characters")
    const tone = extractMultilineField(part, "Tone")
    if (title || premise) {
      drafts.push({ title, titleEn, premise, premiseEn, characters, tone })
    }
  }
  return drafts
}

/** Extract a "Label: value..." field whose value may span lines until the
 * next "Label:" line or the end of the block. */
function extractMultilineField(block: string, label: string): string {
  const lines = block.split("\n")
  const start = lines.findIndex((line) =>
    new RegExp(`^${label}:`, "i").test(line.trim()),
  )
  if (start === -1) return ""
  const first = lines[start].trim().replace(new RegExp(`^${label}:`, "i"), "").trim()
  const following: string[] = []
  for (let i = start + 1; i < lines.length; i++) {
    if (/^[A-Za-z][A-Za-z ]*:/.test(lines[i].trim())) break
    following.push(lines[i])
  }
  return [first, ...following].join("\n").trim()
}

/** Parse one bilingual episode chapter. Returns null when there is no
 * usable prose. Tolerant: a chapter without MYANMAR/ENGLISH markers is
 * treated as Myanmar text (old single-language outputs still render). */
export function parseNovelEpisode(
  text: string,
  fallbackTitle: string,
  episodeNumber: number,
): NovelEpisode | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const titleMatch = trimmed.match(/^EPISODE TITLE:\s*(.+)$/im)
  const title = (titleMatch?.[1] ?? "").trim() || fallbackTitle
  let body = trimmed
  const titleLine = trimmed.match(/^EPISODE TITLE:\s*.+$/im)
  if (titleLine && titleLine.index !== undefined) {
    body = trimmed.slice(titleLine.index + titleLine[0].length).trim()
  }
  const myanmarMatch = body.match(/^MYANMAR:\s*$/im)
  const englishMatch = body.match(/^ENGLISH:\s*$/im)
  let myanmarText = ""
  let englishText = ""
  if (myanmarMatch && myanmarMatch.index !== undefined) {
    const afterMyanmar = body.slice(
      myanmarMatch.index + myanmarMatch[0].length,
    )
    if (englishMatch && englishMatch.index !== undefined) {
      const englishAt = body.indexOf(englishMatch[0], myanmarMatch.index + myanmarMatch[0].length)
      if (englishAt !== -1) {
        myanmarText = body
          .slice(
            myanmarMatch.index + myanmarMatch[0].length,
            englishAt,
          )
          .trim()
        englishText = body
          .slice(englishAt + englishMatch[0].length)
          .trim()
      } else {
        myanmarText = afterMyanmar.trim()
      }
    } else {
      myanmarText = afterMyanmar.trim()
    }
  } else if (englishMatch && englishMatch.index !== undefined) {
    englishText = body.slice(englishMatch.index + englishMatch[0].length).trim()
    myanmarText = body.slice(0, englishMatch.index).trim()
  } else {
    myanmarText = body.trim()
  }
  if (!myanmarText && !englishText) return null
  return {
    number: episodeNumber,
    title,
    text: myanmarText || englishText,
    myanmarText,
    englishText,
  }
}
