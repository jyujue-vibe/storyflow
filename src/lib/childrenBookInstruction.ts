// Children Book Writer instructions + parsers. NEW file (2026-10-26,
// multi-mode expansion) — the episode builder's systemInstruction.ts is
// generated and must never be hand-edited, so book prompts live here.
//
// Source: the "Marvelo Book Writer" Drive folder — one shared 6-section
// "Storybook Requirements Specification" template (only §1 characters differ
// per series) plus 17 sample books. The four fixed characters below are
// JJ-approved templates: their cast, visuals, and story engines are locked.

export const CHILDREN_BOOK_INSTRUCTION = `You are StoryFlow's children book writer. You write picture books for children aged 6 to 10, in English, with simple, clear, age-appropriate vocabulary. Never use overly complex words or textbook-style explanations. Never write cheesy or lame jokes, silly slapstick, or anything that trivializes history. Facts and lessons are woven directly into the story dialogue and narrative — never isolated into separate textbook-style blurbs.

Page rules (hard):
- The book is 24 pages: an Intro page, story pages 1-19, then Quiz, Word Helpers, Activities, and Summary pages.
- The Intro states the purpose of the story and an overview of its themes. It is NOT the start of the narrative.
- Every story page has Story Content in BOTH languages: a Myanmar version AND an English version of the same 1-3 short sentences (maximum 4 lines each), with engaging dialogue and sound effects (Whoosh!, Zoom!, Vroom!). Vary line lengths naturally — some pages get just 1-2 punchy lines — so the rhythm feels comfortable and leaves ample space for illustrations.
- Myanmar Story Content must read like natural spoken Burmese for a child: short sentences, warm spoken rhythm, everyday words. Never literal word-for-word translation, never stiff machine-translation style. Technical terms and names may stay in English.
- Every story page has a Learning Focus of EXACTLY 1 sentence summarizing the core educational takeaway.
- Every story page has Illustration Ideas (visual composition for artists: framing, characters, actions, character visual descriptions, setting, lighting, mood, cartoon picture book art style). There is NO separate image prompt section — Illustration Ideas carries the visuals.
- Quiz page: 4 multiple-choice questions testing story knowledge, 4 options each (A, B, C, D) plus a complete Answer Key.
- Word Helpers / Glossary page: kid-friendly definitions of key terms. STRICT RULE: glossary words must come ONLY from the Story Content text — never from Learning Focus or Illustration Ideas.
- Notes & Fun Activities page: interactive, hands-on activities, drawing prompts, or explorer challenges for young readers.
- Story Summary & Key Learning Outcomes page: section 1 "What We Learned" (key educational takeaways) and section 2 "Skills Developed" (critical thinking, cultural respect, stewardship).

Output layout (exact — use these headers, in this order, nothing else):

TITLE: <book title>
INTRO: <purpose + theme overview, NOT the story start>
PAGE 1
Story Content (Myanmar): <1-3 short sentences, natural spoken Burmese>
Story Content (English): <the same 1-3 short sentences, simple English>
Learning Focus: <exactly 1 sentence>
Illustration Ideas: <composition: framing, characters, actions>
PAGE 2
Story Content (Myanmar): ...
Story Content (English): ...
Learning Focus: ...
Illustration Ideas: ...
(continue through PAGE 19)
QUIZ
1. <question>
A. <option>
B. <option>
C. <option>
D. <option>
Answer: <letter>
(4 questions total)
GLOSSARY
<Word>: <kid-friendly definition>
(one line per word)
ACTIVITIES
- <activity>
(one per line)
SUMMARY
What We Learned: <key educational takeaways>
Skills Developed: <skills>
`

export type FixedBookCharacterId = "JJ" | "NL" | "SS" | "PS"

export interface FixedBookCharacter {
  id: FixedBookCharacterId
  shortLabel: string
  lead: string
  companion: string
  /** Locked visual descriptions, used verbatim in image prompts. */
  visual: string
  /** Locked story engine for this series. */
  engine: string
  /** Extra per-series rules (JJ diary page, etc.). */
  extras: string
}

