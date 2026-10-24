import { useEffect, useState } from "react"
import { ThemeProvider, useTheme } from "next-themes"
import { toast } from "sonner"
import {
  BookOpenIcon,
  ClapperboardIcon,
  CopyIcon,
  EllipsisVerticalIcon,
  FilmIcon,
  MoonIcon,
  PlusIcon,
  SettingsIcon,
  SparklesIcon,
  SunIcon,
  TriangleAlertIcon,
  Trash2Icon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Textarea } from "@/components/ui/textarea"
import { Toaster } from "@/components/ui/sonner"
import { generateEpisodeText } from "@/lib/gemini"
import { parseEpisode, type Episode } from "@/lib/parse"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const EXAMPLE_IDEAS = [
  "အရိုးရှင်းဆုံး မိသားစု ဇာတ်လမ်းတစ်ခု ဖန်တီးပေးပါ",
  "မနက်ခင်း ကောက်ညှင်းပေါင်း လျှို့ဝှက်ချက်",
]

const GENRE_OPTIONS = [
  { value: "family", label: "မိသားစုဟာသ" },
  { value: "village", label: "ရွာဟာသ" },
  { value: "adventure", label: "စွန့်စားခန်း" },
  { value: "custom", label: "Custom" },
]

const STYLE_OPTIONS = [
  { value: "cinematic", label: "Cinematic 3D" },
  { value: "chubby", label: "Chubby · Style 23 & 1" },
  { value: "custom", label: "Custom" },
]

const DURATION_OPTIONS = [
  { value: 6, label: "6s" },
  { value: 8, label: "8s" },
  { value: 10, label: "10s" },
]

const RATIO_OPTIONS = [
  { value: "16:9", label: "16:9", full: "16:9 Landscape" },
  { value: "9:16", label: "9:16", full: "9:16 Portrait" },
  { value: "1:1", label: "1:1", full: "1:1 Square" },
]

const GEMINI_KEY_STORAGE = "mm3d.geminiKey"
const EPISODES_STORAGE = "mm3d.episodes"

// The Gem's own generation status phrases, cycled while Generate runs.
const LOADING_PHRASES = [
  "Verifying the required output format…",
  "Confirming scene specifications…",
  "Completing the cartoon episode",
  "Defining episode cliffhanger and setup",
  "Verifying episode and character continuity",
]

function loadSavedKey(): string | null {
  try {
    return localStorage.getItem(GEMINI_KEY_STORAGE)
  } catch {
    return null
  }
}

function loadSavedEpisodes(): Episode[] {
  try {
    const raw = localStorage.getItem(EPISODES_STORAGE)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Episode[]) : []
  } catch {
    return []
  }
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

// Sample episode arc for the output preview (UI sample only — real episodes come
// from Generate). Scene 1 and Scene 10 follow the learned Example A; scenes 2–9
// are sample arc beats drawn from the same story summary.
const SAMPLE_SCENES = [
  "မနက်ခင်း မီးဖိုဆောင် — ဒေါ်မြ ထမင်းဆီဆမ်း ပြင်ဆင်နေသည်",
  "ထမင်းဆီဆမ်းပန်းကန် စားပွဲပေါ် တင်ထားသည်",
  "ထမင်းဆီဆမ်း ပျောက်သွားသည်",
  "ဒေါ်မြ ကျော်ကျော်ကို သံသယဝင်သည်",
  "ကျော်ကျော် မယူပါဘူးဟု ငြင်းသည်",
  "အိမ်အနှံ့ လိုက်ရှာကြသည်",
  "ထမင်းစေ့များ အိမ်နောက်ဘက်သို့ လမ်းပြသည်",
  "အိမ်နောက်မှာ ခွေးကလေး နီနီ ထမင်းဆီဆမ်း စားနေသည်ကို တွေ့သည်",
  "တရားခံအစစ် ပေါ်သွားသည် — အားလုံး သဘောပေါက်ကြသည်",
  "မိသားစု အတူတကွ ရယ်မောကြသည်",
]

const SHEET_PROMPT_DAW_MYA = "Create a professional character reference sheet, 16:9 landscape. CHAR_001 Daw Mya, 42-year-old Myanmar mother, round face with thanaka on her cheeks, hair in a bun, light-green blouse, patterned htamein. Top row: the same character standing full-body in four views \u2014 front, three-quarter, side, back \u2014 identical face, hairstyle and outfit in every view. Bottom row: six expression close-ups \u2014 neutral, happy, sad, angry, surprised, worried \u2014 same face and outfit. Plain neutral beige background, high-quality cinematic 3D cartoon, sharp focus, detailed fabric texture, natural soft lighting. No text, no logo, no watermark."

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const dark = theme === "dark"
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="size-11"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setTheme(dark ? "light" : "dark")}
          />
        }
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </TooltipTrigger>
      <TooltipContent>
        <p>{dark ? "Light mode" : "Dark mode"}</p>
      </TooltipContent>
    </Tooltip>
  )
}

const CARD_PADDING =
  "[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]"

