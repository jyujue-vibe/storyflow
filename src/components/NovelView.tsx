import { useEffect, useState } from "react"
import {
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ExportDialog } from "@/components/ExportDialog"
import {
  buildNovelMarkdown,
  buildNovelPrintHtml,
  downloadTextFile,
  novelFileName,
  openPrintWindow,
} from "@/lib/export"
import type { Novel, NovelDraft } from "@/lib/novelInstruction"

interface NovelViewProps {
  busy: boolean
  activeNovel: Novel | null
  onNewNovel: () => void
  onDeleteNovel: (id: string) => void
  /** Standalone create card only (home uses its bottom composer). */
  onGenerateDrafts: (idea: string) => void
  onRegenerateDraft: (idea: string) => void
  onGenerateEpisode1: (
    draft: NovelDraft,
    totalEpisodes: number,
    novelId?: string,
  ) => void
  onContinueNovel: (novel: Novel) => void
  /** When true (home middle): hide the standalone create card. */
  embedded?: boolean
  /** Increment to reset the draft workspace (home Reset button). */
  resetSignal?: number
  toast: {
    success: (title: string, options?: { description?: string }) => void
    error: (title: string, options?: { description?: string }) => void
  }
}

function paragraphs(textValue: string) {
  return textValue
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

/**
 * One draft + Like/Regenerate + (after Like) Short/Long + Generate
 * Episode 1. Used both for a freshly generated draft and for a draft
 * resumed from the sidebar (same saved thread, same UI).
 */
function DraftWorkspace({
  draft,
  novelId,
  idea,
  busy,
  onRegenerateDraft,
  onGenerateEpisode1,
  resetSignal,
}: {
  draft: NovelDraft
  novelId: string
  idea: string
  busy: boolean
  onRegenerateDraft: (idea: string) => void
  onGenerateEpisode1: (
    draft: NovelDraft,
    totalEpisodes: number,
    novelId?: string,
  ) => void
  resetSignal?: number
}) {
  const [liked, setLiked] = useState(false)
  const [lengthChoice, setLengthChoice] = useState<"short" | "long">("short")
  const [longCount, setLongCount] = useState("12")

  // A new draft (regenerate) or a home Reset starts the workspace over.
  useEffect(() => {
    setLiked(false)
    setLengthChoice("short")
    setLongCount("12")
  }, [draft.title, resetSignal])

  const parsedLongCount = Number.parseInt(longCount, 10)
  const longCountValid =
    Number.isFinite(parsedLongCount) && parsedLongCount >= 9
  const totalEpisodes =
    lengthChoice === "short" ? 8 : longCountValid ? parsedLongCount : 9

  return (
    <div className="flex flex-col gap-4">
      <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
        <CardHeader>
          <CardTitle className="text-base">{draft.title}</CardTitle>
          {draft.titleEn ? (
            <CardDescription>{draft.titleEn}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm leading-relaxed">{draft.premise}</p>
          {draft.premiseEn ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {draft.premiseEn}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">{draft.characters}</p>
          <p className="text-sm text-muted-foreground">{draft.tone}</p>
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="lg"
            disabled={busy || !idea}
            onClick={() => onRegenerateDraft(idea)}
          >
            Regenerate
          </Button>
          <Button
            size="lg"
            variant={liked ? "default" : "outline"}
            aria-pressed={liked}
            onClick={() => setLiked(!liked)}
          >
            {liked ? "ကြိုက်ထားပြီ" : "ကြိုက်တယ်"}
          </Button>
        </CardFooter>
      </Card>

      {liked && (
        <Card className="shrink-0 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
          <CardHeader>
            <div>
              <CardTitle>အရှည် ရွေးပါ</CardTitle>
              <CardDescription>
                Short = ၈ ပိုင်း အသေ။ Long = ၉ ပိုင်းကနေ ကြိုက်သလောက်။
                ရွေးပြီးမှ Episode generation စမယ်။
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={lengthChoice === "short" ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                aria-pressed={lengthChoice === "short"}
                onClick={() => setLengthChoice("short")}
              >
                Short · 8 episodes
              </Button>
              <Button
                variant={lengthChoice === "long" ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                aria-pressed={lengthChoice === "long"}
                onClick={() => setLengthChoice("long")}
              >
                Long · 8+ episodes
              </Button>
            </div>
            {lengthChoice === "long" && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Episode count</span>
                <Input
                  type="number"
                  min={9}
                  value={longCount}
                  onChange={(event) => setLongCount(event.target.value)}
                  className="text-base"
                  aria-label="Episode count"
                />
                {!longCountValid && (
                  <p className="text-sm text-muted-foreground">
                    Long novel အတွက် အနည်းဆုံး ၉ ပိုင်း လိုတယ်။
                  </p>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              size="lg"
              disabled={busy || (lengthChoice === "long" && !longCountValid)}
              onClick={() =>
                onGenerateEpisode1(draft, totalEpisodes, novelId)
              }
              className="shiny-btn"
            >
              <SparklesIcon />
              <span>{busy ? "Generating…" : "Generate Episode 1"}</span>
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

/**
 * Novel Writer view. Same visual language as the story creator: Card
 * spacing, lg text buttons, sm chips, gradient Continue button. Novels
 * (including episode-less drafts) live in the SIDEBAR thread list — this
 * view has no "My Novels" list anymore (#67). Drafts are saved threads,
 * so a fresh draft and a resumed draft render the same workspace.
 */
export function NovelView({
  busy,
  activeNovel,
  onNewNovel,
  onDeleteNovel,
  onGenerateDrafts,
  onRegenerateDraft,
  onGenerateEpisode1,
  onContinueNovel,
  embedded,
  resetSignal,
  toast,
}: NovelViewProps) {
  const [idea, setIdea] = useState("")
  const [readingNumber, setReadingNumber] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  // Jump to the newest episode only when the novel itself changes or it
  // gains an episode — never on plain re-renders, so reading an older
  // episode is not yanked back to the latest.
  const activeNovelId = activeNovel?.id
  const activeEpisodeCount = activeNovel?.episodes.length ?? 0
  useEffect(() => {
    if (activeNovel && activeEpisodeCount > 0) {
      setReadingNumber(
        activeNovel.episodes[activeEpisodeCount - 1].number,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNovelId, activeEpisodeCount])

  const deleteDialog = (
    <AlertDialog
      open={deleteTarget !== null}
      onOpenChange={(open) => {
        if (!open) setDeleteTarget(null)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ဝတ္ထုကို ဖျက်လိုက်မှာလား?</AlertDialogTitle>
          <AlertDialogDescription>
            ဒီဝတ္ထုနဲ့ အပိုင်းအားလုံး ပျက်သွားမယ် — ပြန်ယူလို့မရဘူး။
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>မဖျက်ဘူး</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (deleteTarget) onDeleteNovel(deleteTarget)
              setDeleteTarget(null)
            }}
          >
            ဖျက်
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  if (activeNovel && activeNovel.episodes.length > 0) {
    const hasNext = activeNovel.episodes.length < activeNovel.totalEpisodes
    const reading =
      activeNovel.episodes.find(
        (episode) => episode.number === readingNumber,
      ) ?? activeNovel.episodes[activeNovel.episodes.length - 1]
    const myanmarParagraphs = reading
      ? paragraphs(reading.myanmarText || reading.text)
      : []
    const englishParagraphs = reading
      ? paragraphs(reading.englishText)
      : []
    const bilingual = myanmarParagraphs.length > 0 && englishParagraphs.length > 0
    return (
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              Ep {activeNovel.episodes.length}/{activeNovel.totalEpisodes}
            </Badge>
            <Badge variant="secondary">{activeNovel.tone}</Badge>
          </div>
          <h2 className="text-lg font-medium">{activeNovel.title}</h2>
          {activeNovel.titleEn ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {activeNovel.titleEn}
            </p>
          ) : null}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {activeNovel.premise}
          </p>
          <div className="flex flex-wrap gap-2">
            {activeNovel.episodes.map((episode) => (
              <Button
                key={episode.number}
                variant={
                  reading?.number === episode.number ? "default" : "outline"
                }
                size="lg"
                aria-pressed={reading?.number === episode.number}
                onClick={() => setReadingNumber(episode.number)}
              >
                Ep {String(episode.number).padStart(2, "0")}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {hasNext && (
              <Button
                size="lg"
                disabled={busy}
                onClick={() => onContinueNovel(activeNovel)}
                className="bg-gradient-to-r from-[#2563eb] to-[#0c098c] text-white hover:brightness-110"
              >
                Continue → Episode{" "}
                {String(activeNovel.episodes.length + 1).padStart(2, "0")}
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={onNewNovel}>
              New novel
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
              onClick={() => setDeleteTarget(activeNovel.id)}
            >
              <Trash2Icon />
              Delete novel
            </Button>
          </div>
        </div>

        {reading && (
          <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
            <CardHeader>
              <CardTitle>
                Episode {String(reading.number).padStart(2, "0")} —{" "}
                {reading.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {bilingual ? (
                <span className="text-sm font-medium text-muted-foreground">
                  မြန်မာ
                </span>
              ) : null}
              {myanmarParagraphs.map((paragraph, index) => (
                <p key={`mm-${index}`} className="text-sm leading-relaxed sm:text-base">
                  {paragraph}
                </p>
              ))}
              {bilingual ? (
                <>
                  <span className="text-sm font-medium text-muted-foreground">
                    English
                  </span>
                  {englishParagraphs.map((paragraph, index) => (
                    <p key={`en-${index}`} className="text-sm leading-relaxed sm:text-base">
                      {paragraph}
                    </p>
                  ))}
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

        <ExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          title={activeNovel.title}
          onDownloadMd={() => {
            const filename = novelFileName(activeNovel)
            downloadTextFile(filename, buildNovelMarkdown(activeNovel))
            toast.success("Exported", { description: filename })
          }}
          onPrintPdf={() => {
            const ok = openPrintWindow(
              novelFileName(activeNovel),
              buildNovelPrintHtml(activeNovel),
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

  if (activeNovel) {
    // Episode-less draft thread: resume workspace (same UI as a fresh
    // draft). Drafts have no episodes to export, so no Export button here.
    const draft: NovelDraft = {
      title: activeNovel.title,
      titleEn: activeNovel.titleEn ?? "",
      premise: activeNovel.premise,
      premiseEn: activeNovel.premiseEn ?? "",
      characters: activeNovel.characters,
      tone: activeNovel.tone,
    }
    return (
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Draft</Badge>
            <Badge variant="secondary">{activeNovel.tone}</Badge>
          </div>
          <h2 className="text-lg font-medium">{activeNovel.title}</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="lg" onClick={onNewNovel}>
              New novel
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setDeleteTarget(activeNovel.id)}
            >
              <Trash2Icon />
              Delete draft
            </Button>
          </div>
        </div>
        <DraftWorkspace
          draft={draft}
          novelId={activeNovel.id}
          idea={activeNovel.idea ?? ""}
          busy={busy}
          onRegenerateDraft={onRegenerateDraft}
          onGenerateEpisode1={onGenerateEpisode1}
          resetSignal={resetSignal}
        />
        {deleteDialog}
      </div>
    )
  }

  if (embedded) {
    return (
      <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Idea ကို အောက် box မှာ ရိုက်ပြီး Enter နှိပ်ပါ — draft ၁ ခု
            ထွက်လာပြီး sidebar မှာ thread အနေနဲ့ သိမ်းသွားမယ်။
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card className="shrink-0 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
        <CardHeader>
          <div>
            <CardTitle>Novel Writer</CardTitle>
            <CardDescription>
              Idea ပေးပြီး draft ၁ ခု ထုတ်ပါ၊ ကြိုက်ရင် အရှည်ရွေး၊
              Short (၈ ပိုင်း) ဒါမှမဟုတ် Long (၈+ ပိုင်း) နဲ့ ဝတ္ထု ရေးပါ။
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Textarea
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="ဥပမာ — ရွာက ဆရာမလေးတစ်ယောက်နဲ့ ပျောက်နေတဲ့ ရှေးစာအုပ်တစ်အုပ်အကြောင်း ဝတ္ထု"
            className="min-h-28 text-base leading-relaxed"
            aria-label="Novel idea"
          />
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            size="lg"
            disabled={busy || !idea.trim()}
            onClick={() => onGenerateDrafts(idea.trim())}
            className="shiny-btn"
          >
            <SparklesIcon />
            <span>{busy ? "Generating…" : "Generate draft"}</span>
          </Button>
        </CardFooter>
      </Card>
      {deleteDialog}
    </div>
  )
}