export const FIXED_BOOK_CHARACTERS: FixedBookCharacter[] = [
  {
    id: "JJ",
    shortLabel: "JJ — JitJit + MelLone",
    lead: "JitJit: a cheerful, curious 10-year-old girl.",
    companion:
      "MelLone: her friendly, playful, mischievous travel partner — a Myanmar snub-nosed monkey.",
    visual:
      "JitJit has long dark hair with bangs, big dark eyes, a purple tee with a white owl-and-star graphic, teal-blue wide pants, and cream shoes. MelLone has black fur, a pink face, ears, palms and soles, huge round black eyes, a yellow neckerchief, and a long curly tail.",
    engine:
      "Travel/place discovery: each story visits a real place or meets a real animal, learning one thing per page through the pair's cheerful dialogue. Tone is whimsical, warm, and lighthearted; information density stays light and fun — never wiki-overload. Conservation lessons, site rules, and Do's & Don'ts are introduced naturally near the end of the on-site visit, before heading home.",
    extras:
      "Page 19's Story Content is JitJit's actual handwritten Travel Diary Entry — a scrapbook summary of facts, sketches, and rules from the trip (page 18 is back home in their cozy bedroom, preparing to write it).",
  },
  {
    id: "NL",
    shortLabel: "NL — Nilar + Thuta",
    lead: "Nilar: a kind, gentle, polite, friendly 9-year-old Burmese girl.",
    companion:
      "Thuta: her friendly, wise, calm partner — a Myanmar owl.",
    visual:
      "Nilar has black hair in a top bun with bangs, yellow thanaka cheek circles, a pink collared blouse, a green htamein, and yellow flip-flops. Thuta is a grey-blue owl with a white heart-shaped chest patch, big blue eyes, and a yellow beak and feet.",
    engine:
      "A traditional Myanmar object, game, or season is explained by Thuta and/or Grandma through natural, cheerful dialogue: the child meets it in everyday life, learns how it works and why it matters, then applies or shares it warmly. The lesson is cultural heritage pride — appreciating and caring for Myanmar traditions.",
    extras: "",
  },
  {
    id: "SS",
    shortLabel: "SS — SueSan + Max",
    lead: "SueSan: a 9-year-old boy — a thinker, calm and logical, nerdy, inquisitive, quietly confident, with glasses; he likes science, inventions, and health topics.",
    companion:
      "Max: his friendly robot sidekick with a square body that has a visible front door for storing useful tools (magnifying glass, tablet, map, book).",
    visual:
      "SueSan has messy curly black hair, big round white-framed glasses, a blue hoodie with white drawstrings, khaki cargo pants, and black sneakers with green stripes and white toes. Max is a white robot with a rectangular screen head (black face, light-blue oval eyes and smile), a white box torso, black arms with white cuffs, black legs, and white feet.",
    engine:
      "A science or health question drives the story: SueSan wonders, Max explains one idea per page in dialogue (often with a tool or a fun demonstration), and each page's fact builds toward a warm recap. Topics are science and health in everyday life — how things work, how bodies work, how nature works.",
    extras: "",
  },
  {
    id: "PS",
    shortLabel: "PS — PyaeSone + Kaung Mon",
    lead: "PyaeSone: a kind, polite, thoughtful 9-year-old boy from Yangon — the steady model and teacher of the pair.",
    companion:
      "Kaung Mon: a talking Burmese cat — impulsive, mischievous, playful — who learns by messing up.",
    visual:
      "PyaeSone has short black hair, yellow thanaka cheek circles, a white mandarin-collar shirt, black pants with white side stripes, and black flip-flops. Kaung Mon is a Siamese/sable-brown cat (cream-tan body, dark brown points, huge yellow-ringed black eyes) wearing a cream mandarin shirt and orange baggy pants, standing on his hind legs.",
    engine:
      "CHARACTER-FLAW engine, NOT a fact engine: Kaung Mon's flaw (impulsiveness, pretending to know, or fear of admitting he does not know) causes 2-3 escalating messes. PyaeSone corrects him kindly — he explains the feeling and never shames — and elders show the right way. Kaung Mon then PRACTICES the right behavior and succeeds, ending proud or forgiven, and the lesson is restated. Lessons are social-emotional and manners: honesty, asking permission, respecting house rules, please and thank you, and 'I don't know' is brave. Myanmar culture (food, homes, hospitality, longyi/htamein) is the SETTING, not the lesson topic — except when tradition-knowledge itself is Kaung Mon's flaw.",
    extras: "",
  },
]

export function fixedBookCharacter(
  id: FixedBookCharacterId,
): FixedBookCharacter {
  return FIXED_BOOK_CHARACTERS.find((character) => character.id === id)!
}

export interface CustomBookCharacter {
  id: string
  name: string
  genre: string
  age: string
  appearance: string
  behavior: string
  companionName: string
  companionDescription: string
}

export interface BookPage {
  number: number
  /** English Story Content (the legacy field; old books only have this). */
  story: string
  /** Myanmar Story Content. Empty on old books that only have English. */
  storyMyanmar: string
  learningFocus: string
  illustrationIdeas: string
}

export interface QuizQuestion {
  question: string
  options: string[]
  answer: string
}