function EpisodeView({
  episode,
  busy,
  onCopy,
  onContinue,
}: {
  episode: Episode
  busy: boolean
  onCopy: (text: string, label: string) => void
  onContinue: (episode: Episode) => void
}) {
  const charName = (charId: string) => {
    const found = episode.characters.find((c) => c.id === charId)
    return found ? `${found.name} (${found.transliteration})` : charId
  }
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">Episode output</h2>
        <p className="text-sm text-muted-foreground">
          Generate လုပ်ထားတဲ့ episode အစစ်ပါ — prompt တစ်ခုချင်းစီကို Copy
          နှိပ်ပြီး Google Flow ထဲ ထည့်ပါ။
        </p>
      </div>

      <Card className={CARD_PADDING}>
        <CardHeader>
          <CardTitle>
            {episode.title} (Episode {String(episode.episodeNumber).padStart(2, "0")})
          </CardTitle>
          <CardDescription>Episode Title &amp; Details</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {episode.genre && <Badge variant="secondary">{episode.genre}</Badge>}
          {episode.visualStyle && (
            <Badge variant="secondary">{episode.visualStyle}</Badge>
          )}
          <Badge variant="secondary">{episode.aspect}</Badge>
          <Badge variant="secondary">
            10 scenes × {episode.sceneDuration}s = {episode.totalSeconds}s
          </Badge>
        </CardContent>
      </Card>

      {episode.storySummary && (
        <Card className={CARD_PADDING}>
          <CardHeader>
            <CardTitle className="text-base">Story Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{episode.storySummary}</p>
          </CardContent>
        </Card>
      )}

      {episode.characters.length > 0 && (
        <Card className={CARD_PADDING}>
          <CardHeader>
            <CardTitle className="text-base">Character Bible</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {episode.characters.map((character) => (
              <div key={character.id}>
                <p className="text-sm font-medium">
                  [{character.id}] {character.name} ({character.transliteration})
                  {character.age !== null && ` — ${character.age} နှစ်`}
                  {character.role && `, ${character.role}`}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {character.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {episode.sheetPrompts.map((sheet) => (
        <Card key={sheet.charId} className={CARD_PADDING}>
          <CardHeader>
            <CardTitle className="text-base">
              CHARACTER SHEET PROMPT — {sheet.charId} {charName(sheet.charId)}
            </CardTitle>
            <CardDescription>
              Paste this into Flow&apos;s image tool first to get the reference
              sheet — 4 full-body views + 6 expressions — then use it as the
              character reference for the scene stills.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted p-5 text-sm leading-relaxed whitespace-pre-wrap sm:p-6">
              {sheet.text}
            </pre>
          </CardContent>
          <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              size="lg"
              onClick={() =>
                onCopy(sheet.text, `CHARACTER SHEET — ${sheet.charId}`)
              }
            >
              <CopyIcon />
              Copy Character Sheet Prompt
            </Button>
          </CardFooter>
        </Card>
      ))}

      {episode.scenes.length > 0 && (
        <Card className={CARD_PADDING}>
          <CardHeader>
            <CardTitle className="text-base">Scene Continuity Plan</CardTitle>
            {episode.location && (
              <CardDescription>Location: {episode.location}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {episode.scenes.map((scene) => (
              <div key={scene.number} className="flex gap-3 text-sm">
                <span className="shrink-0 text-muted-foreground">
                  Scene {String(scene.number).padStart(2, "0")} ·{" "}
                  {formatTime(scene.start)}–{formatTime(scene.end)}
                </span>
                <span className="leading-relaxed">{scene.line}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {episode.prompts.map((prompt) => (
        <Card key={prompt.number} className={CARD_PADDING}>
          <CardHeader>
            <CardTitle className="text-base">
              Scene {String(prompt.number).padStart(2, "0")} ·{" "}
              {formatTime(prompt.start)}–{formatTime(prompt.end)}
            </CardTitle>
            <CardDescription>
              Copy the image prompt into Google Flow to generate the still,
              then use the video prompt on the same frame.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {prompt.image && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">
                  IMAGE PROMPT {String(prompt.number).padStart(2, "0")}
                </span>
                <pre className="overflow-x-auto rounded-lg bg-muted p-5 text-sm leading-relaxed whitespace-pre-wrap sm:p-6">
                  {prompt.image}
                </pre>
              </div>
            )}
            {prompt.video && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">
                  VIDEO PROMPT {String(prompt.number).padStart(2, "0")}
                </span>
                <pre className="overflow-x-auto rounded-lg bg-muted p-5 text-sm leading-relaxed whitespace-pre-wrap sm:p-6">
                  {prompt.video}
                </pre>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {prompt.image && (
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  onCopy(
                    prompt.image,
                    `IMAGE PROMPT ${String(prompt.number).padStart(2, "0")}`,
                  )
                }
              >
                <CopyIcon />
                Copy Image Prompt
              </Button>
            )}
            {prompt.video && (
              <Button
                size="lg"
                onClick={() =>
                  onCopy(
                    prompt.video,
                    `VIDEO PROMPT ${String(prompt.number).padStart(2, "0")}`,
                  )
                }
              >
                <CopyIcon />
                Copy Video Prompt
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}

      <Card className={CARD_PADDING}>
        <CardHeader>
          <CardTitle className="text-base">
            Continuity Note &amp; Next Episode Hook
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {episode.continuityNote && (
            <p className="text-sm leading-relaxed">
              Continuity: {episode.continuityNote}
            </p>
          )}
          {episode.hook && (
            <p className="text-sm leading-relaxed">
              Next Episode Hook (Episode{" "}
              {String(episode.episodeNumber + 1).padStart(2, "0")}):{" "}
              {episode.hook}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button size="lg" disabled={busy} onClick={() => onContinue(episode)}>
            Continue → Episode{" "}
            {String(episode.episodeNumber + 1).padStart(2, "0")}
          </Button>
        </CardFooter>
      </Card>

      <Card className={CARD_PADDING}>
        <CardHeader>
          <CardTitle className="text-base">
            Story Record (ဇာတ်လမ်းမှတ်တမ်း)
          </CardTitle>
          <CardDescription>
            Continue လုပ်တိုင်း ဒီမှတ်တမ်းကို ပြန်ပို့မယ် — series တစ်လျှောက်
            ဇာတ်ကောင် + ဇာတ်လမ်း မလွဲအောင်။
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {episode.storyRecord.title && (
            <p>
              <span className="font-medium">Story Title: </span>
              {episode.storyRecord.title}
            </p>
          )}
          {episode.storyRecord.genre && (
            <p>
              <span className="font-medium">Genre: </span>
              {episode.storyRecord.genre}
            </p>
          )}
          {episode.storyRecord.premise && (
            <p>
              <span className="font-medium">Central Premise: </span>
              {episode.storyRecord.premise}
            </p>
          )}
          {episode.storyRecord.conflict && (
            <p>
              <span className="font-medium">Main Conflict: </span>
              {episode.storyRecord.conflict}
            </p>
          )}
          {episode.storyRecord.turningPoint && (
            <p>
              <span className="font-medium">Key Turning Point: </span>
              {episode.storyRecord.turningPoint}
            </p>
          )}
          {episode.storyRecord.endingType && (
            <p>
              <span className="font-medium">Ending Type: </span>
              {episode.storyRecord.endingType}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

const GUIDE_STEPS = [
  {
    titleEn: "Get a free Gemini API key",
    titleMm: "Free Gemini API key ယူပါ",
    bodyEn:
      "Go to Google AI Studio (aistudio.google.com) and create a free API key. No payment is needed for the free tier.",
    bodyMm:
      "Google AI Studio (aistudio.google.com) ကို သွားပြီး free API key တစ်ခု အလကားယူပါ။ Free tier အတွက် ပိုက်ဆံ မလိုဘူး။",
  },
  {
    titleEn: "Save the key in Settings",
    titleMm: "Key ကို Settings ထဲမှာ သိမ်းပါ",
    bodyEn:
      "In StoryFlow, open Settings from the sidebar footer, paste your key and press Save key. The key stays in this browser's local storage only — it is never put into the code or the repository.",
    bodyMm:
      "StoryFlow ရဲ့ sidebar အောက်ဆုံးက Settings ကို ဖွင့်၊ key ကို paste လုပ်ပြီး Save key နှိပ်ပါ။ Key က ဒီ browser ထဲမှာပဲ နေမယ် — code ထဲလည်း မပါ၊ repo ထဲလည်း မပါဘူး။",
  },
  {
    titleEn: "Write one short idea",
    titleMm: "Idea တစ်ကြောင်း ရေးပါ",
    bodyEn:
      "Type one short Burmese story idea — for example about a family, a village morning, or a missing meal. One line is enough: StoryFlow expands it into a full episode.",
    bodyMm:
      "မြန်မာ idea အတိုလေး တစ်ကြောင်း ရိုက်ထည့်ပါ — ဥပမာ မိသားစု၊ ရွာမနက်ခင်း၊ ပျောက်သွားတဲ့ ဟင်းတစ်ခွက်။ တစ်ကြောင်းဆိုလုံလောက်ပြီ၊ StoryFlow က episode အပြည့်အစုံ ချဲ့ပေးမယ်။",
  },
  {
    titleEn: "Pick Genre, Visual Style, Scene duration and Ratio",
    titleMm: "Genre, Style, Duration, Ratio ရွေးပါ",
    bodyEn:
      "Pick a Genre and a Visual Style from the chips, or choose Custom and type anything — custom text is sent to Gemini exactly as written. Pick a scene duration: 6, 8 or 10 seconds per scene. Pick an aspect ratio: 16:9 for YouTube, 9:16 for Shorts / Reels / TikTok, or 1:1 for a square post — and pick the same ratio in Flow. Every episode has 10 scenes.",
    bodyMm:
      "Chip တွေထဲက Genre နဲ့ Visual Style ရွေးပါ၊ ဒါမှမဟုတ် Custom ရွေးပြီး ကြိုက်တာရိုက်ပါ — Custom စာသားကို Gemini ဆီ အတိုင်းအတာ ပို့ပေးတယ်။ Scene duration ကို 6s / 8s / 10s ရွေးပါ။ Ratio ကို ရွေးပါ — 16:9 = YouTube, 9:16 = Shorts / Reels / TikTok, 1:1 = square post အတွက်၊ Flow ထဲမှာလည်း ဒီ ratio အတိုင်း ရွေးပါ။ Episode တိုင်းမှာ scene 10 ခု ပါတယ်။",
  },
  {
    titleEn: "Press Generate Episode",
    titleMm: "Generate Episode နှိပ်ပါ",
    bodyEn:
      "Press Generate Episode and wait. The output is a complete episode package in 8 sections: Title & Details, Story Summary, Character Bible, Character Sheet Prompts, Scene Continuity Plan, Scene Prompts, Continuity Note & Hook, and Story Record.",
    bodyMm:
      "Generate Episode နှိပ်ပြီး ခဏစောင့်ပါ။ ထွက်လာမှာက section 8 ခုပါတဲ့ episode package အပြည့်အစုံပါ — Title, Story Summary, Character Bible, Character Sheet, Continuity Plan, Scene Prompts, Hook, Story Record။",
  },
  {
    titleEn: "Start with the Character Sheets",
    titleMm: "အရင် Character Sheet လုပ်ပါ",
    bodyEn:
      "Copy each Character Sheet prompt into Google Flow's image tool FIRST. Each sheet shows the same character in 4 full-body views and 6 expressions — use it as the reference for every scene still, so the character never changes face or outfit.",
    bodyMm:
      "Character Sheet prompt တွေကို အရင် Google Flow ရဲ့ image tool ထဲ paste လုပ်ပါ။ Sheet တစ်ခုမှာ ဇာတ်ကောင် တစ်ယောက်တည်းကို full-body 4 ပုံ + expression 6 ခု ပြတယ် — အဲဒါကို scene တိုင်းအတွက် reference လုပ်ရင် ဇာတ်ကောင် မျက်နှာ/အဝတ်အစား မပြောင်းတော့ဘူး။",
  },
  {
    titleEn: "Make stills and clips in Google Flow",
    titleMm: "Flow ထဲမှာ ပုံနဲ့ clip လုပ်ပါ",
    bodyEn:
      "For each scene, paste the IMAGE prompt into Flow to make the still, then use the VIDEO prompt together with that still to make the clip (your chosen ratio, x1). Each video prompt has ONE speaker only, with exact Burmese dialogue and Burmese lip-sync.",
    bodyMm:
      "Scene တစ်ခုချင်းစီအတွက် IMAGE prompt ကို Flow ထဲ paste လုပ်ပြီး still ထုတ်ပါ၊ ပြီးရင် အဲဒီ still နဲ့ VIDEO prompt ကို တွဲပြီး clip လုပ်ပါ (ရွေးထားတဲ့ ratio, x1)။ Video prompt တစ်ခုမှာ စကားပြောသူ တစ်ယောက်ပဲ ပါတယ်၊ မြန်မာစကား အတိအကျ + lip-sync နဲ့ပါ။",
  },
  {
    titleEn: "Continue the series",
    titleMm: "Series ဆက်ပါ",
    bodyEn:
      "Press Continue → Episode 02 to make the next episode. The same characters, outfits and Story Record carry over automatically, so the series stays consistent. You can change the scene duration and ratio for the new episode.",
    bodyMm:
      "Continue → Episode 02 နှိပ်ပြီး နောက်အပိုင်း ဆက်လုပ်ပါ။ ဇာတ်ကောင်တွေ၊ အဝတ်အစားတွေ၊ Story Record က အလိုအလျောက် ပါသွားမယ်၊ series တစ်လျှောက် မလွဲတော့ဘူး။ အပိုင်းသစ်အတွက် duration နဲ့ ratio ပြောင်းလို့ရတယ်။",
  },
]

function GuideView() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">
          How to Use StoryFlow — အသုံးပြုနည်း
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          StoryFlow turns one short Burmese idea into a complete cartoon
          episode package. Follow these steps from start to finish.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          StoryFlow က မြန်မာ idea အတိုလေးတစ်ကြောင်းကို cartoon episode
          package အပြည့်အစုံ ဖြစ်အောင် ပြောင်းပေးတယ်။ အစကနေ အဆုံးအထိ
          ဒီအဆင့်တွေအတိုင်း လုပ်ပါ။
        </p>
      </div>

      <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
        <CardHeader>
          <CardTitle className="text-base">Step by step — အဆင့်ဆင့်</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {GUIDE_STEPS.map((step, index) => (
            <div key={step.titleEn} className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                Step {index + 1} — {step.titleEn} · {step.titleMm}
              </p>
              <p className="text-sm leading-relaxed">{step.bodyEn}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.bodyMm}
              </p>
              {index < GUIDE_STEPS.length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
        <CardHeader>
          <CardTitle className="text-base">Good to know — သိထားဖို့</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm leading-relaxed">
              StoryFlow does not generate images or video itself — Google
              Flow does that. StoryFlow writes the prompts.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              StoryFlow က ပုံ/video ကိုယ်တိုင် မထုတ်ဘူး — Google Flow က
              ထုတ်တယ်။ StoryFlow က prompt တွေကို ရေးပေးတာပါ။
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm leading-relaxed">
              Your episodes and your key live only in this browser. There is
              no phone ↔ computer sync in this version.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Episode တွေနဲ့ key က ဒီ browser ထဲမှာပဲ ရှိတယ်။ ဒီ version
              မှာ ဖုန်း ↔ ကွန်ပျူတာ sync မပါသေးဘူး။
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm leading-relaxed">
              If Generate fails, check the message: an invalid-key message
              means re-check the key in Settings; a quota message means wait
              a while and try again.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Generate မအောင်မြင်ရင် message ကို ကြည့်ပါ — key မမှန်ဘူးဆိုရင်
              Settings မှာ ပြန်စစ်ပါ၊ quota ပြည့်သွားတယ်ဆိုရင် ခဏစောင့်ပြီး
              ပြန်နှိပ်ပါ။
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function AppShell() {
  const [idea, setIdea] = useState("")
  const [genre, setGenre] = useState("family")
  const [customGenre, setCustomGenre] = useState("")
  const [style, setStyle] = useState("cinematic")
  const [customStyle, setCustomStyle] = useState("")
  const [sceneDuration, setSceneDuration] = useState(8)
  const totalDuration = 10 * sceneDuration
  const [ratio, setRatio] = useState("16:9")
  const ratioFull =
    RATIO_OPTIONS.find((option) => option.value === ratio)?.full ??
    "16:9 Landscape"
  const [apiKey, setApiKey] = useState("")
  const [savedKey, setSavedKey] = useState<string | null>(() => loadSavedKey())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>(() => loadSavedEpisodes())
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [loadingPhrase, setLoadingPhrase] = useState(0)
  const [apiError, setApiError] = useState<string | null>(null)
  const [parseIssues, setParseIssues] = useState<string[]>([])
  const [rawFallback, setRawFallback] = useState<string | null>(null)

  const deleteSavedEpisode = episodes.find((e) => e.id === deleteTarget)
  const busy = generating

  useEffect(() => {
    if (!generating) return
    const timer = setInterval(
      () => setLoadingPhrase((phrase) => (phrase + 1) % LOADING_PHRASES.length),
      2000,
    )
    return () => clearInterval(timer)
  }, [generating])

  useEffect(() => {
    if (settingsOpen && savedKey) setApiKey(savedKey)
  }, [settingsOpen, savedKey])

  function copyPrompt(text: string, label: string) {
    void navigator.clipboard?.writeText(text).catch(() => {
      /* clipboard unavailable in some browsers; toast still confirms the action */
    })
    toast.success(`${label} copied`, {
      description: "Paste it into Google Flow.",
    })
  }

  function persistEpisodes(next: Episode[]) {
    setEpisodes(next)
    try {
      localStorage.setItem(EPISODES_STORAGE, JSON.stringify(next))
    } catch {
      /* storage full or unavailable — episodes stay in memory for the session */
    }
  }

  function showEpisode(episode: Episode | null) {
    setActiveEpisode(episode)
    setRawFallback(null)
    setApiError(null)
    setParseIssues([])
  }

  const effectiveGenre =
    genre === "custom"
      ? customGenre.trim()
      : (GENRE_OPTIONS.find((option) => option.value === genre)?.label ?? "")
  const effectiveStyle =
    style === "custom"
      ? customStyle.trim()
      : (STYLE_OPTIONS.find((option) => option.value === style)?.label ?? "")

  function buildUserPrompt(
    ideaText: string,
    genreText: string,
    styleText: string,
    duration: number,
    ratioLabel: string,
  ): string {
    return `${ideaText}\nGenre: ${genreText}\nVisual Style: ${styleText}\nScene duration: ${duration} seconds per scene (10 scenes, ${10 * duration} seconds total).\nAspect ratio: ${ratioLabel}.`
  }

  function buildContinuePrompt(
    episode: Episode,
    duration: number,
    ratioLabel: string,
  ): string {
    const record = episode.storyRecord
    const characterLines = episode.characters
      .map(
        (character) =>
          `[${character.id}] ${character.name} (${character.transliteration}) — ${character.description}`,
      )
      .join("\n")
    return `ဆက်ပါ — Episode ${episode.episodeNumber + 1} ${duration}sec ဆက်ပေးပါ။\nSeries memory (Story Record):\n- Story Title: ${record.title}\n- Genre: ${record.genre}\n- Central Premise: ${record.premise}\n- Main Conflict: ${record.conflict}\n- Key Turning Point: ${record.turningPoint}\n- Ending Type: ${record.endingType}\nCharacters — reuse exactly, same CHAR IDs, outfits and voices:\n${characterLines}\nPrevious episode hook: ${episode.hook}\nScene duration: ${duration} seconds per scene (10 scenes, ${10 * duration} seconds total).\nAspect ratio: ${ratioLabel}.`
  }

  async function runGenerate(
    userPrompt: string,
    duration: number,
    aspectLabel: string,
  ) {
    if (!savedKey) {
      setSettingsOpen(true)
      toast.info("Gemini API key လိုတယ်", {
        description: "Settings မှာ free key ထည့်ပြီးမှ Generate နှိပ်ပါ။",
      })
      return
    }
    setGenerating(true)
    setLoadingPhrase(0)
    setApiError(null)
    setRawFallback(null)
    setParseIssues([])
    try {
      const text = await generateEpisodeText(savedKey, userPrompt)
      const { episode, issues } = parseEpisode(text, {
        sceneDuration: duration,
      })
      if (!episode) {
        setRawFallback(text)
        setParseIssues(issues)
        toast.error("Episode ကို parse လုပ်လို့မရဘူး", {
          description: "Raw output ကို အောက်မှာ ပြထားတယ်။",
        })
        return
      }
      episode.aspect = aspectLabel
      persistEpisodes([episode, ...episodes])
      setActiveEpisode(episode)
      setParseIssues(issues)
      toast.success("Episode ရပြီ", {
        description: `${episode.title} (Episode ${String(episode.episodeNumber).padStart(2, "0")})`,
      })
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Generate လုပ်လို့မရဘူး။ ပြန်စမ်းပါ။",
      )
    } finally {
      setGenerating(false)
    }
  }

  async function handleGenerate() {
    if (!idea.trim()) {
      toast.error("Idea ထည့်ပါ", {
        description: "ဇာတ်လမ်း idea တစ်ကြောင်း အရင်ရိုက်ပါ။",
      })
      return
    }
    if (genre === "custom" && !customGenre.trim()) {
      toast.error("Custom genre ထည့်ပါ", {
        description: "Custom ကို ရွေးထားရင် genre စာသား ထည့်ပေးပါ။",
      })
      return
    }
    if (style === "custom" && !customStyle.trim()) {
      toast.error("Custom style ထည့်ပါ", {
        description: "Custom ကို ရွေးထားရင် style စာသား ထည့်ပေးပါ။",
      })
      return
    }
    await runGenerate(
      buildUserPrompt(
        idea.trim(),
        effectiveGenre,
        effectiveStyle,
        sceneDuration,
        ratioFull,
      ),
      sceneDuration,
      ratioFull,
    )
  }

  async function handleContinue(episode: Episode) {
    await runGenerate(
      buildContinuePrompt(episode, sceneDuration, ratioFull),
      sceneDuration,
      ratioFull,
    )
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">
                <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <ClapperboardIcon className="size-4" />
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-medium">StoryFlow</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Make your imagination happens
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>My Episodes</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeEpisode === null}
                    onClick={() => { showEpisode(null); setShowGuide(false) }}
                  >
                    <PlusIcon />
                    <span>New Episode</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {episodes.map((episode) => (
                  <SidebarMenuItem key={episode.id}>
                    <SidebarMenuButton
                      isActive={activeEpisode?.id === episode.id}
                      onClick={() => { showEpisode(episode); setShowGuide(false) }}
                    >
                      <FilmIcon />
                      <span className="truncate">{episode.title}</span>
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <SidebarMenuAction aria-label="Episode actions" />
                        }
                      >
                        <EllipsisVerticalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start">
                        <DropdownMenuItem
                          onClick={() =>
                            toast.success("Export coming in the next step")
                          }
                        >
                          Export prompts
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(episode.id)}
                        >
                          <Trash2Icon />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={showGuide}
                    onClick={() => setShowGuide(true)}
                  >
                    <BookOpenIcon />
                    <span>How to Use</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
                <span>Settings · API key</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 sm:px-6">
          <SidebarTrigger className="size-11" />
          <Separator orientation="vertical" className="h-6" />
          <h1 className="truncate text-base font-medium sm:text-lg">
            {showGuide ? "How to Use" : activeEpisode ? activeEpisode.title : "New Episode"}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {(activeEpisode
                ? activeEpisode.aspect.split(" ")[0]
                : ratio)}{" "}
              · 10 scenes ×{" "}
              {activeEpisode ? activeEpisode.sceneDuration : sceneDuration}s
            </Badge>
            <ThemeToggle />
            <Button
              variant="outline"
              size="icon"
              aria-label="Settings"
              className="size-11"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon />
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 xl:max-w-4xl">
          {showGuide ? (
            <GuideView />
          ) : (
          <div className="flex flex-col gap-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SparklesIcon />
                </EmptyMedia>
                <EmptyTitle>ဇာတ်လမ်း idea တစ်ကြောင်း ရိုက်ထည့်ပါ</EmptyTitle>
                <EmptyDescription className="leading-relaxed">
                  Gem ထဲကလိုပဲ — idea အကြမ်းတစ်ကြောင်းကနေ Episode package
                  အပြည့်အစုံ (Title, Story, Characters, 10 Scenes, Image + Video
                  Prompts) ထုတ်ပေးမယ်။ ပြီးရင် Copy နှိပ်ပြီး Google Flow ထဲ
                  ထည့်ရုံပဲ။
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="flex flex-wrap justify-center gap-2">
                {EXAMPLE_IDEAS.map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    size="lg"
                    onClick={() => setIdea(example)}
                  >
                    {example}
                  </Button>
                ))}
              </EmptyContent>
            </Empty>

            {!savedKey && (
            <Alert>
              <TriangleAlertIcon />
              <AlertTitle>Gemini API key မထည့်ရသေးဘူး</AlertTitle>
              <AlertDescription>
                Generate လုပ်ဖို့ free Google AI Studio key တစ်ခု လိုတယ်။
                Key က ဒီ browser ထဲမှာပဲ နေမယ် — code ထဲ၊ server ပေါ်မှာ
                ဘယ်တော့မှ မရောက်ဘူး။
                <Button
                  variant="link"
                  className="h-auto px-1"
                  onClick={() => setSettingsOpen(true)}
                >
                  Settings မှာ ထည့်ပါ
                </Button>
              </AlertDescription>
            </Alert>
            )}

            <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>Create Episode</CardTitle>
                    <CardDescription>
                      Idea, Genre, Visual Style ရွေးပြီး Generate နှိပ်ပါ။
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{totalDuration} seconds</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <Textarea
                  value={idea}
                  onChange={(event) => setIdea(event.target.value)}
                  placeholder="ဥပမာ — အရိုးရှင်းဆုံး မိသားစု ဇာတ်လမ်းတစ်ခု ဖန်တီးပေးပါ"
                  className="min-h-28 text-base leading-relaxed"
                  aria-label="Story idea"
                />
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Genre</span>
                  <div className="flex flex-wrap gap-2">
                    {GENRE_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        variant={genre === option.value ? "default" : "outline"}
                        size="sm"
                        className="rounded-full"
                        aria-pressed={genre === option.value}
                        onClick={() => setGenre(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {genre === "custom" && (
                  <div className="flex flex-col gap-2">
                    <Input
                      value={customGenre}
                      onChange={(event) => setCustomGenre(event.target.value)}
                      placeholder="ဥပမာ — ဟာသ + စုံထောက်၊ မိသားစု ဒရာမာ"
                      className="text-base"
                      aria-label="Custom genre"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Visual Style</span>
                  <div className="flex flex-wrap gap-2">
                    {STYLE_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        variant={style === option.value ? "default" : "outline"}
                        size="sm"
                        className="rounded-full"
                        aria-pressed={style === option.value}
                        onClick={() => setStyle(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {style === "custom" && (
                  <div className="flex flex-col gap-2">
                    <Input
                      value={customStyle}
                      onChange={(event) => setCustomStyle(event.target.value)}
                      placeholder="ဥပမာ — Watercolor storybook၊ Pixel art၊ Claymation"
                      className="text-base"
                      aria-label="Custom visual style"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Scene duration</span>
                  <div className="flex flex-wrap gap-2">
                    {DURATION_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        variant={
                          sceneDuration === option.value ? "default" : "outline"
                        }
                        size="sm"
                        className="rounded-full"
                        aria-pressed={sceneDuration === option.value}
                        onClick={() => setSceneDuration(option.value)}
                      >
                        {option.label} / scene
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    10 scenes × {sceneDuration}s = {totalDuration} seconds
                    total.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Ratio</span>
                  <div className="flex flex-wrap gap-2">
                    {RATIO_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        variant={ratio === option.value ? "default" : "outline"}
                        size="sm"
                        className="rounded-full"
                        aria-pressed={ratio === option.value}
                        onClick={() => setRatio(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    16:9 = YouTube · 9:16 = Shorts / Reels / TikTok · 1:1 =
                    Square post. Flow ထဲမှာလည်း ဒီ ratio အတိုင်း ရွေးပါ။
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setIdea("")
                    setCustomGenre("")
                    setCustomStyle("")
                  }}
                >
                  Clear
                </Button>
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={busy}
                  onClick={handleGenerate}
                >
                  <SparklesIcon />
                  {generating ? "Generating…" : "Generate Episode"}
                </Button>
              </CardFooter>
            </Card>

            {generating && (
              <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
                <CardContent>
                  <p className="animate-pulse text-sm leading-relaxed">
                    {LOADING_PHRASES[loadingPhrase]}
                  </p>
                </CardContent>
              </Card>
            )}

            {apiError && (
              <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertTitle>Generate လုပ်လို့မရဘူး</AlertTitle>
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}

            {parseIssues.length > 0 && activeEpisode && (
              <Alert>
                <TriangleAlertIcon />
                <AlertTitle>
                  သတိပြုစရာ ရှိတယ် — ဒါပေမဲ့ episode ရသွားပြီ
                </AlertTitle>
                <AlertDescription>
                  <ul className="flex flex-col gap-1">
                    {parseIssues.map((issue) => (
                      <li key={issue}>• {issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {rawFallback ? (
              <section className="flex flex-col gap-6">
                <div>
                  <h2 className="text-lg font-medium">Episode output</h2>
                  <p className="text-sm text-muted-foreground">
                    Gemini output ကို parse လုပ်လို့မရလို့ raw text ကို
                    ပြထားတယ်။
                  </p>
                </div>
                {parseIssues.length > 0 && (
                  <Alert>
                    <TriangleAlertIcon />
                    <AlertTitle>Parse လုပ်လို့မရဘူး</AlertTitle>
                    <AlertDescription>
                      <ul className="flex flex-col gap-1">
                        {parseIssues.map((issue) => (
                          <li key={issue}>• {issue}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Raw Gemini output
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="overflow-x-auto rounded-lg bg-muted p-5 text-sm leading-relaxed whitespace-pre-wrap sm:p-6">
                      {rawFallback}
                    </pre>
                  </CardContent>
                  <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      size="lg"
                      onClick={() => copyPrompt(rawFallback, "Raw output")}
                    >
                      <CopyIcon />
                      Copy all
                    </Button>
                  </CardFooter>
                </Card>
              </section>
            ) : activeEpisode ? (
              <EpisodeView
                episode={activeEpisode}
                busy={busy}
                onCopy={copyPrompt}
                onContinue={handleContinue}
              />
            ) : (
            <section className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-medium">
                  Episode output — နမူနာ
                </h2>
                <p className="text-sm text-muted-foreground">
                  ဒါက UI နမူနာပါ — Generate လုပ်တဲ့အခါ ဒီနေရာမှာ တကယ့်
                  episode အပြည့်အစုံ ထွက်မယ်။ Scene 01 ရဲ့ prompt အစစ်ကို
                  အောက်မှာ ပြထားတယ်၊ ကျန် scene တွေရဲ့ စာသားတွေက
                  ဇာတ်လမ်းအကျဉ်းကနေ ထုတ်ထားတဲ့ နမူနာ arc ပါ။
                </p>
              </div>

              <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
                <CardHeader>
                  <CardTitle>ပျောက်သော ထမင်းဆီဆမ်း (Episode 01)</CardTitle>
                  <CardDescription>
                    Episode Title &amp; Details
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Badge variant="secondary">မိသားစုဟာသ</Badge>
                  <Badge variant="secondary">Cinematic 3D</Badge>
                  <Badge variant="secondary">16:9 Landscape</Badge>
                  <Badge variant="secondary">
                    10 scenes × {sceneDuration}s = {totalDuration}s
                  </Badge>
                </CardContent>
              </Card>

              <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
                <CardHeader>
                  <CardTitle className="text-base">Story Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">
                    ရွာငယ်လေးက သစ်သားအိမ်မှာ ဒေါ်မြက မနက်ခင်းတိုင်း
                    သားလေး ကျော်ကျော်အတွက် ထမင်းဆီဆမ်း ပြင်ပေးတယ်။
                    တစ်နေ့မနက် စားပွဲပေါ်က ထမင်းဆီဆမ်း ပျောက်သွားတော့
                    ဒေါ်မြက ကျော်ကျော်ကို သံသယဝင်မိတယ်။ ဒါပေမဲ့
                    တရားခံအစစ်က အိမ်နောက်မှာ ထမင်းဆီဆမ်း ခိုးစားနေတဲ့
                    ခွေးကလေး နီနီ ဖြစ်နေတယ်။ အမှန်သိသွားတော့ မိသားစု
                    အားလုံး အတူတကွ ရယ်မောကြတယ်။
                  </p>
                </CardContent>
              </Card>

              <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
                <CardHeader>
                  <CardTitle className="text-base">Character Bible</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div>
                    <p className="text-sm font-medium">
                      [CHAR_001] ဒေါ်မြ (Daw Mya) — 42 နှစ်, မိခင်
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      ပါးမှာ သနပ်ခါးဝိုင်း၊ ဆံထုံးထုံး၊ အစိမ်းနုရောင်
                      ဘလောက်စ်၊ အဆင်ပါသော ထမီ၊ နွေးထွေးသော မြန်မာမိခင်
                      အသံ။
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      [CHAR_002] ကျော်ကျော် (Kyaw Kyaw) — 8 နှစ်, သား
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      ဒေါ်မြ၏သား။
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
                <CardHeader>
                  <CardTitle className="text-base">
                    CHARACTER SHEET PROMPT — CHAR_001 Daw Mya
                  </CardTitle>
                  <CardDescription>
                    Paste this into Flow&apos;s image tool first to get the
                    reference sheet — 4 full-body views + 6 expressions —
                    then use it as the character reference for the scene
                    stills.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto rounded-lg bg-muted p-5 text-sm leading-relaxed whitespace-pre-wrap sm:p-6">
                    {SHEET_PROMPT_DAW_MYA}
                  </pre>
                </CardContent>
                <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    size="lg"
                    onClick={() =>
                      copyPrompt(SHEET_PROMPT_DAW_MYA, "CHARACTER SHEET — CHAR_001")
                    }
                  >
                    <CopyIcon />
                    Copy Character Sheet Prompt
                  </Button>
                </CardFooter>
              </Card>

              <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
                <CardHeader>
                  <CardTitle className="text-base">
                    Scene Continuity Plan
                  </CardTitle>
                  <CardDescription>
                    Location: သစ်သားအိမ် မီးဖိုဆောင် · မနက်ခင်း —
                    တစ်ပိုင်းလုံး ဒီနေရာမှာပဲ။
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {SAMPLE_SCENES.map((line, index) => {
                    const start = index * sceneDuration
                    const end = start + sceneDuration
                    return (
                      <div key={line} className="flex gap-3 text-sm">
                        <span className="shrink-0 text-muted-foreground">
                          Scene {String(index + 1).padStart(2, "0")} ·{" "}
                          {formatTime(start)}–{formatTime(end)}
                        </span>
                        <span className="leading-relaxed">{line}</span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
                <CardHeader>
                  <CardTitle className="text-base">
                    IMAGE PROMPT 01 — Opening close-up
                  </CardTitle>
                  <CardDescription>
                    Copy this into Google Flow to generate the still, then use
                    the video prompt on the same frame.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto rounded-lg bg-muted p-5 text-sm leading-relaxed whitespace-pre-wrap sm:p-6">
                    {`16:9 landscape. Close-up. [CHAR_001] Daw Mya, 42, mother, light-green blouse, pouring oil onto a steaming rice bowl on a wooden table in a Myanmar wooden kitchen, warm morning light. High-quality cinematic 3D cartoon, sharp focus, detailed fabric texture, natural shadows, warm atmospheric lighting. No text, no logo, no watermark.`}
                  </pre>
                </CardContent>
                <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() =>
                      copyPrompt(
                        "16:9 landscape. Close-up. [CHAR_001] Daw Mya, 42, mother, light-green blouse, pouring oil onto a steaming rice bowl on a wooden table in a Myanmar wooden kitchen, warm morning light. High-quality cinematic 3D cartoon, sharp focus, detailed fabric texture, natural shadows, warm atmospheric lighting. No text, no logo, no watermark.",
                        "IMAGE PROMPT 01",
                      )
                    }
                  >
                    <CopyIcon />
                    Copy Image Prompt
                  </Button>
                  <Button
                    size="lg"
                    onClick={() =>
                      copyPrompt(
                        `16:9 landscape. Continuous shot ${sceneDuration} seconds. Character [CHAR_001] Daw Mya says in Burmese: "ကျော်ကျော်လေးအတွက် ထမင်းဆီဆမ်းလေး ပြင်ပေးမှာပါ။" One speaker only, gentle loving mother voice, natural pace, Burmese lip-sync, joyful expression. Background ambient sound of birds chirping and gentle breeze.`,
                        "VIDEO PROMPT 01",
                      )
                    }
                  >
                    <CopyIcon />
                    Copy Video Prompt
                  </Button>
                </CardFooter>
              </Card>
              <p className="text-sm text-muted-foreground">
                Scene 02–10 ရဲ့ prompt တွေလည်း ဒီပုံစံအတိုင်းပဲ —
                Generate လုပ်ပြီးမှ အပြည့်အစုံထွက်မယ်။
              </p>

              <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
                <CardHeader>
                  <CardTitle className="text-base">
                    Continuity Note &amp; Next Episode Hook
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <p className="text-sm leading-relaxed">
                    Continuity: ဒေါ်မြ — အစိမ်းနုရောင် ဘလောက်စ်၊ အဆင်ပါသော
                    ထမီ၊ သနပ်ခါးဝိုင်း၊ ဆံထုံး။ နေရာ — သစ်သားအိမ်
                    မီးဖိုဆောင်။
                  </p>
                  <p className="text-sm leading-relaxed">
                    Next Episode Hook (Episode 02, နမူနာ): ကျော်ကျော်နဲ့ နီနီ
                    မနက်ခင်း စျေးသွားတဲ့ ခရီးမှာ အလွဲအသစ်တစ်ခု
                    စောင့်နေသည်။
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    size="lg"
                    onClick={() =>
                      toast.info("Episode 2 continue is the next build step", {
                        description:
                          "Continue reuses the same characters, outfits and Story Record.",
                      })
                    }
                  >
                    Continue → Episode 02
                  </Button>
                </CardFooter>
              </Card>

              <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
                <CardHeader>
                  <CardTitle className="text-base">
                    Story Record (ဇာတ်လမ်းမှတ်တမ်း)
                  </CardTitle>
                  <CardDescription>
                    Continue လုပ်တိုင်း ဒီမှတ်တမ်းကို ပြန်ပို့မယ် — series
                    တစ်လျှောက် ဇာတ်ကောင် + ဇာတ်လမ်း မလွဲအောင်။
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  <p>
                    <span className="font-medium">Story Title: </span>
                    ပျောက်သော ထမင်းဆီဆမ်း
                  </p>
                  <p>
                    <span className="font-medium">Genre: </span>
                    မိသားစုဟာသ
                  </p>
                  <p>
                    <span className="font-medium">Central Premise: </span>
                    မနက်ခင်း ထမင်းဆီဆမ်း ပျောက်ဆုံးမှု
                  </p>
                  <p>
                    <span className="font-medium">Main Conflict: </span>
                    မိခင်က သားကို သံသယဝင်သည် — တရားခံအစစ်က ခွေးကလေး
                  </p>
                  <p>
                    <span className="font-medium">Key Turning Point: </span>
                    အိမ်နောက်မှာ နီနီ ထမင်းဆီဆမ်း စားနေသည်ကို တွေ့သည်
                  </p>
                  <p>
                    <span className="font-medium">Ending Type: </span>
                    နွေးထွေးသော မိသားစု အဆုံး
                  </p>
                </CardContent>
              </Card>
            </section>
            )}
          </div>
          )}
        </main>
      </SidebarInset>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings · Gemini API key</DialogTitle>
            <DialogDescription>
              Free key ကို Google AI Studio ကနေ ယူပြီး ဒီမှာထည့်ပါ။ Key က
              ဒီ browser ရဲ့ local storage ထဲမှာပဲ နေမယ်။
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label htmlFor="gemini-key" className="text-sm font-medium">
              Gemini API key
            </label>
            <Input
              id="gemini-key"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="AIza…"
              className="text-base"
            />
          </div>
          <DialogFooter>
            {savedKey && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  try {
                    localStorage.removeItem(GEMINI_KEY_STORAGE)
                  } catch {
                    /* storage unavailable — key stays cleared in state */
                  }
                  setSavedKey(null)
                  setApiKey("")
                  toast.success("Key removed")
                }}
              >
                Remove key
              </Button>
            )}
            <DialogClose
              render={<Button variant="outline" size="lg">Cancel</Button>}
            />
            <Button
              size="lg"
              onClick={() => {
                const key = apiKey.trim()
                if (!key) {
                  toast.error("API key ထည့်ပါ")
                  return
                }
                try {
                  localStorage.setItem(GEMINI_KEY_STORAGE, key)
                } catch {
                  /* storage unavailable — key stays in memory for the session */
                }
                setSavedKey(key)
                setSettingsOpen(false)
                toast.success("Key saved (this browser only)")
              }}
            >
              Save key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Episode ကို ဖျက်မှာလား?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteSavedEpisode
                ? `“${deleteSavedEpisode.title}” နဲ့ သူ့ရဲ့ prompt တွေအားလုံး အပြီးဖျက်သွားမယ်။ ဒါကို ပြန်မရနိုင်ဘူး။`
                : "ဒီ episode ကို အပြီးဖျက်သွားမယ်။ ပြန်မရနိုင်ဘူး။"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="lg"
              onClick={() => {
                if (deleteSavedEpisode) {
                  persistEpisodes(
                    episodes.filter((e) => e.id !== deleteSavedEpisode.id),
                  )
                  if (activeEpisode?.id === deleteSavedEpisode.id) {
                    setActiveEpisode(null)
                  }
                }
                setDeleteTarget(null)
                toast.success("Episode deleted")
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </SidebarProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <AppShell />
      </TooltipProvider>
    </ThemeProvider>
  )
}
