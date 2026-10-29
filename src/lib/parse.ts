/**
 * Parse a Gemini episode package (the 8 sections from system-instruction.md)
 * into a typed Episode. Tolerant by design: Gem-style output varies in
 * headings, fences and timestamp placement, so every section is extracted
 * independently and problems are collected as issues instead of throwing.
 * A hard failure (nothing usable at all) returns episode: null.
 */

export interface EpisodeCharacter {
  id: string
  name: string
  transliteration: string
  age: number | null
  role: string
  description: string
}

export interface EpisodeScene {
  number: number
  line: string
  start: number
  end: number
}

export interface ScenePrompt {
  number: number
  image: string
  background: string
  video: string
  start: number
  end: number
}

export interface EpisodeBackground {
  id: string
  text: string
}

/**
 * One background generation prompt, grouped for the episode view: either a
 * dedicated block from the new §6 Background Prompts section, or the
 * per-scene background texts of an old-format episode grouped by BG ID.
 * `scenes` lists every scene that uses this background (for the accordion
 * subtitle). `bgId` is "" when the source text names no BG ID (scene
 * fallback) — then `name` is the scene label.
 */
export interface EpisodeBackgroundPrompt {
  bgId: string
  name: string
  scenes: number[]
  text: string
}

export interface StoryRecord {
  title: string
  genre: string
  premise: string
  conflict: string
  turningPoint: string
  endingType: string
}

export interface Episode {
  id: string
  threadId: string
  title: string
  episodeNumber: number
  genre: string
  visualStyle: string
  aspect: string
  sceneDuration: number
  totalSeconds: number
  storySummary: string
  characters: EpisodeCharacter[]
  sheetPrompts: { charId: string; text: string }[]
  backgroundSheets: { bgId: string; text: string }[]
  backgrounds: EpisodeBackground[]
  backgroundPrompts: EpisodeBackgroundPrompt[]
  location: string
  scenes: EpisodeScene[]
  prompts: ScenePrompt[]
  continuityNote: string
  hook: string
  storyRecord: StoryRecord
  raw: string
}

export interface ParseResult {
  episode: Episode | null
  issues: string[]
}

export interface ParseOptions {
  id?: string
  threadId?: string
  sceneDuration?: number
  episodeNumber?: number
  /** Scenes the user asked for (4/6/8/10/12, default 10) — validation target. */
  sceneCount?: number
}

