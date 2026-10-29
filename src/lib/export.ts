import { groupBackgroundPrompts, type Episode } from "./parse"
import type { Novel } from "./novelInstruction"
import type { ChildBook } from "./childrenBookInstruction"

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

/** "Scene 03" for one scene, "Scenes 01–03, 05" for several. */
function sceneList(scenes: number[]): string {
  const sorted = [...new Set(scenes)].sort((a, b) => a - b)
  if (sorted.length === 0) return ""
  if (sorted.length === 1) {
    return `Scene ${String(sorted[0]).padStart(2, "0")}`
  }
  const ranges: string[] = []
  let start = sorted[0]
  let prev = sorted[0]
  const push = () => {
    ranges.push(
      start === prev
        ? String(start).padStart(2, "0")
        : `${String(start).padStart(2, "0")}–${String(prev).padStart(2, "0")}`,
    )
  }
  for (const n of sorted.slice(1)) {
    if (n === prev + 1) {
      prev = n
      continue
    }
    push()
    start = prev = n
  }
  push()
  return `Scenes ${ranges.join(", ")}`
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

  const prompts = [...(episode.prompts ?? [])].sort((a, b) => a.number - b.number)
  const scenes = episode.scenes ?? []
  // Background prompts live ONLY in the sheet section (grouped by BG, with
  // the scenes each one serves); scene blocks carry image + video only.
  // Episodes with no background prompts at all fall back to their old
  // §4 sheet prompts, so nothing is lost.
  const bgPrompts =
    episode.backgroundPrompts ?? groupBackgroundPrompts(episode.prompts ?? [])
  if (bgPrompts.length > 0) {
    const body = bgPrompts
      .map((b) => {
        const head = b.bgId ? `${b.bgId}${b.name ? ` — ${b.name}` : ""}` : b.name
        const list = sceneList(b.scenes)
        const suffix = list ? ` (${list})` : ""
        return `${hh} ${head}${suffix}\n\n${text(b.text)}`
      })
      .join("\n\n")
    parts.push(section(`${h} Background Sheet Prompts`, body))
  } else {
    const bgSheets = episode.backgroundSheets ?? []
    if (bgSheets.length > 0) {
      const body = bgSheets
        .map((s) => `${hh} ${s.bgId}\n\n${text(s.text)}`)
        .join("\n\n")
      parts.push(section(`${h} Background Sheet Prompts`, body))
    }
  }
  if (prompts.length > 0) {
    const body = prompts
      .map((p) => {
        const scene = scenes.find((s) => s.number === p.number)
        const line = scene ? text(scene.line) : ""
        const blocks = [
          line,
          `**Image:** ${text(p.image)}`,
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

/** ---- Novel + children book export (#67) ---- */

export function novelFileName(novel: Novel): string {
  return `${sanitizeFileName(novel.title)} - novel.md`
}

export function bookFileName(book: ChildBook): string {
  return `${sanitizeFileName(book.title)} - book.md`
}

function episodeParagraphs(value: string): string {
  return text(value)
}

/** Novel Markdown: draft + all episodes, Myanmar first then English. */
export function buildNovelMarkdown(novel: Novel): string {
  const parts: string[] = []
  parts.push(`# ${text(novel.title) || "Untitled novel"}\n`)
  const draftLines = [
    novel.titleEn ? `- English title: ${text(novel.titleEn)}` : "",
    text(novel.premise) ? `- Premise: ${text(novel.premise)}` : "",
    novel.premiseEn ? `- English premise: ${text(novel.premiseEn)}` : "",
    text(novel.characters) ? `- Characters: ${text(novel.characters)}` : "",
    text(novel.tone) ? `- Tone: ${text(novel.tone)}` : "",
  ].filter(Boolean)
  if (draftLines.length > 0) {
    parts.push(`## Draft\n\n${draftLines.join("\n")}\n`)
  }
  const sorted = [...novel.episodes].sort((a, b) => a.number - b.number)
  for (const episode of sorted) {
    const myanmar = episodeParagraphs(episode.myanmarText || episode.text)
    const english = episodeParagraphs(episode.englishText)
    const blocks = [
      section("### မြန်မာ", myanmar),
      section("### English", english),
    ]
      .filter(Boolean)
      .join("\n")
    parts.push(
      `## Episode ${String(episode.number).padStart(2, "0")} — ${text(episode.title) || "Untitled"}\n\n${blocks}`,
    )
  }
  return parts.filter(Boolean).join("\n")
}

/** Book Markdown: Intro + pages + endmatter. NO Image Generation Prompt. */
export function buildBookMarkdown(book: ChildBook): string {
  const parts: string[] = []
  parts.push(`# ${text(book.title) || "Untitled book"}\n`)
  parts.push(section("## Intro", text(book.intro)))
  const sorted = [...book.pages].sort((a, b) => a.number - b.number)
  for (const page of sorted) {
    const blocks = [
      section("### Story Content (Myanmar)", text(page.storyMyanmar)),
      section("### Story Content (English)", text(page.story)),
      section("### Learning Focus", text(page.learningFocus)),
      section("### Illustration Ideas", text(page.illustrationIdeas)),
    ]
      .filter(Boolean)
      .join("\n")
    parts.push(`## Page ${page.number}\n\n${blocks}`)
  }
  if (book.quiz.length > 0) {
    const body = book.quiz
      .map((item, index) => {
        const lines = [`${index + 1}. ${text(item.question)}`]
        item.options.forEach((option, optionIndex) => {
          lines.push(`   ${String.fromCharCode(65 + optionIndex)}. ${text(option)}`)
        })
        if (item.answer) lines.push(`   Answer: ${item.answer}`)
        return lines.join("\n")
      })
      .join("\n\n")
    parts.push(section("## Page 20 — Quiz", body))
  }
  if (book.glossary.length > 0) {
    const body = book.glossary
      .map((entry) => `- ${text(entry.word)}: ${text(entry.definition)}`)
      .join("\n")
    parts.push(section("## Page 21 — Word Helpers", body))
  }
  if (book.activities.length > 0) {
    const body = book.activities.map((a) => `- ${text(a)}`).join("\n")
    parts.push(section("## Page 22 — Notes & Fun Activities", body))
  }
  const summary = [
    text(book.whatWeLearned)
      ? `### What We Learned\n\n${text(book.whatWeLearned)}`
      : "",
    text(book.skillsDeveloped)
      ? `### Skills Developed\n\n${text(book.skillsDeveloped)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n")
  if (summary) {
    parts.push(`## Page 23 — Story Summary & Key Learning Outcomes\n\n${summary}\n`)
  }
  return parts.filter(Boolean).join("\n")
}

/** ---- Print-to-PDF (#67) ----
 * No PDF library is allowed (no new dependencies), so "PDF" means a clean
 * printable view in a new window: the user picks "Save as PDF" in the
 * browser print dialog. Returns false when the popup was blocked. */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function printParagraphs(value: string): string {
  return text(value)
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n")
}

function printSection(heading: string, body: string): string {
  if (!body) return ""
  return `<h3>${escapeHtml(heading)}</h3>\n${printParagraphs(body)}`
}

function printDocument(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:"Inter Display","Yati Sans","Noto Sans Myanmar",system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;line-height:1.7;color:#111}h1{font-size:1.6rem;line-height:1.3}h2{font-size:1.25rem;margin-top:2rem;border-top:1px solid #ddd;padding-top:1rem}h3{font-size:1rem;margin-top:1.25rem;color:#444}p{margin:.5rem 0}ul{padding-left:1.25rem}@media print{body{margin:0;max-width:none}}</style></head><body>${body}</body></html>`
}

export function buildNovelPrintHtml(novel: Novel): string {
  const parts: string[] = []
  parts.push(`<h1>${escapeHtml(text(novel.title) || "Untitled novel")}</h1>`)
  const draftBits = [
    novel.titleEn ? `<p>English title: ${escapeHtml(text(novel.titleEn))}</p>` : "",
    text(novel.premise) ? `<p>Premise: ${escapeHtml(text(novel.premise))}</p>` : "",
    novel.premiseEn ? `<p>English premise: ${escapeHtml(text(novel.premiseEn))}</p>` : "",
    text(novel.characters) ? `<p>Characters: ${escapeHtml(text(novel.characters))}</p>` : "",
    text(novel.tone) ? `<p>Tone: ${escapeHtml(text(novel.tone))}</p>` : "",
  ].filter(Boolean)
  if (draftBits.length > 0) parts.push(`<h2>Draft</h2>${draftBits.join("\n")}`)
  const sorted = [...novel.episodes].sort((a, b) => a.number - b.number)
  for (const episode of sorted) {
    parts.push(
      `<h2>Episode ${String(episode.number).padStart(2, "0")} — ${escapeHtml(text(episode.title) || "Untitled")}</h2>`,
      printSection("မြန်မာ", episode.myanmarText || episode.text),
      printSection("English", episode.englishText),
    )
  }
  return printDocument(novel.title, parts.filter(Boolean).join("\n"))
}

export function buildBookPrintHtml(book: ChildBook): string {
  const parts: string[] = []
  parts.push(`<h1>${escapeHtml(text(book.title) || "Untitled book")}</h1>`)
  parts.push(printSection("Intro", book.intro))
  const sorted = [...book.pages].sort((a, b) => a.number - b.number)
  for (const page of sorted) {
    parts.push(
      `<h2>Page ${page.number}</h2>`,
      printSection("Story Content (Myanmar)", page.storyMyanmar),
      printSection("Story Content (English)", page.story),
      printSection("Learning Focus", page.learningFocus),
      printSection("Illustration Ideas", page.illustrationIdeas),
    )
  }
  if (book.quiz.length > 0) {
    const items = book.quiz
      .map((item, index) => {
        const options = item.options
          .map(
            (option, optionIndex) =>
              `<li>${String.fromCharCode(65 + optionIndex)}. ${escapeHtml(text(option))}</li>`,
          )
          .join("\n")
        return `<p><strong>${index + 1}. ${escapeHtml(text(item.question))}</strong></p><ul>${options}</ul>${item.answer ? `<p>Answer: ${escapeHtml(item.answer)}</p>` : ""}`
      })
      .join("\n")
    parts.push(`<h2>Page 20 — Quiz</h2>${items}`)
  }
  if (book.glossary.length > 0) {
    const items = book.glossary
      .map(
        (entry) =>
          `<li><strong>${escapeHtml(text(entry.word))}</strong> — ${escapeHtml(text(entry.definition))}</li>`,
      )
      .join("\n")
    parts.push(`<h2>Page 21 — Word Helpers</h2><ul>${items}</ul>`)
  }
  if (book.activities.length > 0) {
    const items = book.activities
      .map((a) => `<li>${escapeHtml(text(a))}</li>`)
      .join("\n")
    parts.push(`<h2>Page 22 — Notes &amp; Fun Activities</h2><ul>${items}</ul>`)
  }
  const summary = [
    text(book.whatWeLearned)
      ? printSection("What We Learned", book.whatWeLearned)
      : "",
    text(book.skillsDeveloped)
      ? printSection("Skills Developed", book.skillsDeveloped)
      : "",
  ]
    .filter(Boolean)
    .join("\n")
  if (summary) parts.push(`<h2>Page 23 — Summary</h2>${summary}`)
  return printDocument(book.title, parts.filter(Boolean).join("\n"))
}

/** Open the printable view and trigger the browser print dialog. The user
 * picks "Save as PDF" there. Returns false if the popup was blocked. */
export function openPrintWindow(title: string, html: string): boolean {
  const win = window.open("", "_blank")
  if (!win) return false
  win.document.write(html)
  win.document.close()
  win.document.title = title
  win.focus()
  window.setTimeout(() => {
    try {
      win.print()
    } catch {
      /* print dialog unavailable — the window still shows the content */
    }
  }, 250)
  return true
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
