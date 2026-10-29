import type { ReactNode } from "react"
import {
  BookHeartIcon,
  BookOpenIcon,
  ClapperboardIcon,
  FilmIcon,
  RotateCcwIcon,
  ShuffleIcon,
  SparklesIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

export type HomeMode = "story" | "novel" | "book"

interface HomeViewProps {
  selectedMode: HomeMode
  onSelectMode: (mode: HomeMode) => void
  /** Mode-specific settings for the middle area (composed by AppShell). */
  middle: ReactNode
  /** Key warning alert, or null when a key is present. */
  keyAlert: ReactNode | null
  idea: string
  onIdeaChange: (value: string) => void
  onReset: () => void
  onRandom: () => void
  onEnter: () => void
  busy: boolean
  /** #79: while the player bar shows, the composer lifts above it. */
  generationBarVisible?: boolean
}

const MODE_CARDS: {
  id: HomeMode | "documentary"
  title: string
  description: string
  icon: ReactNode
  gradient: string
  disabled?: boolean
}[] = [
  {
    id: "story",
    title: "Story Creator",
    description: "Idea တစ်ကြောင်းကနေ ၁၀ scene ပါ episode package တစ်ခု။",
    icon: <FilmIcon className="size-6" />,
    gradient: "from-blue-500/40 via-blue-500/10 to-transparent",
  },
  {
    id: "novel",
    title: "Novel Writer",
    description: "Draft ၁ ခုကနေ အပိုင်းဆက် ဝတ္ထုတစ်အုပ် — မြန်မာ + English။",
    icon: <BookOpenIcon className="size-6" />,
    gradient: "from-orange-500/40 via-orange-500/10 to-transparent",
  },
  {
    id: "book",
    title: "Children Book Writer",
    description: "ကလေးစာအုပ် ၂၄ မျက်နှာ — မြန်မာ + English side by side။",
    icon: <BookHeartIcon className="size-6" />,
    gradient: "from-fuchsia-500/40 via-fuchsia-500/10 to-transparent",
  },
  {
    id: "documentary",
    title: "Documentary Explainer",
    description: "မကြာခင် လာမယ်။",
    icon: <ClapperboardIcon className="size-6" />,
    gradient: "from-teal-500/40 via-teal-500/10 to-transparent",
    disabled: true,
  },
]

/**
 * Home page (#67): the new-item create page, a full page — NOT a modal.
 * Welcome heading + 4 mode cards on top, the selected mode's settings in
 * the middle, and a bottom-fixed composer (Instruction/Description) with
 * Random on the left and Reset + Generate on the right. Generation starts
 * ONLY on Generate. Same visual language as the rest of the app: Card
 * spacing, lg text buttons, sm chips, 14px button radius.
 */
export function HomeView({
  selectedMode,
  onSelectMode,
  middle,
  keyAlert,
  idea,
  onIdeaChange,
  onReset,
  onRandom,
  onEnter,
  busy,
  generationBarVisible = false,
}: HomeViewProps) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-xl font-medium sm:text-2xl">
          Welcome to StoryFlow.
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Idea တစ်ကြောင်းကနေ episode၊ ဝတ္ထု၊ ကလေးစာအုပ် ဖန်တီးပါ။
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MODE_CARDS.map((card) => {
          const selected =
            !card.disabled && (card.id as HomeMode) === selectedMode
          return (
            <button
              key={card.id}
              type="button"
              disabled={card.disabled}
              aria-pressed={selected}
              onClick={() => {
                if (!card.disabled) onSelectMode(card.id as HomeMode)
              }}
              className="min-w-0 text-left disabled:cursor-not-allowed"
            >
              <Card
                className={`flex h-full flex-col overflow-hidden pt-0 pb-(--card-spacing) transition-shadow [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)] ${
                  selected
                    ? "ring-2 ring-ring"
                    : "hover:shadow-md"
                } ${card.disabled ? "opacity-60" : ""}`}
              >
                <div
                  className={`flex h-16 items-end bg-gradient-to-b p-4 ${card.gradient}`}
                >
                  <span className="text-foreground">{card.icon}</span>
                  {card.disabled ? (
                    <Badge variant="secondary" className="ml-auto">
                      Coming soon
                    </Badge>
                  ) : null}
                </div>
                <CardContent className="flex flex-1 flex-col justify-center gap-1.5">
                  <CardTitle className="text-base">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>

      {keyAlert}

      <div className="flex min-w-0 flex-col gap-6">{middle}</div>

      <div
        className="sticky bottom-4 z-10"
        style={
          generationBarVisible
            ? { bottom: "calc(5rem + env(safe-area-inset-bottom))" }
            : undefined
        }
      >
        <Card className="bg-card/85 shadow-lg backdrop-blur-md [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
          <CardContent className="flex flex-col gap-3">
            <Textarea
              value={idea}
              onChange={(event) => onIdeaChange(event.target.value)}
              placeholder="Instruction / Description ရိုက်ပါ — ဥပမာ အရိုးရှင်းဆုံး မိသားစု ဇာတ်လမ်းတစ်ခု ဖန်တီးပေးပါ"
              className="min-h-24 text-base leading-relaxed"
              aria-label="Instruction / Description"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="lg"
                disabled={busy}
                onClick={onRandom}
              >
                <ShuffleIcon />
                Random
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled={busy}
                onClick={onReset}
                className="ml-auto"
              >
                <RotateCcwIcon />
                Reset
              </Button>
              <Button
                size="lg"
                disabled={busy || !idea.trim()}
                onClick={onEnter}
                className="px-8"
              >
                <SparklesIcon />
                {busy ? "Generating…" : "Generate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
