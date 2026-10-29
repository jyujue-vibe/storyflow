import { useEffect, useState } from "react"
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from "@/components/motion/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  CenterMorphModal,
  CenterMorphModalContent,
} from "@/components/motion/center-morph-modal"
import { ExportDialog } from "@/components/ExportDialog"
import {
  buildBookMarkdown,
  buildBookPrintHtml,
  bookFileName,
  downloadTextFile,
  openPrintWindow,
} from "@/lib/export"
import {
  FIXED_BOOK_CHARACTERS,
  fixedBookCharacter,
  type ChildBook,
  type CustomBookCharacter,
  type FixedBookCharacterId,
} from "@/lib/childrenBookInstruction"

interface BookViewProps {
  busy: boolean
  activeBook: ChildBook | null
  customCharacters: CustomBookCharacter[]
  bookIssues: string[]
  onNewBook: () => void
  onDeleteBook: (id: string) => void
  onSaveCustomCharacter: (
    character: Omit<CustomBookCharacter, "id">,
  ) => string
  onGenerateFixedBook: (
    characterId: FixedBookCharacterId,
    topic: string,
  ) => void
  onGenerateCustomBook: (
    character: CustomBookCharacter,
    outline: string,
  ) => void
  /** Controlled character picker (home Enter needs to read it). */
  picked: string
  onPickedChange: (id: string) => void
  /** Controlled custom-setup modal (home Enter opens it for new-custom). */
  setupOpen: boolean
  onSetupOpenChange: (open: boolean) => void
  /** When true (home middle): hide topic/outline inputs + Generate button. */
  embedded?: boolean
  /** Increment to reset local topic/outline (home Reset button). */
  resetSignal?: number
  toast: {
    success: (title: string, options?: { description?: string }) => void
    error: (title: string, options?: { description?: string }) => void
  }
}

/** Copy-to-clipboard button with a brief "Copied" state. Falls back to a
 * hidden textarea + execCommand when the Clipboard API is unavailable. */
function CopyButton({
  text,
  label = "Copy story content",
}: {
  text: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    if (!text) return
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      try {
        const area = document.createElement("textarea")
        area.value = text
        area.style.position = "fixed"
        area.style.opacity = "0"
        document.body.appendChild(area)
        area.select()
        ok = document.execCommand("copy")
        area.remove()
      } catch {
        ok = false
      }
    }
    if (!ok) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="ghost" size="sm" onClick={copy} aria-label={label}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}

/**
 * Children Book Writer view. Same visual language as the story creator:
 * Card spacing, lg text buttons, sm chips, CenterMorphModal for the custom
 * character setup (mirroring the story creator's character modal), footer
 * buttons bottom-right. Books live in the SIDEBAR thread list — this view
 * has no "My Books" list anymore (#67). Per-page sections are 3 now:
 * Story Content (Myanmar + English side by side), Learning Focus,
 * Illustration Ideas — no Image Generation Prompt.
 */