function mmssToSeconds(mmss: string): number {
  const match = mmss.match(/(\d{1,2}):(\d{2})/)
  if (!match) return 0
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

function cleanLine(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

/** Split raw text into the 8 sections by anchor phrase, in order. */
function splitSections(raw: string): string[] {
  const anchors = [
    /episode\s+title\s*(?:&|and)?\s*details/i,
    /story\s+summary/i,
    /character\s+bible/i,
    /character\s+sheet/i,
    /scene\s+continuity\s+plan/i,
    /scene\s+prompts/i,
    /continuity\s+note/i,
    /story\s+record/i,
  ]
  // Find each anchor in order, searching only after the previous anchor.
  const starts: (number | null)[] = []
  let cursor = 0
  for (const anchor of anchors) {
    const match = raw.slice(cursor).match(anchor)
    if (!match || match.index === undefined) {
      starts.push(null)
      continue
    }
    const start = cursor + match.index
    starts.push(start)
    cursor = start + match[0].length
  }
  // Each section runs from its anchor start to the next found anchor start.
  return starts.map((start, i) => {
    if (start === null) return ""
    let end = raw.length
    for (let j = i + 1; j < starts.length; j++) {
      if (starts[j] !== null) {
        end = starts[j] as number
        break
      }
    }
    return raw.slice(start, end)
  })
}

function firstLineValue(text: string, label: RegExp): string {
  for (const line of text.split("\n")) {
    const match = line.match(label)
    if (match) return cleanLine(match[1])
  }
  return ""
}

function stripHeadingLines(text: string, phrases: RegExp[]): string {
  return text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim()
      if (!trimmed) return false
      if (/^#{1,6}\s/.test(trimmed)) return false
      return !phrases.some((phrase) => phrase.test(trimmed))
    })
    .join("\n")
    .trim()
}

function stripFences(text: string): string {
  let out = text.trim()
  out = out.replace(/^```(?:text|txt)?\s*\n?/i, "").replace(/\n?```\s*$/, "")
  // A block wrapped in one pair of straight/curly quotes: unwrap it.
  const quoted = out.match(/^["“]([\s\S]*?)["”]$/)
  if (quoted) out = quoted[1].trim()
  return out
}

function parseCharacters(section: string): EpisodeCharacter[] {
  const header = /\[CHAR_(\d+)\]\s*([^\n(]+?)\s*\(([^)]+)\)/g
  const matches = [...section.matchAll(header)]
  return matches.map((match, index) => {
    const nextStart = matches[index + 1]?.index ?? section.length
    const headerEnd = (match.index ?? 0) + match[0].length
    let description = section
      .slice(headerEnd, nextStart)
      .replace(/^[\s:—–-]+/, "")
      .replace(/\s+/g, " ")
      .trim()
    // Cut off any trailing section heading that leaked into the last entry.
    description = description.split(/\n\s*#{1,6}\s/)[0].trim()
    const ageMatch = description.match(/(\d+)\s*(?:နှစ်|years?\s*old)/)
    const age = ageMatch ? parseInt(ageMatch[1], 10) : null
    let role = ""
    if (ageMatch && ageMatch.index !== undefined) {
      const afterAge = description
        .slice(ageMatch.index + ageMatch[0].length)
        .replace(/^[\s,;—–-]+/, "")
      role = cleanLine(afterAge.split(/[,၊.]/)[0]).slice(0, 60)
    } else {
      role = cleanLine(description.split(/[,၊.]/)[0]).slice(0, 60)
    }
    return {
      id: `CHAR_${match[1].padStart(3, "0")}`,
      name: cleanLine(match[2]),
      transliteration: cleanLine(match[3]),
      age,
      role,
      description,
    }
  })
}

function parseSheets(
  section: string,
  characters: EpisodeCharacter[],
): { charId: string; text: string }[] {
  const blocks = [
    ...section.matchAll(
      /Create a professional character reference sheet[\s\S]*?No text, no logo, no watermark\.?/gi,
    ),
  ]
  if (blocks.length > 0) {
    return blocks.map((block, index) => {
      const idMatch = block[0].match(/CHAR_(\d+)/)
      const charId = idMatch
        ? `CHAR_${idMatch[1].padStart(3, "0")}`
        : (characters[index]?.id ?? `CHAR_${String(index + 1).padStart(3, "0")}`)
      return { charId, text: stripFences(block[0]) }
    })
  }
  // Fallback: one chunk per CHAR header in the section.
  const headers = [...section.matchAll(/\[CHAR_(\d+)\]/g)]
  if (headers.length === 0) return []
  return headers.map((header, index) => {
    const start = header.index ?? 0
    const end = headers[index + 1]?.index ?? section.length
    return {
      charId: `CHAR_${header[1].padStart(3, "0")}`,
      text: stripFences(section.slice(start, end)),
    }
  })
}

/** Background Map entries: lines that START (after an optional "- ") with a
 * BG ID. Scene lines start with "Scene", so they never match this anchor. */
function parseBackgrounds(section: string): EpisodeBackground[] {
  const entries = [
    ...section.matchAll(/^\s*(?:-\s*)?\[BG_(\d+)\]\s*(.+)$/gim),
  ]
  const seen = new Set<string>()
  const out: EpisodeBackground[] = []
  for (const entry of entries) {
    const id = `BG_${entry[1].padStart(3, "0")}`
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ id, text: cleanLine(entry[2]) })
  }
  return out
}

function parseBackgroundSheets(
  section: string,
): { bgId: string; text: string }[] {
  const blocks = [
    ...section.matchAll(
      /Create a professional background reference image[\s\S]*?No text, no logo, no watermark\.?/gi,
    ),
  ]
  if (blocks.length > 0) {
    return blocks.map((block, index) => {
      const idMatch = block[0].match(/BG_(\d+)/)
      const bgId = idMatch
        ? `BG_${idMatch[1].padStart(3, "0")}`
        : `BG_${String(index + 1).padStart(3, "0")}`
      return { bgId, text: stripFences(block[0]) }
    })
  }
  // Fallback: one chunk per BG header in the section.
  const headers = [...section.matchAll(/\[BG_(\d+)\]/g)]
  if (headers.length === 0) return []
  return headers.map((header, index) => {
    const start = header.index ?? 0
    const end = headers[index + 1]?.index ?? section.length
    return {
      bgId: `BG_${header[1].padStart(3, "0")}`,
      text: stripFences(section.slice(start, end)),
    }
  })
}

