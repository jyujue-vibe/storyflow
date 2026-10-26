import { useEffect, useState } from "react"
import { SparklesIcon, Trash2Icon } from "lucide-react"
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
import type { Novel, NovelDraft } from "@/lib/novelInstruction"

interface NovelViewProps {
  busy: boolean
  novels: Novel[]
  activeNovel: Novel | null
  drafts: NovelDraft[]
  onSelectNovel: (id: string | null) => void
  onDeleteNovel: (id: string) => void
  onGenerateDrafts: (idea: string) => void
  onGenerateEpisode1: (draft: NovelDraft, totalEpisodes: number) => void
  onContinueNovel: (novel: Novel) => void
}

/**
 * Novel Writer view. Mirrors the story creator's visual language: Card
 * spacing, lg text buttons, sm chips, gradient Continue button. Drafts are
 * transient (not stored); novels persist in AppShell under mm3d.novels.
 */
export function NovelView({
  busy,
  novels,
  activeNovel,
  drafts,
  onSelectNovel,
  onDeleteNovel,
  onGenerateDrafts,
  onGenerateEpisode1,
  onContinueNovel,
}: NovelViewProps) {
  const [idea, setIdea] = useState("")
  const [selectedDraft, setSelectedDraft] = useState<number | null>(null)
  const [lengthChoice, setLengthChoice] = useState<"short" | "long">("short")
  const [longCount, setLongCount] = useState("12")
  const [readingNumber, setReadingNumber] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // A fresh drafts batch resets the selection + length choice.
  useEffect(() => {
    setSelectedDraft(null)
    setLengthChoice("short")
    setLongCount("12")
  }, [drafts])

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

  const parsedLongCount = Number.parseInt(longCount, 10)
  const longCountValid =
    Number.isFinite(parsedLongCount) && parsedLongCount >= 9
  const totalEpisodes =
    lengthChoice === "short" ? 8 : longCountValid ? parsedLongCount : 9
  const chosenDraft =
    selectedDraft !== null ? drafts[selectedDraft] : undefined

  if (activeNovel) {
    const hasNext = activeNovel.episodes.length < activeNovel.totalEpisodes
    const reading =
      activeNovel.episodes.find(
        (episode) => episode.number === readingNumber,
      ) ?? activeNovel.episodes[activeNovel.episodes.length - 1]
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
            <Button
              variant="outline"
              size="lg"
              onClick={() => onSelectNovel(null)}
            >
              New novel
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
              {reading.text.split(/\n\n+/).map((paragraph, index) => (
                <p key={index} className="text-sm leading-relaxed sm:text-base">
                  {paragraph}
                </p>
              ))}
            </CardContent>
          </Card>
        )}

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
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card className="shrink-0 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
        <CardHeader>
          <div>
            <CardTitle>Novel Writer</CardTitle>
            <CardDescription>
              Idea ပေးပြီး draft ၃ ခု ထုတ်ပါ၊ တစ်ခုရွေး၊ Short (၈ ပိုင်း)
              ဒါမှမဟုတ် Long (၈+ ပိုင်း) ရွေးပြီး ဝတ္ထု ရေးပါ။
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
          >
            <SparklesIcon />
            {busy ? "Generating…" : "Generate drafts"}
          </Button>
        </CardFooter>
      </Card>

      {drafts.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Draft ၃ ခု — တစ်ခုရွေးပါ</h2>
          {drafts.map((draft, index) => (
            <Card
              key={index}
              className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]"
            >
              <CardHeader>
                <CardTitle className="text-base">{draft.title}</CardTitle>
                <CardDescription>{draft.tone}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-sm leading-relaxed">{draft.premise}</p>
                <p className="text-sm text-muted-foreground">
                  {draft.characters}
                </p>
              </CardContent>
              <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  size="lg"
                  variant={selectedDraft === index ? "default" : "outline"}
                  aria-pressed={selectedDraft === index}
                  onClick={() =>
                    setSelectedDraft(selectedDraft === index ? null : index)
                  }
                >
                  {selectedDraft === index ? "ရွေးထားပြီ" : "ဒါကို ရွေး"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {chosenDraft && (
        <Card className="shrink-0 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
          <CardHeader>
            <div>
              <CardTitle>အရှည် ရွေးပါ</CardTitle>
              <CardDescription>
                Short = ၈ ပိုင်း အသေ။ Long = ၉ ပိုင်းကနေ ကြိုက်သလောက်။
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
              onClick={() => onGenerateEpisode1(chosenDraft, totalEpisodes)}
            >
              <SparklesIcon />
              {busy ? "Generating…" : "Generate Episode 1"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {novels.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">My Novels</h2>
          {novels.map((novel) => (
            <div key={novel.id} className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                className="min-w-0 flex-1 justify-start"
                onClick={() => onSelectNovel(novel.id)}
              >
                <span className="truncate">
                  {novel.title} · Ep {novel.episodes.length}/
                  {novel.totalEpisodes}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${novel.title}`}
                onClick={() => setDeleteTarget(novel.id)}
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
        </div>
      )}

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
    </div>
  )
}