export function BookView({
  busy,
  activeBook,
  customCharacters,
  bookIssues,
  onNewBook,
  onDeleteBook,
  onSaveCustomCharacter,
  onGenerateFixedBook,
  onGenerateCustomBook,
  picked,
  onPickedChange,
  setupOpen,
  onSetupOpenChange,
  embedded,
  resetSignal,
  toast,
}: BookViewProps) {
  const [topic, setTopic] = useState("")
  const [outline, setOutline] = useState("")
  const [setupName, setSetupName] = useState("")
  const [setupGenre, setSetupGenre] = useState("")
  const [setupAge, setSetupAge] = useState("")
  const [setupAppearance, setSetupAppearance] = useState("")
  const [setupBehavior, setSetupBehavior] = useState("")
  const [setupCompanionName, setSetupCompanionName] = useState("")
  const [setupCompanionDescription, setSetupCompanionDescription] =
    useState("")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    setTopic("")
    setOutline("")
  }, [resetSignal])

  const pickedFixed = FIXED_BOOK_CHARACTERS.find(
    (character) => character.id === picked,
  )
  const pickedCustom = customCharacters.find(
    (character) => character.id === picked,
  )
  const isNewCustom = picked === "new-custom"

  function saveSetup() {
    const name = setupName.trim()
    if (!name) {
      toast.error("နာမည် ထည့်ပါ", {
        description: "Character နာမည်က မဖြစ်မနေ လိုတယ်။",
      })
      return
    }
    const id = onSaveCustomCharacter({
      name,
      genre: setupGenre.trim(),
      age: setupAge.trim(),
      appearance: setupAppearance.trim(),
      behavior: setupBehavior.trim(),
      companionName: setupCompanionName.trim(),
      companionDescription: setupCompanionDescription.trim(),
    })
    setSetupName("")
    setSetupGenre("")
    setSetupAge("")
    setSetupAppearance("")
    setSetupBehavior("")
    setSetupCompanionName("")
    setSetupCompanionDescription("")
    onSetupOpenChange(false)
    onPickedChange(id)
  }

  const setupModal = (
    <CenterMorphModal open={setupOpen} onOpenChange={onSetupOpenChange}>
      <CenterMorphModalContent
        ariaLabel="Character setup"
        ariaDescribedBy="book-setup-desc"
        className="flex flex-col gap-4 p-6 text-sm bg-popover max-w-[calc(100%-2rem)] sm:max-w-xl"
      >
        <div className="flex flex-col gap-3 pr-10">
          <h2 className="text-base leading-none font-medium">
            Character setup
          </h2>
          <p
            id="book-setup-desc"
            className="text-sm text-muted-foreground"
          >
            Character အသစ်အကြောင်း ထည့်ပါ။ Save လုပ်ရင် နောက်လည်း
            ပြန်ရွေးလို့ရမယ်။
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Name *</span>
            <Input
              value={setupName}
              onChange={(event) => setSetupName(event.target.value)}
              placeholder="ဥပမာ — Thiri"
              className="text-base"
              aria-label="Custom character name"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Genre</span>
            <Input
              value={setupGenre}
              onChange={(event) => setSetupGenre(event.target.value)}
              placeholder="ဥပမာ — manners, science, adventure"
              className="text-base"
              aria-label="Custom character genre"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Age</span>
            <Input
              value={setupAge}
              onChange={(event) => setSetupAge(event.target.value)}
              placeholder="ဥပမာ — 9 years old"
              className="text-base"
              aria-label="Custom character age"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Appearance</span>
            <Input
              value={setupAppearance}
              onChange={(event) => setSetupAppearance(event.target.value)}
              placeholder="ဥပမာ — short black hair, red shirt, blue longyi"
              className="text-base"
              aria-label="Custom character appearance"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Behavior</span>
            <Input
              value={setupBehavior}
              onChange={(event) => setSetupBehavior(event.target.value)}
              placeholder="ဥပမာ — curious, shy, loves animals"
              className="text-base"
              aria-label="Custom character behavior"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Companion name</span>
            <Input
              value={setupCompanionName}
              onChange={(event) => setSetupCompanionName(event.target.value)}
              placeholder="ဥပမာ — Mini the puppy"
              className="text-base"
              aria-label="Custom companion name"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">
              Companion description
            </span>
            <Input
              value={setupCompanionDescription}
              onChange={(event) =>
                setSetupCompanionDescription(event.target.value)
              }
              placeholder="ဥပမာ — small brown puppy, playful"
              className="text-base"
              aria-label="Custom companion description"
            />
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onSetupOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={saveSetup}>Save character</Button>
        </div>
      </CenterMorphModalContent>
    </CenterMorphModal>
  )

  const deleteDialog = (
    <AlertDialog
      open={deleteTarget !== null}
      onOpenChange={(open) => {
        if (!open) setDeleteTarget(null)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>စာအုပ်ကို ဖျက်လိုက်မှာလား?</AlertDialogTitle>
          <AlertDialogDescription>
            ဒီစာအုပ် ပျက်သွားမယ် — ပြန်ယူလို့မရဘူး။
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>မဖျက်ဘူး</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (deleteTarget) onDeleteBook(deleteTarget)
              setDeleteTarget(null)
            }}
          >
            ဖျက်
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  if (activeBook) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{activeBook.characterName}</Badge>
            <Badge variant="secondary">24 pages</Badge>
          </div>
          <h2 className="text-lg font-medium">{activeBook.title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {activeBook.topic}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={onNewBook}
            >
              New book
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setExportOpen(true)}
            >
              <DownloadIcon />
              Export
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setDeleteTarget(activeBook.id)}
            >
              <Trash2Icon />
              Delete book
            </Button>
          </div>
        </div>

        {bookIssues.length > 0 && (
          <Alert className="rounded-lg bg-card px-2.5 py-2 text-card-foreground">
            <AlertIcon />
            <AlertContent>
              <AlertTitle>
                သတိပြုစရာ ရှိတယ် — ဒါပေမဲ့ စာအုပ် ရသွားပြီ
              </AlertTitle>
              <AlertDescription>
                <ul className="flex flex-col gap-1">
                  {bookIssues.map((issue) => (
                    <li key={issue}>• {issue}</li>
                  ))}
                </ul>
              </AlertDescription>
            </AlertContent>
          </Alert>
        )}

        <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
          <CardHeader>
            <CardTitle className="text-base">Intro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed sm:text-base">
              {activeBook.intro}
            </p>
          </CardContent>
        </Card>

        {activeBook.pages.map((page) => (
          <Card
            key={page.number}
            className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]"
          >
            <CardHeader>
              <CardTitle className="text-base">Page {page.number}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Story Content</span>
                {/* #83: each language's text lives in its own bordered box,
                    so the two columns read as two distinct blocks. */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        မြန်မာ
                      </span>
                      <CopyButton text={page.storyMyanmar} />
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-3 py-2">
                      <p className="text-sm leading-relaxed sm:text-base">
                        {page.storyMyanmar || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        English
                      </span>
                      <CopyButton text={page.story} />
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-3 py-2">
                      <p className="text-sm leading-relaxed sm:text-base">
                        {page.story || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* #83: Learning Focus + Illustration Ideas side by side,
                  each in its own box with its own Copy button. */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Learning Focus</span>
                    <CopyButton
                      text={page.learningFocus}
                      label="Copy learning focus"
                    />
                  </div>
                  <div className="rounded-lg border bg-muted/30 px-3 py-2">
                    <p className="text-sm leading-relaxed">
                      {page.learningFocus || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      Illustration Ideas
                    </span>
                    <CopyButton
                      text={page.illustrationIdeas}
                      label="Copy illustration ideas"
                    />
                  </div>
                  <div className="rounded-lg border bg-muted/30 px-3 py-2">
                    <p className="text-sm leading-relaxed">
                      {page.illustrationIdeas || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {activeBook.quiz.length > 0 && (
          <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
            <CardHeader>
              <CardTitle className="text-base">Page 20 — Quiz</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {activeBook.quiz.map((item, index) => (
                <div key={index} className="flex flex-col gap-1">
                  <p className="text-sm font-medium">
                    {index + 1}. {item.question}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {item.options.map((option, optionIndex) => (
                      <li
                        key={optionIndex}
                        className="text-sm text-muted-foreground"
                      >
                        {String.fromCharCode(65 + optionIndex)}. {option}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Answer key</span>
                <p className="text-sm text-muted-foreground">
                  {activeBook.quiz
                    .map((item, index) => `${index + 1} — ${item.answer || "?"}`)
                    .join(" · ")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeBook.glossary.length > 0 && (
          <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
            <CardHeader>
              <CardTitle className="text-base">
                Page 21 — Word Helpers
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {activeBook.glossary.map((entry, index) => (
                <p key={index} className="text-sm leading-relaxed">
                  <span className="font-medium">{entry.word}</span> —{" "}
                  {entry.definition}
                </p>
              ))}
            </CardContent>
          </Card>
        )}

        {activeBook.activities.length > 0 && (
          <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
            <CardHeader>
              <CardTitle className="text-base">
                Page 22 — Notes & Fun Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1">
                {activeBook.activities.map((activity, index) => (
                  <li key={index} className="text-sm leading-relaxed">
                    • {activity}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
          <CardHeader>
            <CardTitle className="text-base">
              Page 23 — Story Summary & Key Learning Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">What We Learned</span>
              <p className="text-sm leading-relaxed">
                {activeBook.whatWeLearned}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Skills Developed</span>
              <p className="text-sm leading-relaxed">
                {activeBook.skillsDeveloped}
              </p>
            </div>
          </CardContent>
        </Card>

        <ExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          title={activeBook.title}
          onDownloadMd={() => {
            const filename = bookFileName(activeBook)
            downloadTextFile(filename, buildBookMarkdown(activeBook))
            toast.success("Exported", { description: filename })
          }}
          onPrintPdf={() => {
            const ok = openPrintWindow(
              bookFileName(activeBook),
              buildBookPrintHtml(activeBook),
            )
            if (ok) {
              toast.success("Print dialog ဖွင့်ပြီ", {
                description: "Save as PDF ကို ရွေးပါ။",
              })
            } else {
              toast.error("Popup blocked — browser က popup ခွင့်ပြုပါ။")
            }
          }}
        />

        {deleteDialog}
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card className="shrink-0 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
        <CardHeader>
          <div>
            <CardTitle>Children Book Writer</CardTitle>
            <CardDescription>
              Character ရွေးပြီး Generate နှိပ်ရင် စာအုပ် ၂၄ မျက်နှာ
              အပြည့် ထွက်မယ် — Intro + story ၁၉ မျက်နှာ + Quiz +
              Glossary + Activities + Summary။
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Character</span>
            <div className="flex flex-wrap gap-2">
              {FIXED_BOOK_CHARACTERS.map((character) => (
                <Button
                  key={character.id}
                  variant={picked === character.id ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  aria-pressed={picked === character.id}
                  onClick={() => onPickedChange(character.id)}
                >
                  {character.id} —{" "}
                  {character.id === "JJ"
                    ? "JitJit"
                    : character.id === "NL"
                      ? "Nilar"
                      : character.id === "SS"
                        ? "SueSan"
                        : "PyaeSone"}
                </Button>
              ))}
              {customCharacters.map((character) => (
                <Button
                  key={character.id}
                  variant={picked === character.id ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  aria-pressed={picked === character.id}
                  onClick={() => onPickedChange(character.id)}
                >
                  {character.name}
                </Button>
              ))}
              <Button
                variant={isNewCustom ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                aria-pressed={isNewCustom}
                onClick={() => onPickedChange("new-custom")}
              >
                + Custom
              </Button>
            </div>
          </div>

          {pickedFixed && (
            <div className="flex flex-col gap-1">
              <p className="text-sm leading-relaxed">
                {fixedBookCharacter(pickedFixed.id).lead}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {fixedBookCharacter(pickedFixed.id).companion}
              </p>
            </div>
          )}

          {pickedCustom && (
            <div className="flex flex-col gap-1">
              <p className="text-sm leading-relaxed">
                {pickedCustom.name}
                {pickedCustom.genre ? ` · ${pickedCustom.genre}` : ""}
                {pickedCustom.age ? ` · ${pickedCustom.age}` : ""}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {[pickedCustom.appearance, pickedCustom.behavior]
                  .filter(Boolean)
                  .join(" — ")}
              </p>
              {pickedCustom.companionName && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Companion: {pickedCustom.companionName}
                  {pickedCustom.companionDescription
                    ? ` — ${pickedCustom.companionDescription}`
                    : ""}
                </p>
              )}
            </div>
          )}

          {isNewCustom && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Character အသစ် ဆောက်မယ် — setup လုပ်ပြီး outline ရေးပါ။
              </p>
              <div>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => onSetupOpenChange(true)}
                >
                  Character setup
                </Button>
              </div>
            </div>
          )}

          {embedded ? (
            <p className="text-sm text-muted-foreground">
              Topic / outline ကို အောက် box မှာ ရိုက်ပြီး Enter နှိပ်ပါ။
            </p>
          ) : (
            <>
              {pickedFixed && (
                <Textarea
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="ဥပမာ — JitJit နဲ့ MelLone တို့ ပုဂံကို သွားလည်တဲ့ ခရီး"
                  className="min-h-28 text-base leading-relaxed"
                  aria-label="Book topic"
                />
              )}

              {pickedCustom && (
                <Textarea
                  value={outline}
                  onChange={(event) => setOutline(event.target.value)}
                  placeholder="ဇာတ်လမ်း outline နည်းနည်း ရေးပါ — ဘာအကြောင်း၊ ဘယ်မှာ၊ ဘာသင်ခန်းစာလဲ"
                  className="min-h-28 text-base leading-relaxed"
                  aria-label="Story outline"
                />
              )}
            </>
          )}
        </CardContent>
        {!embedded && (
          <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {pickedFixed && (
              <Button
                size="lg"
                disabled={busy || !topic.trim()}
                onClick={() =>
                  onGenerateFixedBook(pickedFixed.id, topic.trim())
                }
              >
                <SparklesIcon />
                {busy ? "Generating…" : "Generate book"}
              </Button>
            )}
            {pickedCustom && (
              <Button
                size="lg"
                disabled={busy || !outline.trim()}
                onClick={() => onGenerateCustomBook(pickedCustom, outline.trim())}
              >
                <SparklesIcon />
                {busy ? "Generating…" : "Generate book"}
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      {setupModal}
      {deleteDialog}
    </div>
  )
}