export interface GlossaryEntry {
  word: string
  definition: string
}

export interface ChildBook {
  id: string
  title: string
  characterId: string
  characterName: string
  topic: string
  intro: string
  pages: BookPage[]
  quiz: QuizQuestion[]
  glossary: GlossaryEntry[]
  activities: string[]
  whatWeLearned: string
  skillsDeveloped: string
  createdAt: number
}

function fixedCharacterBlock(character: FixedBookCharacter): string {
  const extras = character.extras ? `\nExtra rules: ${character.extras}` : ""
  return `Characters (use EXACTLY — same names, looks, outfits, and behaviour on every page):\n- Lead: ${character.lead}\n- Companion: ${character.companion}\nVisual descriptions (use these in every Illustration Ideas block): ${character.visual}\nStory engine: ${character.engine}${extras}`
}

export function buildFixedBookPrompt(
  character: FixedBookCharacter,
  topic: string,
): string {
  return `Children's picture book တစ်အုပ် ရေးပေးပါ။\nTopic: ${topic}\n${fixedCharacterBlock(character)}\nOutput layout အတိုင်း အတိအကျ ရေးပါ — Intro + story စာမျက်နှာ ၁၉ ခု + Quiz + Glossary + Activities + Summary။`
}

export function buildCustomBookPrompt(
  character: CustomBookCharacter,
  outline: string,
): string {
  const parts = [
    `Children's picture book တစ်အုပ် ရေးပေးပါ။`,
    `Characters (use EXACTLY — same names, looks, outfits, and behaviour on every page):`,
    `- Lead: ${character.name}${character.age ? `, ${character.age}` : ""}${character.appearance ? ` — ${character.appearance}` : ""}${character.behavior ? ` — ${character.behavior}` : ""}`,
  ]
  if (character.companionName) {
    parts.push(
      `- Companion: ${character.companionName}${character.companionDescription ? ` — ${character.companionDescription}` : ""}`,
    )
  }
  if (character.genre) {
    parts.push(`Genre: ${character.genre}`)
  }
  parts.push(
    `Story outline (follow this story — do not invent a different one): ${outline}`,
    `Story engine: follow the genre and outline above. Each story page teaches one thing through natural, cheerful dialogue, and the book ends warm with the lesson restated.`,
    `Output layout အတိုင်း အတိအကျ ရေးပါ — Intro + story စာမျက်နှာ ၁၉ ခု + Quiz + Glossary + Activities + Summary။`,
  )
  return parts.join("\n")
}

function extractLabeledField(block: string, label: string): string {
  const lines = block.split("\n")
  const start = lines.findIndex((line) =>
    new RegExp(`^${label}:`, "i").test(line.trim()),
  )
  if (start === -1) return ""
  const first = lines[start]
    .trim()
    .replace(new RegExp(`^${label}:`, "i"), "")
    .trim()
  const following: string[] = []
  for (let i = start + 1; i < lines.length; i++) {
    // Stop at the next labeled line — including parenthesized labels like
    // "Story Content (English):", which the old pattern missed (it would
    // swallow the English block into the Myanmar field).
    if (/^[A-Za-z][A-Za-z /&()]*:/.test(lines[i].trim())) break
    following.push(lines[i])
  }
  return [first, ...following].join("\n").trim()
}

function sectionAfter(text: string, header: RegExp): string {
  const match = text.match(header)
  if (!match || match.index === undefined) return ""
  const rest = text.slice(match.index + match[0].length)
  // Cut at the next top-level header.
  const next = rest.search(
    /^(TITLE|INTRO|PAGE \d+|QUIZ|GLOSSARY|ACTIVITIES|SUMMARY):?$/im,
  )
  return (next === -1 ? rest : rest.slice(0, next)).trim()
}

export interface ParsedBook {
  title: string
  intro: string
  pages: BookPage[]
  quiz: QuizQuestion[]
  glossary: GlossaryEntry[]
  activities: string[]
  whatWeLearned: string
  skillsDeveloped: string
}

/** Parse the strict book layout. Tolerant like the episode parser: returns
 * whatever parsed, plus issues for missing pieces. Returns null only when
 * there is no intro AND no story pages at all. */
