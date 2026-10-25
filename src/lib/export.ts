import type { Episode } from "./parse"

/**
 * Export an episode (or a whole story thread) as one Markdown file, so JJ
 * can take the full prompt package into Google Flow instead of copying one
 * prompt at a time. Pure functions, except downloadTextFile (browser only).
 */

/** Strip characters illegal in file names on Windows/macOS/Linux. */
export function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100)
  return cleaned || "storyflow-export"
}

function episodeNo(episode: Episode): string {
  return String(episode.episodeNumber).padStart(2, "0")
}

export function episodeFileName(episode: Episode): string {
  return `${sanitizeFileName(episode.title)} - Episode ${episodeNo(episode)}.md`
}

export function storyFileName(title: string): string {
  return `${sanitizeFileName(title)} - all episodes.md`
}

function mmss(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

function text(value: string | null | undefined): string {
  return (value ?? "").trim()
}

/** One section: empty body renders nothing, so partial episodes stay clean. */
function section(heading: string, body: string): string {
  return body ? `${heading}\n\n${body}\n` : ""
}

function episodeMeta(episode: Episode): string {
  const parts: string[] = []
  if (text(episode.genre)) parts.push(`Genre: ${text(episode.genre)}`)
  if (text(episode.visualStyle)) parts.push(`Style: ${text(episode.visualStyle)}`)
  if (text(episode.aspect)) parts.push(`Ratio: ${text(episode.aspect)}`)
  const count = episode.prompts?.length || episode.scenes?.length || 0
  if (count > 0 && episode.sceneDuration > 0) {
    parts.push(
      `${count} scenes × ${episode.sceneDuration}s = ${episode.totalSeconds}s`,
    )
  }
  if (text(episode.location)) parts.push(`Location: ${text(episode.location)}`)
  return parts.join(" · ")
}

/** The episode's sections. `level` is the section heading depth (2 for a
 * single-episode file, 3 when nested under an episode header in a story). */
function episodeSections(episode: Episode, level: number): string {
  const h = "#".repeat(level)
  const hh = "#".repeat(level + 1)
  const parts: string[] = []

  parts.push(section(`${h} Story Summary`, text(episode.storySummary)))

  const characters = episode.characters ?? []
  if (characters.length > 0) {
    const bible = characters
      .map((c) => {
        const lines: string[] = []
        if (text(c.transliteration))
          lines.push(`Transliteration: ${text(c.transliteration)}`)
        if (c.age !== null && c.age !== undefined) lines.push(`Age: ${c.age}`)
        if (text(c.role)) lines.push(`Role: ${text(c.role)}`)
        if (text(c.description)) lines.push(text(c.description))
        return `${hh} ${c.id} — ${c.name}\n\n${lines.join("\n")}`
      })
      .join("\n\n")
    parts.push(section(`${h} Character Bible`, bible))
  }

  const sheets = episode.sheetPrompts ?? []
  if (sheets.length > 0) {
    const byId = new Map(characters.map((c) => [c.id, c.name]))
    const body = sheets
      .map((s) => {
        const name = byId.get(s.charId)
        const head = name ? `${s.charId} — ${name}` : s.charId
        return `${hh} ${head}\n\n${text(s.text)}`
      })
      .join("\n\n")
    parts.push(section(`${h} Character Sheet Image Prompts`, body))
  }

  const backgrounds = episode.backgrounds ?? []
  if (backgrounds.length > 0) {
    const body = backgrounds
      .map((b) => `${hh} ${b.id}\n\n${text(b.text)}`)
      .join("\n\n")
    parts.push(section(`${h} Backgrounds`, body))
  }

  const bgSheets = episode.backgroundSheets ?? []
  if (bgSheets.length > 0) {
    const body = bgSheets
      .map((s) => `${hh} ${s.bgId}\n\n${text(s.text)}`)
      .join("\n\n")
    parts.push(section(`${h} Background Sheet Image Prompts`, body))
  }

  const prompts = [...(episode.prompts ?? [])].sort((a, b) => a.number - b.number)
  const scenes = episode.scenes ?? []
  if (prompts.length > 0) {
    const body = prompts
      .map((p) => {
        const scene = scenes.find((s) => s.number === p.number)
        const line = scene ? text(scene.line) : ""
        const blocks = [
          line,
          `**Image:** ${text(p.image)}`,
          `**Background:** ${text(p.background)}`,
          `**Video:** ${text(p.video)}`,
        ]
          .filter(Boolean)
          .join("\n\n")
        return `${hh} Scene ${String(p.number).padStart(2, "0")} (${mmss(p.start)}–${mmss(p.end)})\n\n${blocks}`
      })
      .join("\n\n")
    parts.push(section(`${h} Scene Prompts`, body))
  } else if (scenes.length > 0) {
    const body = [...scenes]
      .sort((a, b) => a.number - b.number)
      .map(
        (s) =>
          `${hh} Scene ${String(s.number).padStart(2, "0")} (${mmss(s.start)}–${mmss(s.end)})\n\n${text(s.line)}`,
      )
      .join("\n\n")
    parts.push(section(`${h} Scenes`, body))
  }

  parts.push(section(`${h} Continuity Note`, text(episode.continuityNote)))
  parts.push(section(`${h} Next Episode Hook`, text(episode.hook)))

  const record = episode.storyRecord
  if (record) {
    const fields: [string, string][] = [
      ["Title", text(record.title)],
      ["Genre", text(record.genre)],
      ["Premise", text(record.premise)],
      ["Conflict", text(record.conflict)],
      ["Turning point", text(record.turningPoint)],
      ["Ending type", text(record.endingType)],
    ]
    const body = fields
      .filter(([, value]) => value)
      .map(([label, value]) => `- ${label}: ${value}`)
      .join("\n")
    parts.push(section(`${h} Story Record`, body))
  }

  return parts.filter(Boolean).join("\n")
}

export function buildEpisodeMarkdown(episode: Episode): string {
  const meta = episodeMeta(episode)
  const head = `# ${text(episode.title) || "Untitled story"}\n\nEpisode ${episodeNo(episode)}${meta ? `\n\n${meta}` : ""}\n`
  return `${head}\n${episodeSections(episode, 2)}`
}

export function buildStoryMarkdown(title: string, episodes: Episode[]): string {
  const sorted = [...episodes].sort((a, b) => a.episodeNumber - b.episodeNumber)
  const bodies = sorted.map((episode) => {
    const meta = episodeMeta(episode)
    const head = `## Episode ${episodeNo(episode)} — ${text(episode.title) || "Untitled"}${meta ? `\n\n${meta}` : ""}\n`
    return `${head}\n${episodeSections(episode, 3)}`
  })
  return `# ${text(title) || "Untitled story"}\n\n${bodies.join("\n")}`
}

/** Trigger a plain-text file download in the browser (no server needed). */
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