function parsePlan(
  section: string,
  duration: number,
): { location: string; scenes: EpisodeScene[]; backgrounds: EpisodeBackground[] } {
  const location = firstLineValue(section, /Location\s*[:：]\s*(.+)/i)
  const backgrounds = parseBackgrounds(section)
  const lines = section.split("\n")
  const scenes: EpisodeScene[] = []
  for (const line of lines) {
    const match = line.match(/Scene\s+0?(\d{1,2})\b/i)
    if (!match) continue
    const number = parseInt(match[1], 10)
    if (number < 1 || number > 12) continue
    const range = line.match(
      /(\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})/,
    )
    let rest = line
      .replace(/^(?:\d+[.)]\s*)?Scene\s+0?\d{1,2}\s*/i, "")
      .replace(
        /^\(\s*\d{1,2}:\d{2}\s*[–—-]\s*\d{1,2}:\d{2}\s*\)\s*[:：\-–—]?\s*/,
        "",
      )
      .replace(
        /^\d{1,2}:\d{2}\s*[–—-]\s*\d{1,2}:\d{2}\s*[:：\-–—]?\s*/,
        "",
      )
      .replace(/^[:：\-–—]\s*/, "")
      .trim()
    if (!rest) continue
    scenes.push({
      number,
      line: cleanLine(rest),
      start: range ? mmssToSeconds(range[1]) : (number - 1) * duration,
      end: range ? mmssToSeconds(range[2]) : number * duration,
    })
  }
  scenes.sort((a, b) => a.number - b.number)
  if (scenes.length < 10) {
    // Fallback: plain numbered list lines in the plan section.
    const numbered = lines
      .map((line) => line.match(/^\s*\d{1,2}[.)]\s+(.+)$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => cleanLine(m[1]))
      .filter((text) => !/^(Location|Environment|Time)/i.test(text))
    if (numbered.length > scenes.length) {
      return {
        location,
        backgrounds,
        scenes: numbered.slice(0, 10).map((text, index) => ({
          number: index + 1,
          line: text,
          start: index * duration,
          end: (index + 1) * duration,
        })),
      }
    }
  }
  return { location, backgrounds, scenes }
}

/**
 * Shared chunk cleanup for prompt blocks: drop fences, a leading
 * timestamp-only line, and trailing junk. The timestamp line often carries
 * a leading dash ("— (00:16 - 00:24)"), which the old strip missed.
 */
function cleanPromptChunk(rawChunk: string): string {
  let text = stripFences(rawChunk)
  text = text
    .replace(
      /^[–—-]?\s*\(?\s*\d{1,2}:\d{2}\s*[–—-]\s*\d{1,2}:\d{2}\s*\)?\s*[:：\-–—]?\s*\n?/,
      "",
    )
    .trim()
  // The timestamp strip above can EXPOSE a fence that was hiding behind
  // the timestamp line (chunk starts "— (00:00 - 00:08)\n```text\n..."),
  // so strip fences a second time — otherwise ```text survives into
  // display, copy, and export.
  text = stripFences(text)
  return stripTrailingJunk(text)
}

/**
 * Drop lines that may only be trailing junk at the end of a prompt chunk:
 * a horizontal rule, or a scene header that leaked in when the model
 * started the next scene without a prompt header (e.g. "---" followed by
 * "#### Scene 4 (00:24 - 00:32)" at the end of a video block). Only
 * trailing lines are popped, so a "Scene N" mention inside the prompt
 * body is never touched.
 */