export function parseChildBook(text: string): {
  book: ParsedBook | null
  issues: string[]
} {
  const issues: string[] = []
  const title = extractLabeledField(text, "TITLE")
  const introBlock = sectionAfter(text, /^INTRO:/im)
  const intro = introBlock
    .split(/^PAGE \d+/im)[0]
    .trim()
  const pages: BookPage[] = []
  const pageParts = text.split(/^PAGE\s+(\d+)\s*$/im)
  // split() with a capture group yields [before, num, body, num, body, ...].
  for (let i = 1; i + 1 < pageParts.length; i += 2) {
    const number = Number(pageParts[i])
    const body = pageParts[i + 1]
    if (!Number.isFinite(number) || number < 1 || number > 19) continue
    // Stop a page body at the next section header (QUIZ etc.).
    const cleanBody = body
      .split(/^(QUIZ|GLOSSARY|ACTIVITIES|SUMMARY)\b/im)[0]
      .trim()
    // New bilingual layout first; old single-language books fall back to
    // the plain "Story Content" label (English). A stray Image Generation
    // Prompt section from an old output is ignored, never stored.
    const storyMyanmar = extractLabeledField(
      cleanBody,
      "Story Content \\(Myanmar\\)",
    )
    const storyEnglish = extractLabeledField(
      cleanBody,
      "Story Content \\(English\\)",
    )
    const storyLegacy = storyEnglish
      ? ""
      : extractLabeledField(cleanBody, "Story Content")
    pages.push({
      number,
      story: storyEnglish || storyLegacy,
      storyMyanmar,
      learningFocus: extractLabeledField(cleanBody, "Learning Focus"),
      illustrationIdeas: extractLabeledField(cleanBody, "Illustration Ideas"),
    })
  }
  pages.sort((a, b) => a.number - b.number)

  const quiz: QuizQuestion[] = []
  const quizBlock = sectionAfter(text, /^QUIZ\b/im)
  if (quizBlock) {
    const questionParts = quizBlock.split(/^\d+\.\s+/m).slice(1)
    for (const part of questionParts) {
      const lines = part.split("\n").map((line) => line.trim())
      const question = lines[0] ?? ""
      const options: string[] = []
      let answer = ""
      for (const line of lines.slice(1)) {
        const optionMatch = line.match(/^([A-D])\.\s*(.+)$/)
        if (optionMatch) {
          options.push(optionMatch[2].trim())
          continue
        }
        const answerMatch = line.match(/^Answer:\s*([A-D])/i)
        if (answerMatch) answer = answerMatch[1].toUpperCase()
      }
      if (question) quiz.push({ question, options, answer })
    }
  }

  const glossary: GlossaryEntry[] = []
  const glossaryBlock = sectionAfter(text, /^GLOSSARY\b/im)
  if (glossaryBlock) {
    for (const line of glossaryBlock.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const sep = trimmed.indexOf(":")
      if (sep > 0) {
        glossary.push({
          word: trimmed.slice(0, sep).trim(),
          definition: trimmed.slice(sep + 1).trim(),
        })
      }
    }
  }

  const activities: string[] = []
  const activitiesBlock = sectionAfter(text, /^ACTIVITIES\b/im)
  if (activitiesBlock) {
    for (const line of activitiesBlock.split("\n")) {
      const trimmed = line.trim().replace(/^[-•]\s*/, "")
      if (trimmed) activities.push(trimmed)
    }
  }

  const summaryBlock = sectionAfter(text, /^SUMMARY\b/im)
  const whatWeLearned = extractLabeledField(summaryBlock, "What We Learned")
  const skillsDeveloped = extractLabeledField(summaryBlock, "Skills Developed")

  if (!intro && pages.length === 0) {
    return { book: null, issues: ["Book output ကို parse လုပ်လို့မရဘူး။"] }
  }
  if (!title) issues.push("Title မပါဘူး။")
  if (!intro) issues.push("Intro မပါဘူး။")
  if (pages.length < 19) {
    issues.push(`Story စာမျက်နှာ ${pages.length} ခုပဲ ရတယ် (၁၉ ခု လိုတယ်)။`)
  }
  for (const page of pages) {
    if (!page.story && !page.storyMyanmar) issues.push(`Page ${page.number} မှာ Story Content မပါဘူး။`)
    if (!page.learningFocus) {
      issues.push(`Page ${page.number} မှာ Learning Focus မပါဘူး။`)
    }
  }
  if (quiz.length < 4) issues.push(`Quiz မေးခွန်း ${quiz.length} ခုပဲ ရတယ် (၄ ခု လိုတယ်)။`)
  if (glossary.length === 0) issues.push("Glossary မပါဘူး။")
  if (activities.length === 0) issues.push("Activities မပါဘူး။")
  if (!whatWeLearned || !skillsDeveloped) {
    issues.push("Summary (What We Learned / Skills Developed) မပြည့်စုံဘူး။")
  }

  return {
    book: {
      title,
      intro,
      pages,
      quiz,
      glossary,
      activities,
      whatWeLearned,
      skillsDeveloped,
    },
    issues,
  }
}
