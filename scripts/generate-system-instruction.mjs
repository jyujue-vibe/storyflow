// Generates src/lib/systemInstruction.ts from ../system-instruction.md.
// The markdown is JSON-escaped into a TS string const — never retyped by hand.
// Run: node scripts/generate-system-instruction.mjs
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const here = path.dirname(fileURLToPath(import.meta.url))
const mdPath = path.resolve(here, "../../system-instruction.md")
const outPath = path.resolve(here, "../src/lib/systemInstruction.ts")

const markdown = readFileSync(mdPath, "utf8")
const out =
  `// AUTO-GENERATED from ../system-instruction.md — do not edit by hand.\n` +
  `// Regenerate with: node scripts/generate-system-instruction.mjs\n` +
  `export const SYSTEM_INSTRUCTION = ${JSON.stringify(markdown)}\n`
writeFileSync(outPath, out)
console.log(`Wrote ${outPath} (${markdown.length} chars of markdown)`)