function stripTrailingJunk(text: string): string {
  const lines = text.split("\n")
  while (lines.length > 0) {
    const line = lines[lines.length - 1].trim()
    if (!line) {
      lines.pop()
      continue
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      lines.pop()
      continue
    }
    if (/^```\s*$/.test(line)) {
      lines.pop()
      continue
    }
    if (/^#{1,6}\s+Scene\s+0?\d{1,2}\b/i.test(line)) {
      lines.pop()
      continue
    }
    if (
      /^Scene\s+0?\d{1,2}\s*\(\s*\d{1,2}:\d{2}\s*[–—-]\s*\d{1,2}:\d{2}\s*\)\s*$/.test(
        line,
      )
    ) {
      lines.pop()
      continue
    }
    break
  }
  return lines.join("\n").trim()
}

/**
 * Prefix bare CHAR_/BG_ IDs with @ for Flow-style references
 * ("CHAR_001" → "@CHAR_001"), normalizing to 3 digits. Already-prefixed
 * IDs are left alone, so this never produces "@@".
 */
function addMentions(text: string): string {
  return text.replace(
    /(?<!@)\b(CHAR|BG)_(\d{1,3})\b/g,
    (_, kind: string, num: string) => `@${kind}_${num.padStart(3, "0")}`,
  )
}

function parsePrompts(section: string, duration: number): ScenePrompt[] {
  const header = /(?:🎨|🎬|🏡)?\s*(IMAGE|VIDEO|BACKGROUND)\s+PROMPT\s+0?(\d{1,2})/gi
  const matches = [...section.matchAll(header)]
  const byNumber = new Map<
    number,
    { image: string; background: string; video: string }
  >()
  matches.forEach((match, index) => {
    const number = parseInt(match[2], 10)
    if (number < 1 || number > 12) return
    const chunkStart = (match.index ?? 0) + match[0].length
    const chunkEnd = matches[index + 1]?.index ?? section.length
    const rawChunk = section.slice(chunkStart, chunkEnd)
    const text = cleanPromptChunk(rawChunk)
    const entry = byNumber.get(number) ?? {
      image: "",
      background: "",
      video: "",
    }
    const kind = match[1].toUpperCase()
    if (kind === "IMAGE") entry.image = text
    else if (kind === "BACKGROUND") entry.background = text
    else entry.video = text
    byNumber.set(number, entry)
  })
  return [...byNumber.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([number, entry]) => {
      // Timestamps come from the video block's DURATION line when present,
      // otherwise from the scene number and duration.
      const source = entry.video || entry.image
      const range = source.match(/(\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})/)
      return {
        number,
        // @-mentions apply to image + video prompts only; background
        // prompt texts keep their IDs as written.
        image: addMentions(entry.image),
        background: entry.background,
        video: addMentions(entry.video),
        start: range ? mmssToSeconds(range[1]) : (number - 1) * duration,
        end: range ? mmssToSeconds(range[2]) : number * duration,
      }
    })
}

/** Parse a "01–12", "03, 05" style scene list into sorted scene numbers. */
function parseSceneList(raw: string): number[] {
  const out = new Set<number>()
  for (const part of raw.split(",")) {
    const token = part.trim()
    if (!token) continue
    const range = token.match(/(\d{1,2})\s*[–—-]\s*(\d{1,2})/)
    if (range) {
      const start = Math.max(1, parseInt(range[1], 10))
      const end = Math.min(12, parseInt(range[2], 10))
      for (let n = start; n <= end; n++) out.add(n)
    } else {
      const single = token.match(/(\d{1,2})/)
      if (single) {
        const n = parseInt(single[1], 10)
        if (n >= 1 && n <= 12) out.add(n)
      }
    }
  }
  return [...out].sort((a, b) => a - b)
}

/**
 * Extract the new-format §6 Background Prompts blocks
 * ("BACKGROUND PROMPT — BG_001 Name (Scenes 01–10)" + text) and return
 * them plus the section with those blocks removed, so parsePrompts never
 * sees them inside a video chunk. Old per-scene "BACKGROUND PROMPT 03"
 * headers do NOT match (they carry digits, not a BG ID), so old-format
 * sections pass through untouched.
 */
function extractBackgroundPrompts(section: string): {
  blocks: EpisodeBackgroundPrompt[]
  cleaned: string
} {
  const bgHeader =
    /BACKGROUND\s+PROMPT\s*[:：—–-]?\s*BG_(\d{1,3})\s+([^\n(]+)\s*(?:\(\s*Scenes?\s+([^)]+)\))?/gi
  const promptHeader =
    /(?:🎨|🎬|🏡)?\s*(IMAGE|VIDEO|BACKGROUND)\s+PROMPT\s+0?(\d{1,2})/gi
  const bgMatches = [...section.matchAll(bgHeader)]
  if (bgMatches.length === 0) return { blocks: [], cleaned: section }
  const promptMatches = [...section.matchAll(promptHeader)]
  const boundaries = [
    ...bgMatches.map((m) => m.index ?? 0),
    ...promptMatches.map((m) => m.index ?? 0),
  ].sort((a, b) => a - b)
  const blocks: EpisodeBackgroundPrompt[] = []
  const removeRanges: [number, number][] = []
  bgMatches.forEach((match) => {
    const start = match.index ?? 0
    const chunkStart = start + match[0].length
    const nextBoundary = boundaries.find((b) => b > start) ?? section.length
    const text = cleanPromptChunk(section.slice(chunkStart, nextBoundary))
    if (!text) return
    const num = match[1].padStart(3, "0")
    blocks.push({
      bgId: `BG_${num}`,
      name: (match[2] ?? "").trim(),
      scenes: match[3] ? parseSceneList(match[3]) : [],
      text,
    })
    removeRanges.push([start, nextBoundary])
  })
  let cleaned = section
  for (const [start, end] of removeRanges.sort((a, b) => b[0] - a[0])) {
    cleaned = cleaned.slice(0, start) + cleaned.slice(end)
  }
  return { blocks, cleaned }
}

/**
 * Group old-format per-scene background texts by BG ID (first occurrence's
 * text wins; scenes accumulate). Texts naming no BG ID are kept under
 * their own scene so nothing is lost. Used for episodes parsed before the
 * Background Prompts section existed, and as a fallback wherever a
 * stored episode has no backgroundPrompts field.
 */
export function groupBackgroundPrompts(
  prompts: ScenePrompt[],
): EpisodeBackgroundPrompt[] {
  const byBg = new Map<string, EpisodeBackgroundPrompt>()
  for (const prompt of [...prompts].sort((a, b) => a.number - b.number)) {
    const text = (prompt.background ?? "").trim()
    if (!text) continue
    const idMatch = text.match(/\bBG_(\d{1,3})\b/)
    if (idMatch) {
      const bgId = `BG_${idMatch[1].padStart(3, "0")}`
      const bracketName = text.match(/\[\s*BG_\d+\s+([^,\]\n]+)/)?.[1]?.trim()
      const plainName = text.match(/BG_\d+\s+([^,\n]+)/)?.[1]?.trim()
      const existing = byBg.get(bgId)
      if (existing) {
        if (!existing.scenes.includes(prompt.number)) {
          existing.scenes.push(prompt.number)
        }
      } else {
        byBg.set(bgId, {
          bgId,
          name: bracketName || plainName || bgId,
          scenes: [prompt.number],
          text,
        })
      }
    } else {
      const key = `scene-${prompt.number}`
      byBg.set(key, {
        bgId: "",
        name: `Scene ${String(prompt.number).padStart(2, "0")}`,
        scenes: [prompt.number],
        text,
      })
    }
  }
  return [...byBg.values()]
    .map((g) => ({ ...g, scenes: [...g.scenes].sort((a, b) => a - b) }))
    .sort((a, b) => (a.scenes[0] ?? 99) - (b.scenes[0] ?? 99))
}

function splitNoteAndHook(section: string): {
  note: string
  hook: string
} {
  const lines = section.split("\n")
  const hookIndex = lines.findIndex((line) => /Next Episode Hook/i.test(line))
  if (hookIndex === -1) {
    return {
      note: stripHeadingLines(section, [/Continuity Note/i]),
      hook: "",
    }
  }
  const note = stripHeadingLines(lines.slice(0, hookIndex).join("\n"), [
    /Continuity Note/i,
  ])
  const hook = lines
    .slice(hookIndex + 1)
    .filter((line) => line.trim() && !/ဆက်ရေးရန်/i.test(line))
    .join("\n")
    .trim()
  return { note, hook }
}

export function parseEpisode(raw: string, opts: ParseOptions = {}): ParseResult {
  const issues: string[] = []
  const sections = splitSections(raw)
  const [
    titleSection,
    summarySection,
    bibleSection,
    sheetSection,
    planSection,
    promptsSection,
    noteSection,
    recordSection,
  ] = sections

  // §1 — Title & Details
  const titleMatch =
    titleSection.match(/["“]([^"”]+)["”]\s*\(Episode\s*0*(\d+)\)/) ??
    titleSection.match(/Episode\s+Title\s*[:：]\s*["“]?([^"\n(]+)/i)
  const title = titleMatch ? cleanLine(titleMatch[1]) : ""
  const episodeNumber = titleMatch?.[2]
    ? parseInt(titleMatch[2], 10)
    : (opts.episodeNumber ?? 1)
  const genre = firstLineValue(titleSection, /Genre\s*[:：]\s*(.+)/i)
  const visualStyle = firstLineValue(
    titleSection,
    /Visual Style\s*[:：]\s*(.+)/i,
  )
  const aspectRaw = firstLineValue(titleSection, /Aspect Ratio\s*[:：]\s*(.+)/i)
  const aspect = aspectRaw || "16:9 Landscape"
  const totalMatch = titleSection.match(
    /(\d+)\s*Scenes?\s*[×xX]\s*(\d+)\s*Seconds?\s*=\s*(\d+)/i,
  )
  const perSceneMatch = titleSection.match(/(\d+)\s*seconds?\s*per\s*scene/i)
  const sceneDuration = totalMatch
    ? parseInt(totalMatch[2], 10)
    : perSceneMatch
      ? parseInt(perSceneMatch[1], 10)
      : (opts.sceneDuration ?? 8)
  // Scenes the user asked for: the caller's count wins, then the title's
  // own "N Scenes ×" line, then the old default 10.
  const expectedScenes =
    opts.sceneCount ?? (totalMatch ? parseInt(totalMatch[1], 10) : 10)
  const totalSeconds = totalMatch
    ? parseInt(totalMatch[3], 10)
    : expectedScenes * sceneDuration

  // §2 — Story Summary
  const storySummary = stripHeadingLines(summarySection, [/Story Summary/i])

  // §3 — Character Bible
  const characters = parseCharacters(bibleSection)

  // §4 — Character Sheet Prompts + Background Sheet Prompts
  const sheetPrompts = parseSheets(sheetSection, characters)
  const backgroundSheets = parseBackgroundSheets(sheetSection)

  // §5 — Scene Continuity Plan + Background Map
  const { location, backgrounds, scenes } = parsePlan(
    planSection,
    sceneDuration,
  )

  // §6 — Scene Prompts + Background Prompts. New-format background
  // blocks are extracted (and removed) first so they never pollute a
  // video chunk; old per-scene backgrounds are grouped by BG ID.
  const { blocks: bgBlocks, cleaned: cleanedPromptsSection } =
    extractBackgroundPrompts(promptsSection)
  const prompts = parsePrompts(cleanedPromptsSection, sceneDuration)
  for (const block of bgBlocks) {
    if (block.scenes.length === 0) {
      // No scene list in the header: attribute by BG mention in the
      // scene's image/video text.
      block.scenes = prompts
        .filter((p) => new RegExp(`\\b${block.bgId}\\b`).test(`${p.image}\n${p.video}`))
        .map((p) => p.number)
    } else {
      block.scenes = [...block.scenes].sort((a, b) => a - b)
    }
  }
  const coveredBg = new Set(bgBlocks.map((b) => b.bgId))
  const oldGroups = groupBackgroundPrompts(prompts).filter(
    (g) => g.bgId === "" || !coveredBg.has(g.bgId),
  )
  const backgroundPrompts = [...bgBlocks, ...oldGroups].sort(
    (a, b) => (a.scenes[0] ?? 99) - (b.scenes[0] ?? 99),
  )

  // §7 — Continuity Note & Hook
  const { note: continuityNote, hook } = splitNoteAndHook(noteSection)

  // §8 — Story Record
  const storyRecord: StoryRecord = {
    title: firstLineValue(recordSection, /Story Title\s*[:：]\s*(.+)/i),
    genre: firstLineValue(recordSection, /Genre\s*[:：]\s*(.+)/i),
    premise: firstLineValue(recordSection, /Central Premise\s*[:：]\s*(.+)/i),
    conflict: firstLineValue(recordSection, /Main Conflict\s*[:：]\s*(.+)/i),
    turningPoint: firstLineValue(
      recordSection,
      /Key Turning Point\s*[:：]\s*(.+)/i,
    ),
    endingType: firstLineValue(recordSection, /Ending Type\s*[:：]\s*(.+)/i),
  }

  // Validation — collect, never throw.
  if (!title) issues.push("Episode title မတွေ့ဘူး။")
  if (scenes.length < expectedScenes) {
    issues.push(`Continuity plan မှာ scene ${scenes.length} ခုပဲ တွေ့တယ် (${expectedScenes} ခု လိုတယ်)။`)
  } else if (scenes.length > expectedScenes) {
    issues.push(`Continuity plan မှာ scene ${scenes.length} ခု တွေ့တယ် (${expectedScenes} ခု တောင်းထားတယ်)။`)
  }
  const imageCount = prompts.filter((p) => p.image).length
  const videoCount = prompts.filter((p) => p.video).length
  if (imageCount !== videoCount) {
    issues.push(
      `Prompt အရေအတွက် မညီဘူး — image ${imageCount} ခု၊ video ${videoCount} ခု။`,
    )
  }
  if (imageCount < expectedScenes || videoCount < expectedScenes) {
    issues.push(
      `Scene prompt ${Math.min(imageCount, videoCount)} စုံပဲ တွေ့တယ် (${expectedScenes} စုံ လိုတယ်)။`,
    )
  } else if (imageCount > expectedScenes || videoCount > expectedScenes) {
    issues.push(
      `Scene prompt ${Math.max(imageCount, videoCount)} စုံ တွေ့တယ် (${expectedScenes} စုံ တောင်းထားတယ်)။`,
    )
  }
  if (characters.length > 0 && sheetPrompts.length !== characters.length) {
    issues.push(
      `Character sheet ${sheetPrompts.length} ခု တွေ့တယ်၊ character ${characters.length} ယောက် ရှိတယ်။`,
    )
  }
  // Per-scene background prompts are the old format: a partial set is
  // only an issue when no new-format Background Prompts section exists
  // (new-format outputs carry 0 per-scene backgrounds by design).
  const backgroundCount = prompts.filter((p) => p.background).length
  if (
    bgBlocks.length === 0 &&
    backgroundCount > 0 &&
    backgroundCount < expectedScenes
  ) {
    issues.push(
      `Background prompt ${backgroundCount} ခုပဲ တွေ့တယ် (${expectedScenes} ခု လိုတယ်)။`,
    )
  }
  if (
    backgrounds.length > 0 &&
    backgroundSheets.length > 0 &&
    backgroundSheets.length !== backgrounds.length
  ) {
    issues.push(
      `Background sheet ${backgroundSheets.length} ခု တွေ့တယ်၊ Background Map မှာ ${backgrounds.length} ခု ရှိတယ်။`,
    )
  }
  if (scenes.some((s) => s.end > totalSeconds)) {
    issues.push("Scene timestamp တစ်ခုက episode total ထက် ကျော်နေတယ်။")
  }
  const missingRecord = (
    Object.entries(storyRecord) as [keyof StoryRecord, string][]
  )
    .filter(([, value]) => !value)
    .map(([key]) => key)
  if (missingRecord.length > 0) {
    issues.push(`Story Record မှာ ${missingRecord.join(", ")} လစ်နေတယ်။`)
  }

  const usable =
    title || scenes.length > 0 || prompts.length > 0 || characters.length > 0
  if (!usable) {
    issues.push("Gemini output ကို parse လုပ်လို့မရဘူး — raw text ကို ပြထားတယ်။")
    return { episode: null, issues }
  }

  return {
    episode: {
      id: opts.id ?? `ep-${Date.now()}`,
      threadId: opts.threadId ?? "",
      title: title || storyRecord.title || "Untitled Episode",
      episodeNumber,
      genre,
      visualStyle,
      aspect,
      sceneDuration,
      totalSeconds,
      storySummary,
      characters,
      sheetPrompts,
      backgroundSheets,
      backgrounds,
      backgroundPrompts,
      location,
      scenes,
      prompts,
      continuityNote,
      hook,
      storyRecord,
      raw,
    },
    issues,
  }
}
