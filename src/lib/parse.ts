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
  video: string
  start: number
  end: number
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
  sceneDuration?: number
  episodeNumber?: number
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

function parsePlan(
  section: string,
  duration: number,
): { location: string; scenes: EpisodeScene[] } {
  const location = firstLineValue(section, /Location\s*[:：]\s*(.+)/i)
  const lines = section.split("\n")
  const scenes: EpisodeScene[] = []
  for (const line of lines) {
    const match = line.match(/Scene\s+0?(\d{1,2})\b/i)
    if (!match) continue
    const number = parseInt(match[1], 10)
    if (number < 1 || number > 10) continue
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
        scenes: numbered.slice(0, 10).map((text, index) => ({
          number: index + 1,
          line: text,
          start: index * duration,
          end: (index + 1) * duration,
        })),
      }
    }
  }
  return { location, scenes }
}

function parsePrompts(section: string, duration: number): ScenePrompt[] {
  const header = /(?:🎨|🎬)?\s*(IMAGE|VIDEO)\s+PROMPT\s+0?(\d{1,2})/gi
  const matches = [...section.matchAll(header)]
  const byNumber = new Map<number, { image: string; video: string }>()
  matches.forEach((match, index) => {
    const number = parseInt(match[2], 10)
    if (number < 1 || number > 10) return
    const chunkStart = (match.index ?? 0) + match[0].length
    const chunkEnd = matches[index + 1]?.index ?? section.length
    const rawChunk = section.slice(chunkStart, chunkEnd)
    let text = stripFences(rawChunk)
    // Drop a leading timestamp-only line ("00:00–00:08" or "(00:00–00:08)").
    text = text
      .replace(
        /^\(?\s*\d{1,2}:\d{2}\s*[–—-]\s*\d{1,2}:\d{2}\s*\)?\s*[:：\-–—]?\s*\n?/,
        "",
      )
      .trim()
    const entry = byNumber.get(number) ?? { image: "", video: "" }
    if (match[1].toUpperCase() === "IMAGE") entry.image = text
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
        image: entry.image,
        video: entry.video,
        start: range ? mmssToSeconds(range[1]) : (number - 1) * duration,
        end: range ? mmssToSeconds(range[2]) : number * duration,
      }
    })
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
  const totalSeconds = totalMatch
    ? parseInt(totalMatch[3], 10)
    : 10 * sceneDuration

  // §2 — Story Summary
  const storySummary = stripHeadingLines(summarySection, [/Story Summary/i])

  // §3 — Character Bible
  const characters = parseCharacters(bibleSection)

  // §4 — Character Sheet Prompts
  const sheetPrompts = parseSheets(sheetSection, characters)

  // §5 — Scene Continuity Plan
  const { location, scenes } = parsePlan(planSection, sceneDuration)

  // §6 — Scene Prompts
  const prompts = parsePrompts(promptsSection, sceneDuration)

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
  if (scenes.length < 10) {
    issues.push(`Continuity plan မှာ scene ${scenes.length} ခုပဲ တွေ့တယ် (10 ခု လိုတယ်)။`)
  }
  const imageCount = prompts.filter((p) => p.image).length
  const videoCount = prompts.filter((p) => p.video).length
  if (imageCount !== videoCount) {
    issues.push(
      `Prompt အရေအတွက် မညီဘူး — image ${imageCount} ခု၊ video ${videoCount} ခု။`,
    )
  }
  if (imageCount < 10 || videoCount < 10) {
    issues.push(
      `Scene prompt ${Math.min(imageCount, videoCount)} စုံပဲ တွေ့တယ် (10 စုံ လိုတယ်)။`,
    )
  }
  if (characters.length > 0 && sheetPrompts.length !== characters.length) {
    issues.push(
      `Character sheet ${sheetPrompts.length} ခု တွေ့တယ်၊ character ${characters.length} ယောက် ရှိတယ်။`,
    )
  }
  if (scenes.some((s) => s.end > 10 * sceneDuration)) {
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
