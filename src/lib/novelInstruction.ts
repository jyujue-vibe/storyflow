// Novel Writer instructions + parsers. NEW file (2026-10-26, multi-mode
// expansion) — the episode builder's systemInstruction.ts is generated and
// must never be hand-edited, so novel prompts live here instead.
//
// The novel writer mirrors the story creator's voice (everyday Burmese,
// warm, Myanmar feel) but writes long prose chapters, not episode packages.

export const NOVEL_INSTRUCTION = `You are StoryFlow's novel writer. You write novels in everyday Burmese — warm, natural, never formal written Burmese. Every story must smell like Myanmar life (places, food, dress, family order, festivals, seasons), never a generic placeless story. Characters sound different from each other. Never play cruelty for laughs. Endings are warm and hopeful.

You have TWO jobs, and the user's prompt tells you which one:

## Job 1 — Drafts
When the user asks for novel drafts, output EXACTLY 3 drafts, each one a DIFFERENT novel (different premise, conflict, and tone — never three versions of the same story). Use this exact layout, nothing before the first draft and nothing after the last draft:

DRAFT 1
Title: <short Burmese title, in quotes>
Premise: <2-3 Burmese sentences: who, what problem, what is at stake>
Main Characters: <names with one line each>
Tone: <one line, e.g. warm family comedy>

DRAFT 2
Title: ...
Premise: ...
Main Characters: ...
Tone: ...

DRAFT 3
Title: ...
Premise: ...
Main Characters: ...
Tone: ...

## Job 2 — Episodes
When the user asks for one episode of a chosen novel, write ONE long prose chapter in Burmese (several paragraphs, a complete chapter arc: opening → complication → turn → close). Use this exact layout:

EPISODE TITLE: <short Burmese chapter title>
CHAPTER TEXT:
<the full chapter prose, Burmese, multiple paragraphs>

Rules for episodes:
- Episode 1 opens the world, the characters, and the central problem. It does not resolve the novel.
- A middle episode deepens the problem, changes something real (new information, new emotion, or a new problem), and ends with a reason to keep reading. Never filler.
- The FINAL episode (the user prompt says so) wraps up the whole arc: the central problem resolves, every main character lands somewhere warm, and the ending fits the novel's tone. Never leave the arc open on the final episode.
- Stay consistent with the chosen draft: same title, same characters, same tone, same story-so-far. Never rename characters, never restart the story, never repeat an earlier episode's events as if they were new.
- Dialogue is short, everyday Burmese. Show feelings through action and reaction, not long explanations.
`

export interface NovelDraft {
  title: string
  premise: string
  characters: string
  tone: string
}

export interface NovelEpisode {
  number: number
  title: string
  text: string
}

export interface Novel {
  id: string
  title: string
  premise: string
  characters: string
  tone: string
  totalEpisodes: number
  episodes: NovelEpisode[]
  createdAt: number
}

export function buildNovelDraftsPrompt(idea: string): string {
  return `Novel drafts ၃ ခု ရေးပေးပါ။ Idea: ${idea}\nDraft တစ်ခုချင်းစီ လုံးဝ မတူတဲ့ ဝတ္ထု ဖြစ်ရမယ် — premise, conflict, tone မတူရမယ်။`
}

export function buildNovelEpisodePrompt(
  draft: Pick<NovelDraft, "title" | "premise" | "characters" | "tone">,
  episodeNumber: number,
  totalEpisodes: number,
  storySoFar: string,
): string {
  const lines = [
    `ဝတ္ထု "${draft.title}" ရဲ့ Episode ${episodeNumber} (စုစုပေါင်း ${totalEpisodes} ပိုင်း) ကို ရေးပေးပါ။`,
    `Premise: ${draft.premise}`,
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
 * without growing the prompt without bound. */
export function buildStorySoFar(episodes: NovelEpisode[]): string {
  if (episodes.length === 0) return ""
  const joined = episodes
    .map((episode) => `Episode ${episode.number} — ${episode.title}:\n${episode.text}`)
    .join("\n\n")
  const LIMIT = 6000
  if (joined.length <= LIMIT) return joined
  return `${joined.slice(0, 2000)}\n…\n${joined.slice(-4000)}`
}

/** Parse the 3-draft layout. Tolerant: returns whatever drafts parsed
 * (usually 3); an empty list means the output did not follow the layout. */
export function parseNovelDrafts(text: string): NovelDraft[] {
  const drafts: NovelDraft[] = []
  const parts = text.split(/^DRAFT\s+\d+\s*$/im).slice(1)
  for (const part of parts) {
    const title = extractMultilineField(part, "Title")
    const premise = extractMultilineField(part, "Premise")
    const characters = extractMultilineField(part, "Main Characters")
    const tone = extractMultilineField(part, "Tone")
    if (title || premise) {
      drafts.push({ title, premise, characters, tone })
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

/** Parse one episode chapter. Returns null when there is no usable prose. */
export function parseNovelEpisode(
  text: string,
  fallbackTitle: string,
  episodeNumber: number,
): NovelEpisode | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const titleMatch = trimmed.match(/^EPISODE TITLE:\s*(.+)$/im)
  const title = (titleMatch?.[1] ?? "").trim() || fallbackTitle
  const marker = trimmed.match(/^CHAPTER TEXT:\s*$/im)
  let body = trimmed
  if (marker && marker.index !== undefined) {
    body = trimmed.slice(marker.index + marker[0].length).trim()
  } else if (titleMatch && titleMatch.index !== undefined) {
    body = trimmed
      .slice(titleMatch.index + titleMatch[0].length)
      .trim()
  }
  if (!body) return null
  return { number: episodeNumber, title, text: body }
}
