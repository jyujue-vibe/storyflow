import { useEffect, useMemo, useRef, useState } from "react"
import { ThemeProvider, useTheme } from "next-themes"
import {
  AnimatedToastStack,
  useAnimatedToastStack,
} from "@/components/motion/animated-toast-stack"

import logoUrl from "./assets/storyflow-logo.svg"
import {
  BookHeartIcon,
  BookOpenIcon,
  ClapperboardIcon,
  CopyIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  EyeOffIcon,
  FilmIcon,
  MoonIcon,
  PanelLeftIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SettingsIcon,
  SunIcon,
  Trash2Icon,
} from "lucide-react"

import { BouncyAccordion } from "@/components/motion/bouncy-accordion"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CenterMorphModal,
  CenterMorphModalClose,
  CenterMorphModalContent,
} from "@/components/motion/center-morph-modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  AnimatedSidebar,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarInset,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarProvider,
  AnimatedSidebarTrigger,
} from "@/components/motion/animated-sidebar"
import { Textarea } from "@/components/ui/textarea"
import { generateEpisodeText } from "@/lib/gemini"
import { generateEpisodeTextOpenAI } from "@/lib/openai"
import {
  createSyncFile,
  downloadSyncFile,
  fetchUserInfo,
  findSyncFile,
  mergeEpisodes,
  mergeThreadTitles,
  revokeToken,
  updateSyncFile,
  type GoogleUser,
  type SyncFile,
} from "@/lib/drive"
import { parseEpisode, type Episode } from "@/lib/parse"
import { GenerationModal, type GenerationKind } from "@/components/GenerationModal"
import { NovelView } from "@/components/NovelView"
import { BookView } from "@/components/BookView"
import { HomeView, type HomeMode } from "@/components/HomeView"
import {
  CHILDREN_BOOK_INSTRUCTION,
  FIXED_BOOK_CHARACTERS,
  buildCustomBookPrompt,
  buildFixedBookPrompt,
  fixedBookCharacter,
  parseChildBook,
  type ChildBook,
  type CustomBookCharacter,
  type FixedBookCharacterId,
} from "@/lib/childrenBookInstruction"
import {
  NOVEL_INSTRUCTION,
  buildNovelDraftsPrompt,
  buildNovelEpisodePrompt,
  buildStorySoFar,
  parseNovelDrafts,
  parseNovelEpisode,
  type Novel,
  type NovelDraft,
} from "@/lib/novelInstruction"
import {
  buildEpisodeMarkdown,
  buildStoryMarkdown,
  downloadTextFile,
  episodeFileName,
  storyFileName,
} from "@/lib/export"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/motion/tooltip"

// Characters added on the Create form for ONE story thread only —
// never reused across threads (no library). They are sent to Gemini
// as locked CHAR_001, CHAR_002... on Generate.
type StoryCharacter = {
  id: string
  name: string
  age: string
  appearance: string
  behavior: string
}

// Backgrounds added on the Create form for ONE story thread only —
// same rule as characters. They are sent to Gemini as locked
// BG_001, BG_002... on Generate.
type StoryBackground = {
  id: string
  name: string
  description: string
  timeWeather: string
}

const GENRE_OPTIONS = [
  { value: "family", label: "မိသားစုဟာသ" },
  { value: "village", label: "ရွာဟာသ" },
  { value: "adventure", label: "စွန့်စားခန်း" },
  { value: "romance", label: "Romance" },
  { value: "kids", label: "Kids stories" },
  { value: "animal", label: "Animal" },
  { value: "superhero", label: "Superhero" },
  { value: "detective", label: "Detective" },
  { value: "fantasy", label: "Fantasy" },
  { value: "spooky", label: "Spooky Comedy" },
  { value: "friendship", label: "Friendship" },
  { value: "heritage", label: "Heritage" },
  { value: "scifi", label: "Sci-fi" },
  { value: "custom", label: "Custom" },
]

// Random story ideas for the intro "Random idea" button — click inserts one
// (plus its genre) into the Create form. Each idea is a one-line seed JJ can
// edit before generating.
const RANDOM_IDEAS: { genre: string; idea: string }[] = [
  {
    genre: "family",
    idea: "မုန့်ဟင်းခါးအိုး တစ်အိုးလုံး ဘယ်သူခိုးစားသွားလဲ လိုက်ရှာတဲ့ မိသားစု ဟာသဇာတ်လမ်း",
  },
  {
    genre: "village",
    idea: "ရွာထဲက ရေတွင်းထဲ ဖုန်းကျသွားလို့ ဆယ်ဖို့ ကြိုးစားကြတဲ့ ရွာဟာသဇာတ်လမ်း",
  },
  {
    genre: "adventure",
    idea: "မြို့ထဲ ပျောက်သွားတဲ့ ကြောင်လေးကို လိုက်ရှာရင်း မြေအောက်ဈေးကြီးထဲ ရောက်သွားတဲ့ စွန့်စားခန်းဇာတ်လမ်း",
  },
  {
    genre: "romance",
    idea: "ဈေးထဲမှာ နေ့တိုင်း မုန့်ဝယ်ရင်း တွေ့တဲ့ ကောင်လေးနဲ့ ကောင်မလေးရဲ့ ချိုမြိန်တဲ့ အချစ်ဇာတ်လမ်း",
  },
  {
    genre: "kids",
    idea: "ကျောင်းသွားရမှာ ကြောက်တဲ့ ကလေးငယ်က စကားပြောတတ်တဲ့ ကြောင်လေးနဲ့ တွေ့ပြီး ရဲရင့်လာတဲ့ ဇာတ်လမ်း",
  },
  {
    genre: "animal",
    idea: "ပျောက်သွားတဲ့ ဖိနပ်တစ်ရံကို လိုက်ရှာတဲ့ ခွေးကလေး သုံးကောင်ရဲ့ စွန့်စားခန်း",
  },
  {
    genre: "superhero",
    idea: "မိုးရွာတိုင်း အစွမ်းရတဲ့ ကောင်လေးက ရွာကို ရေဘေးကနေ ကယ်တင်တဲ့ ဇာတ်လမ်း",
  },
  {
    genre: "detective",
    idea: "ရွာထဲက ထမင်းဆီဆမ်း ပျောက်မှုကို စုံထောက်ကလေး ဖြေရှင်းတဲ့ လျှို့ဝှက်ဆန်းကြယ် ဇာတ်လမ်း",
  },
  {
    genre: "family",
    idea: "အဖေ့ရဲ့ ဆိုင်ကယ် ပျောက်သွားလို့ တစ်မိသားစုလုံး လိုက်ရှာတဲ့ ဟာသဇာတ်လမ်း",
  },
  {
    genre: "kids",
    idea: "ပန်းခြံထဲမှာ စကားပြောတတ်တဲ့ ငှက်ကလေးနဲ့ မိတ်ဆွေဖြစ်သွားတဲ့ ကလေးမလေးရဲ့ ဇာတ်လမ်း",
  },
  {
    genre: "fantasy",
    idea: "မှော်အိုးလေးတစ်လုံးရလိုက်တဲ့ ကလေးငယ်က ဆုတောင်းတိုင်း ပြောင်းပြန်ဖြစ်နေလို့ ဒုက္ခရောက်တဲ့ မှော်ဆန်း ဇာတ်လမ်း",
  },
  {
    genre: "spooky",
    idea: "ရွာထဲက အိမ်ဟောင်းကြီးထဲ သရဲရှိတယ်ထင်ပြီး ညဘက်သွားကြည့်မှ ရယ်စရာ အမှန်ပေါ်သွားတဲ့ သရဲဟာသ ဇာတ်လမ်း",
  },
  {
    genre: "friendship",
    idea: "ကျောင်းမှာ အသစ်ရောက်လာတဲ့ ကလေးငယ်နဲ့ မိတ်ဆွေဖြစ်ဖို့ ကြိုးစားရင်း ပွဲတစ်ခုမှာ အတူတူ အောင်မြင်သွားတဲ့ မိတ်ဆွေ ဇာတ်လမ်း",
  },
  {
    genre: "heritage",
    idea: "ပုဂံဘုရားကြီးနားမှာ ရှေးဟောင်း ပစ္စည်းလေးတစ်ခု တွေ့လိုက်လို့ သမိုင်းထဲက ဇာတ်လမ်းကို သိသွားတဲ့ မြန်မာ့အမွေ ဇာတ်လမ်း",
  },
  {
    genre: "scifi",
    idea: "စက်ရုပ်လေးတစ်ရုပ် အိမ်ရောက်လာပြီး အိမ်အလုပ်တွေ ကူရင်း ပျော်စရာ ဒုက္ခတွေ ဖြစ်ကုန်တဲ့ သိပ္ပံဆန်းကြယ် ဇာတ်လမ်း",
  },
]

const STYLE_OPTIONS = [
  { value: "cinematic", label: "Cinematic 3D" },
  { value: "chubby", label: "Chubby · Style 23 & 1" },
  { value: "anime", label: "2D Anime" },
  { value: "clay", label: "Clay Stop-motion" },
  { value: "watercolor", label: "Watercolor Storybook" },
  { value: "myanmar", label: "Myanmar Traditional" },
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
const OPENAI_KEY_STORAGE = "mm3d.openaiKey"
const PROVIDER_STORAGE = "mm3d.provider"
type Provider = "gemini" | "openai"
const EPISODES_STORAGE = "mm3d.episodes"
const THREAD_TITLES_STORAGE = "mm3d.threadTitles"
// Multi-mode expansion (2026-10-26): novels and children books live under
// their own keys — the story sidebar keeps story threads only.
const NOVELS_STORAGE = "mm3d.novels"
const CHILD_BOOKS_STORAGE = "mm3d.childBooks"
const CUSTOM_BOOK_CHARS_STORAGE = "mm3d.customBookChars"
const THREAD_FILTER_STORAGE = "mm3d.threadFilter"

/** Sidebar thread filter. Persisted (view-only; never changes thread data). */
type ThreadFilter = "all" | "story" | "novel" | "book" | "documentary"

function loadSavedThreadFilter(): ThreadFilter {
  try {
    const raw = localStorage.getItem(THREAD_FILTER_STORAGE)
    if (
      raw === "all" ||
      raw === "story" ||
      raw === "novel" ||
      raw === "book" ||
      raw === "documentary"
    ) {
      return raw
    }
    return "all"
  } catch {
    return "all"
  }
}
// Google sign-in + Drive appDataFolder sync. The client ID is a public
// identifier (GIS embeds it in the page) — no secret lives in this app.
const GOOGLE_CLIENT_ID =
  "984497454642-jcd2elhkfudar4d42sf6353378pvs4bj.apps.googleusercontent.com"
const GOOGLE_SCOPE =
  "https://www.googleapis.com/auth/drive.appdata openid email profile"
const GOOGLE_SIGNED_IN_STORAGE = "mm3d.googleSignedIn"
// Saved on sign-in so silent restores can name the account (see below).
const GOOGLE_EMAIL_STORAGE = "mm3d.googleEmail"
// Shown when Google granted sign-in but not Drive access.
const SCOPE_ERROR_MESSAGE =
  "Drive access မပေးလို့ sync မရဘူး — Sync now နှိပ်ပြီး Google screen မှာ Drive ကို Allow ပေးပါ"

interface GoogleTokenClient {
  requestAccessToken: (options?: { prompt?: string; hint?: string }) => void
}

interface GoogleAccounts {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string
        scope: string
        callback: (response: {
          access_token?: string
          error?: string
          error_description?: string
        }) => void
      }) => GoogleTokenClient
    }
  }
}

let gisPromise: Promise<GoogleAccounts> | null = null
function loadGisScript(): Promise<GoogleAccounts> {
  if (gisPromise) return gisPromise
  gisPromise = new Promise((resolve, reject) => {
    const existing = (
      window as unknown as { google?: GoogleAccounts }
    ).google
    if (existing?.accounts?.oauth2) {
      resolve(existing)
      return
    }
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => {
      const loaded = (
        window as unknown as { google?: GoogleAccounts }
      ).google
      if (loaded?.accounts?.oauth2) resolve(loaded)
      else reject(new Error("GIS unavailable"))
    }
    script.onerror = () => reject(new Error("GIS failed to load"))
    document.head.appendChild(script)
  })
  return gisPromise
}

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

function loadSavedProvider(): Provider {
  try {
    return localStorage.getItem(PROVIDER_STORAGE) === "openai" ? "openai" : "gemini"
  } catch {
    return "gemini"
  }
}

function loadSavedOpenAIKey(): string | null {
  try {
    return localStorage.getItem(OPENAI_KEY_STORAGE)
  } catch {
    return null
  }
}

// Custom sidebar names for threads (rename). A thread with no override
// falls back to its first episode's title.
function loadThreadTitles(): Record<string, string> {
  try {
    const raw = localStorage.getItem(THREAD_TITLES_STORAGE)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return {}
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (typeof value === "string") out[key] = value
    }
    return out
  } catch {
    return {}
  }
}

// Episodes saved before backgrounds existed lack the new fields — fill
// them so old stories render and Continue/Rewrite without crashing.
function normalizeEpisode(episode: Episode): Episode {
  return {
    ...episode,
    backgrounds: episode.backgrounds ?? [],
    backgroundSheets: episode.backgroundSheets ?? [],
    prompts: (episode.prompts ?? []).map((prompt) => ({
      ...prompt,
      background: prompt.background ?? "",
    })),
  }
}

function loadSavedEpisodes(): Episode[] {
  try {
    const raw = localStorage.getItem(EPISODES_STORAGE)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Legacy migration: episodes saved before threads existed have no
    // threadId. Group them by story (Story Record title, else episode title)
    // so one story's episodes become one thread.
    const groups = new Map<string, string>()
    let legacyCount = 0
    return (parsed as Episode[]).map((episode) => {
      if (episode.threadId) return episode
      const key =
        episode.storyRecord?.title || episode.title || "untitled story"
      let threadId = groups.get(key)
      if (!threadId) {
        legacyCount += 1
        threadId = `thread-legacy-${legacyCount}`
        groups.set(key, threadId)
      }
      return { ...episode, threadId }
    }).map(normalizeEpisode)
  } catch {
    return []
  }
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

// Multi-mode loaders: novels, children books, and saved custom book
// characters. Corrupt or foreign data falls back to empty lists.
function loadSavedNovels(): Novel[] {
  try {
    const raw = localStorage.getItem(NOVELS_STORAGE)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return (parsed as Novel[]).filter(
      (novel) =>
        novel && typeof novel.id === "string" && Array.isArray(novel.episodes),
    )
  } catch {
    return []
  }
}

function loadSavedChildBooks(): ChildBook[] {
  try {
    const raw = localStorage.getItem(CHILD_BOOKS_STORAGE)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return (parsed as ChildBook[]).filter(
      (book) =>
        book && typeof book.id === "string" && Array.isArray(book.pages),
    )
  } catch {
    return []
  }
}

function loadSavedCustomBookChars(): CustomBookCharacter[] {
  try {
    const raw = localStorage.getItem(CUSTOM_BOOK_CHARS_STORAGE)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return (parsed as CustomBookCharacter[]).filter(
      (character) =>
        character &&
        typeof character.id === "string" &&
        typeof character.name === "string",
    )
  } catch {
    return []
  }
}

// Accordion section ids for an episode, in display order. Used for the
// Expand-all button in the fixed right-panel header.

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
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setTheme(dark ? "light" : "dark")}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent arrow>
        <p>{dark ? "Light mode" : "Dark mode"}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function SampleView({
  sceneDuration,
  onCopy,
  toast,
}: {
  sceneDuration: number
  onCopy: (text: string, label: string) => void
  toast: {
    info: (title: string, options?: { description?: string }) => void
  }
}) {
  const totalDuration = 10 * sceneDuration
  return (
    <section className="flex flex-col gap-6">
      <Separator className="my-2" />
      <ClapperboardIcon className="size-5 text-muted-foreground" />
      <div>
        <h2 className="text-lg font-medium">Episode output — နမူနာ</h2>
        <p className="text-sm text-muted-foreground">
          ဒါက UI နမူနာပါ — Generate လုပ်တဲ့အခါ ဒီနေရာမှာ တကယ့်
          episode အပြည့်အစုံ ထွက်မယ်။ Scene 01 ရဲ့ prompt အစစ်ကို
          အောက်မှာ ပြထားတယ်၊ ကျန် scene တွေရဲ့ စာသားတွေက
          ဇာတ်လမ်းအကျဉ်းကနေ ထုတ်ထားတဲ့ နမူနာ arc ပါ။
        </p>
      </div>

            <BouncyAccordion
        defaultValue="details"
        classNames={{ description: "text-foreground pt-4" }}
        items={[
          {
             id: "details",
             title: (
              <>
              ပျောက်သော ထမင်းဆီဆမ်း (Episode 01)
              
              </>
            ),
             description: (
              <>
              <p className="text-sm text-muted-foreground">
                Episode Title &amp; Details
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">မိသားစုဟာသ</Badge>
                <Badge variant="secondary">Cinematic 3D</Badge>
                <Badge variant="secondary">16:9 Landscape</Badge>
                <Badge variant="secondary">
                  10 scenes × {sceneDuration}s = {totalDuration}s
                </Badge>
              </div>
              
              </>
            ),
          },
          {
             id: "summary",
             title: (
              <>
              Story Summary
              
              </>
            ),
             description: (
              <>
              <p className="text-sm leading-relaxed">
                ရွာငယ်လေးက သစ်သားအိမ်မှာ ဒေါ်မြက မနက်ခင်းတိုင်း
                သားလေး ကျော်ကျော်အတွက် ထမင်းဆီဆမ်း ပြင်ပေးတယ်။
                တစ်နေ့မနက် စားပွဲပေါ်က ထမင်းဆီဆမ်း ပျောက်သွားတော့
                ဒေါ်မြက ကျော်ကျော်ကို သံသယဝင်မိတယ်။ ဒါပေမဲ့
                တရားခံအစစ်က အိမ်နောက်မှာ ထမင်းဆီဆမ်း ခိုးစားနေတဲ့
                ခွေးကလေး နီနီ ဖြစ်နေတယ်။ အမှန်သိသွားတော့ မိသားစု
                အားလုံး အတူတကွ ရယ်မောကြတယ်။
              </p>
              
              </>
            ),
          },
          {
             id: "bible",
             title: (
              <>
              Character Bible
              
              </>
            ),
             description: (
              <>
              <div className="flex flex-col gap-4">
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
              </div>
              
              </>
            ),
          },
          {
             id: "sheet",
             title: (
              <>
              CHARACTER SHEET PROMPT — CHAR_001 Daw Mya
              
              </>
            ),
             description: (
              <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Paste this into Flow&apos;s image tool first to get the
                reference sheet — 4 full-body views + 6 expressions —
                then use it as the character reference for the scene
                stills.
              </p>
              <pre className="font-mono overflow-x-auto rounded-lg bg-muted p-5 text-sm leading-relaxed whitespace-pre-wrap sm:p-6 mt-4">
                {SHEET_PROMPT_DAW_MYA}
              </pre>
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  size="lg"
                  onClick={() =>
                    onCopy(SHEET_PROMPT_DAW_MYA, "CHARACTER SHEET — CHAR_001")
                  }
                >
                  <CopyIcon />
                  Copy Character Sheet Prompt
                </Button>
              </div>
              
              </>
            ),
          },
          {
             id: "plan",
             title: (
              <>
              Scene Continuity Plan
              
              </>
            ),
             description: (
              <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Location: သစ်သားအိမ် မီးဖိုဆောင် · မနက်ခင်း —
                တစ်ပိုင်းလုံး ဒီနေရာမှာပဲ။
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground mt-4">
                Background Map: [BG_001] သစ်သားအိမ် မီးဖိုဆောင် —
                မနက်ခင်း၊ သစ်သားအိမ် မီးဖိုဆောင်အပြည့်အစုံ။
              </p>
              <div className="mt-4 flex flex-col gap-4">
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
              </div>
              
              </>
            ),
          },
          {
             id: "scene-01",
             title: (
              <>
              IMAGE PROMPT 01 — Opening close-up
              
              </>
            ),
             description: (
              <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Copy this into Google Flow to generate the still, then use
                the video prompt on the same frame.
              </p>
              <pre className="font-mono overflow-x-auto rounded-lg bg-muted p-5 text-sm leading-relaxed whitespace-pre-wrap sm:p-6 mt-4">
                {`16:9 landscape. Close-up. [CHAR_001] Daw Mya, 42, mother, light-green blouse, pouring oil onto a steaming rice bowl on a wooden table in a Myanmar wooden kitchen, warm morning light. High-quality cinematic 3D cartoon, sharp focus, detailed fabric texture, natural shadows, warm atmospheric lighting. No text, no logo, no watermark.`}
              </pre>
              <pre className="font-mono overflow-x-auto rounded-lg bg-muted p-5 text-sm leading-relaxed whitespace-pre-wrap sm:p-6 mt-4">
                {`16:9 landscape. [BG_001] Myanmar wooden kitchen, wooden table, morning light through the window, warm atmosphere. High-quality cinematic 3D cartoon, sharp focus, detailed texture, natural shadows, warm atmospheric lighting. No text, no logo, no watermark.`}
              </pre>
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() =>
                    onCopy(
                      "16:9 landscape. Close-up. [CHAR_001] Daw Mya, 42, mother, light-green blouse, pouring oil onto a steaming rice bowl on a wooden table in a Myanmar wooden kitchen, warm morning light. High-quality cinematic 3D cartoon, sharp focus, detailed fabric texture, natural shadows, warm atmospheric lighting. No text, no logo, no watermark.",
                      "IMAGE PROMPT 01",
                    )
                  }
                >
                  <CopyIcon />
                  Copy Image Prompt
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() =>
                    onCopy(
                      "16:9 landscape. [BG_001] Myanmar wooden kitchen, wooden table, morning light through the window, warm atmosphere. High-quality cinematic 3D cartoon, sharp focus, detailed texture, natural shadows, warm atmospheric lighting. No text, no logo, no watermark.",
                      "BACKGROUND PROMPT 01",
                    )
                  }
                >
                  <CopyIcon />
                  Copy Background Prompt
                </Button>
                <Button
                  size="lg"
                  onClick={() =>
                    onCopy(
                      `16:9 landscape. Continuous shot ${sceneDuration} seconds. Character [CHAR_001] Daw Mya says in Burmese: "ကျော်ကျော်လေးအတွက် ထမင်းဆီဆမ်းလေး ပြင်ပေးမှာပါ။" One speaker only, gentle loving mother voice, natural pace, Burmese lip-sync, joyful expression. Background ambient sound of birds chirping and gentle breeze.`,
                      "VIDEO PROMPT 01",
                    )
                  }
                >
                  <CopyIcon />
                  Copy Video Prompt
                </Button>
              </div>
              
              </>
            ),
          },
          {
             id: "continuity",
             title: (
              <>
              Continuity Note &amp; Next Episode Hook
              
              </>
            ),
             description: (
              <>
              <div className="flex flex-col gap-4">
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
              </div>
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#2563eb] to-[#0c098c] text-white hover:brightness-110"
                  onClick={() =>
                    toast.info("Episode 2 continue is the next build step", {
                      description:
                        "Continue reuses the same characters, outfits and Story Record.",
                    })
                  }
                >
                  Continue → Episode 02
                </Button>
              </div>
              
              </>
            ),
          },
          {
             id: "record",
             title: (
              <>
              Story Record (ဇာတ်လမ်းမှတ်တမ်း)
              
              </>
            ),
             description: (
              <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Continue လုပ်တိုင်း ဒီမှတ်တမ်းကို ပြန်ပို့မယ် — series
                တစ်လျှောက် ဇာတ်ကောင် + ဇာတ်လမ်း မလွဲအောင်။
              </p>
              <div className="mt-4 flex flex-col gap-4 text-sm">
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
              </div>
              
              </>
            ),
          },
        ]}
      />

      <p className="text-sm text-muted-foreground">
        Scene 02–10 ရဲ့ prompt တွေလည်း ဒီပုံစံအတိုင်းပဲ —
        Generate လုပ်ပြီးမှ အပြည့်အစုံထွက်မယ်။
      </p>
    </section>
  )
}

function EpisodeView({
  episode,
  busy,
  onCopy,
  onContinue,
  hasNextEpisode,
  openSection,
  onOpenSectionChange,
}: {
  episode: Episode
  busy: boolean
  onCopy: (text: string, label: string) => void
  onContinue: (episode: Episode) => void
  hasNextEpisode: boolean
  openSection: string | null
  onOpenSectionChange: (value: string | null) => void
}) {
  const charName = (charId: string) => {
    const found = episode.characters.find((c) => c.id === charId)
    return found ? `${found.name} (${found.transliteration})` : charId
  }
  const bgName = (bgId: string) => {
    const found = episode.backgrounds.find((b) => b.id === bgId)
    if (!found) return bgId
    const name = found.text.split("—")[0]?.trim()
    return name ? name : bgId
  }
  return (
    <section className="flex flex-col gap-6">
            <BouncyAccordion
        value={openSection}
        onValueChange={onOpenSectionChange}
        classNames={{ description: "text-foreground pt-4" }}
        items={[
          {
             id: "details",
             title: (
              <>
              {episode.title} (Episode{" "}
              {String(episode.episodeNumber).padStart(2, "0")})
              
              </>
            ),
             description: (
              <>
              <p className="text-sm text-muted-foreground">
                Episode Title &amp; Details
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {episode.genre && (
                  <Badge variant="secondary">{episode.genre}</Badge>
                )}
                {episode.visualStyle && (
                  <Badge variant="secondary">{episode.visualStyle}</Badge>
                )}
                <Badge variant="secondary">{episode.aspect}</Badge>
                <Badge variant="secondary">
                  10 scenes × {episode.sceneDuration}s ={" "}
                  {episode.totalSeconds}s
                </Badge>
              </div>
              
              </>
            ),
          },
          {
             id: "summary",
             title: (
              <>
              Story Summary
                
              </>
            ),
             description: (
              <>
              <p className="text-sm leading-relaxed">
                {episode.storySummary}
              </p>
                
              </>
            ),
          },
          {
             id: "bible",
             title: (
              <>
              Character Bible
                
              </>
            ),
             description: (
              <>
              <div className="flex flex-col gap-4">
                {episode.characters.map((character) => (
                  <div key={character.id} className="flex flex-col gap-1">
                    <p className="text-sm font-medium">
                      [{character.id}] {character.name} (
                      {character.transliteration})
                      {character.age !== null && ` — ${character.age} နှစ်`}
                      {character.role && `, ${character.role}`}
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {character.description}
                    </p>
                  </div>
                ))}
              </div>
                
              </>
            ),
          },
          {
             id: "sheets",
             title: (
              <>
              CHARACTER SHEET PROMPT
                
              </>
            ),
             description: (
              <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Paste these into Flow&apos;s image tool first to get the
                reference sheets — 4 full-body views + 6 expressions each —
                then use them as the character references for the scene
                stills. Each sheet stays its own copyable prompt.
              </p>
              <div className="mt-4 flex flex-col gap-4">
                {episode.sheetPrompts.map((sheet) => (
                  <div key={sheet.charId} className="flex flex-col gap-4">
                    <span className="text-sm font-medium">
                      CHARACTER SHEET PROMPT — {sheet.charId}{" "}
                      {charName(sheet.charId)}
                    </span>
                    <pre className="font-mono overflow-x-auto rounded-lg bg-muted p-5 text-sm leading-relaxed whitespace-pre-wrap sm:p-6">
                      {sheet.text}
                    </pre>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button
                        size="lg"
                        onClick={() =>
                          onCopy(
                            sheet.text,
                            `CHARACTER SHEET — ${sheet.charId}`,
                          )
                        }
                      >
                        <CopyIcon />
                        Copy Character Sheet Prompt
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
                
              </>
            ),
          },
          {
             id: "background-sheets",
             title: (
              <>
              BACKGROUND SHEET PROMPT
                
              </>
            ),
             description: (
              <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Paste these into Flow&apos;s image tool first to get the
                background references — wide view + angles + detail — then
                use them for the scene stills and background prompts. Each
                sheet stays its own copyable prompt.
              </p>
              <div className="mt-4 flex flex-col gap-4">
                {episode.backgroundSheets.map((sheet) => (
                  <div key={sheet.bgId} className="flex flex-col gap-4">
                    <span className="text-sm font-medium">
                      BACKGROUND SHEET PROMPT — {sheet.bgId}{" "}
                      {bgName(sheet.bgId)}
                    </span>
                    <pre className="font-mono overflow-x-auto rounded-lg bg-muted p-5 text-sm leading-relaxed whitespace-pre-wrap sm:p-6">
                      {sheet.text}
                    </pre>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button
                        size="lg"
                        onClick={() =>
                          onCopy(
                            sheet.text,
                            `BACKGROUND SHEET — ${sheet.bgId}`,
                          )
                        }
                      >
                        <CopyIcon />
                        Copy Background Sheet Prompt
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
                
              </>
            ),
          },
          {
             id: "plan",
             title: (
              <>
              Scene Continuity Plan
                
              </>
            ),
             description: (
              <>
              {episode.location && (
                <p className="text-sm text-muted-foreground">
                  Location: {episode.location}
                </p>
              )}
              {episode.backgrounds.length > 0 && (
                <div className="mt-4 flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    Background Map:
                  </p>
                  {episode.backgrounds.map((background) => (
                    <p
                      key={background.id}
                      className="text-sm leading-relaxed"
                    >
                      [{background.id}] {background.text}
                    </p>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-col gap-4">
                {episode.scenes.map((scene) => (
                  <div key={scene.number} className="flex gap-3 text-sm">
                    <span className="shrink-0 text-muted-foreground">
                      Scene {String(scene.number).padStart(2, "0")} ·{" "}
                      {formatTime(scene.start)}–{formatTime(scene.end)}
                    </span>
                    <span className="leading-relaxed">{scene.line}</span>
                  </div>
                ))}
              </div>
                
              </>
            ),
          },
          ...episode.prompts.map((prompt) => ({
            id: `scene-${prompt.number}`,
            title: (
              <>
                <span className="flex-1">
                  Scene {String(prompt.number).padStart(2, "0")}
                </span>
                <span className="mr-2 shrink-0">
                  {formatTime(prompt.start)}–{formatTime(prompt.end)}
                </span>
                
              </>
            ),
            description: (
              <>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Copy the image prompt into Google Flow to generate the
                  still, the background prompt for the background plate,
                  then use the video prompt on the same frame.
                </p>
                <div className="mt-4 flex flex-col gap-4">
                  {prompt.image && (
                    <div className="flex flex-col gap-4">
                      <span className="text-sm font-medium">
                        IMAGE PROMPT {String(prompt.number).padStart(2, "0")}
                      </span>
                      <pre className="font-mono overflow-x-auto rounded-lg bg-muted p-5 text-sm leading-relaxed whitespace-pre-wrap sm:p-6">
                        {prompt.image}
                      </pre>
                    </div>
                  )}
                  {prompt.background && (
                    <div className="flex flex-col gap-4">
                      <span className="text-sm font-medium">
                        BACKGROUND PROMPT{" "}
                        {String(prompt.number).padStart(2, "0")}
                      </span>
                      <pre className="font-mono overflow-x-auto rounded-lg bg-muted p-5 text-sm leading-relaxed whitespace-pre-wrap sm:p-6">
                        {prompt.background}
                      </pre>
                    </div>
                  )}
                  {prompt.video && (
                    <div className="flex flex-col gap-4">
                      <span className="text-sm font-medium">
                        VIDEO PROMPT {String(prompt.number).padStart(2, "0")}
                      </span>
                      <pre className="font-mono overflow-x-auto rounded-lg bg-muted p-5 text-sm leading-relaxed whitespace-pre-wrap sm:p-6">
                        {prompt.video}
                      </pre>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
                  {prompt.background && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() =>
                        onCopy(
                          prompt.background,
                          `BACKGROUND PROMPT ${String(prompt.number).padStart(2, "0")}`,
                        )
                      }
                    >
                      <CopyIcon />
                      Copy Background Prompt
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
                </div>
                
              </>
            ),
          })),
          {
             id: "continuity",
             title: (
              <>
              Continuity Note &amp; Next Episode Hook
              
              </>
            ),
             description: (
              <>
              <div className="flex flex-col gap-4">
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
              </div>
              {!hasNextEpisode && (
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    size="lg"
                    disabled={busy}
                    onClick={() => onContinue(episode)}
                    className="bg-gradient-to-r from-[#2563eb] to-[#0c098c] text-white hover:brightness-110"
                  >
                    Continue → Episode{" "}
                    {String(episode.episodeNumber + 1).padStart(2, "0")}
                  </Button>
                </div>
              )}
              
              </>
            ),
          },
          {
             id: "record",
             title: (
              <>
              Story Record (ဇာတ်လမ်းမှတ်တမ်း)
              
              </>
            ),
             description: (
              <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Continue လုပ်တိုင်း ဒီမှတ်တမ်းကို ပြန်ပို့မယ် — series
                တစ်လျှောက် ဇာတ်ကောင် + ဇာတ်လမ်း မလွဲအောင်။
              </p>
              <div className="mt-4 flex flex-col gap-4 text-sm">
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
              </div>
              
              </>
            ),
          },
        ]}
      />
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
  const { toasts, showToast, dismissToast } = useAnimatedToastStack()
  // Sonner-shaped adapter: all 28 call sites keep their exact shape
  // (toast.success/error/info with an optional { description }).
  const toast = {
    success: (title: string, options?: { description?: string }) =>
      showToast({ title, status: "success", description: options?.description }),
    error: (title: string, options?: { description?: string }) =>
      showToast({ title, status: "error", description: options?.description }),
    info: (title: string, options?: { description?: string }) =>
      showToast({ title, status: "info", description: options?.description }),
  }
  const [idea, setIdea] = useState("")
  const [genre, setGenre] = useState("family")
  const [customGenre, setCustomGenre] = useState("")
  const [style, setStyle] = useState("cinematic")
  const [customStyle, setCustomStyle] = useState("")
  const [characters, setCharacters] = useState<StoryCharacter[]>([])
  const [characterModalOpen, setCharacterModalOpen] = useState(false)
  const [editingCharacter, setEditingCharacter] =
    useState<StoryCharacter | null>(null)
  const [characterName, setCharacterName] = useState("")
  const [characterAge, setCharacterAge] = useState("")
  const [characterAppearance, setCharacterAppearance] = useState("")
  const [characterBehavior, setCharacterBehavior] = useState("")
  const [backgrounds, setBackgrounds] = useState<StoryBackground[]>([])
  const [backgroundModalOpen, setBackgroundModalOpen] = useState(false)
  const [editingBackground, setEditingBackground] =
    useState<StoryBackground | null>(null)
  const [backgroundName, setBackgroundName] = useState("")
  const [backgroundDescription, setBackgroundDescription] = useState("")
  const [backgroundTimeWeather, setBackgroundTimeWeather] = useState("")
  const [sceneDuration, setSceneDuration] = useState(8)
  const totalDuration = 10 * sceneDuration
  const [ratio, setRatio] = useState("16:9")
  const ratioFull =
    RATIO_OPTIONS.find((option) => option.value === ratio)?.full ??
    "16:9 Landscape"
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [savedKey, setSavedKey] = useState<string | null>(() => loadSavedKey())
  const [provider, setProvider] = useState<Provider>(() => loadSavedProvider())
  const [openAIKey, setOpenAIKey] = useState("")
  const [savedOpenAIKey, setSavedOpenAIKey] = useState<string | null>(() => loadSavedOpenAIKey())
  const activeKey = provider === "openai" ? savedOpenAIKey : savedKey
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [providerDraft, setProviderDraft] = useState<Provider>(provider)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null)
  const [threadTitles, setThreadTitles] = useState<Record<string, string>>(() =>
    loadThreadTitles(),
  )
  const [renameTarget, setRenameTarget] = useState<{
    kind: "story" | "novel" | "book"
    id: string
  } | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [sidebarDelete, setSidebarDelete] = useState<{
    kind: "novel" | "book"
    id: string
    title: string
  } | null>(null)
  const [rewriteTarget, setRewriteTarget] = useState<Episode | null>(null)
  const [rewriteNote, setRewriteNote] = useState("")
  // Google account + Drive sync. The access token lives in memory only
  // (never localStorage) — a reload signs out and silently restores.
  const [googleReady, setGoogleReady] = useState(false)
  const [googleLoadFailed, setGoogleLoadFailed] = useState(false)
  const [googleToken, setGoogleToken] = useState<string | null>(null)
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null)
  const [googleFileId, setGoogleFileId] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle")
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const tokenClientRef = useRef<GoogleTokenClient | null>(null)
  const tokenRef = useRef<string | null>(null)
  const googleFlowRef = useRef<
    "signin" | "restore" | "retry" | "consent" | null
  >(null)
  const consentRequestedRef = useRef(false)
  const syncingRef = useRef(false)
  const syncPendingRef = useRef(false)
  const activeEpisodeRef = useRef<Episode | null>(null)
  const episodesRef = useRef<Episode[]>([])
  const threadTitlesRef = useRef<Record<string, string>>({})
  const [episodes, setEpisodes] = useState<Episode[]>(() => loadSavedEpisodes())
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null)
  // Multi-mode expansion (2026-10-26), home page (#67): 'home' is the
  // new-item create page (welcome + mode cards + middle settings + bottom
  // composer); 'story'/'novel'/'book' are reader views. Story state above
  // is untouched by mode switches, so returning to a story restores it.
  // Drafts are saved novel threads (no transient draft state): a fresh
  // draft and a resumed draft render the same workspace.
  const [mode, setMode] = useState<"home" | "story" | "novel" | "book">(
    "home",
  )
  const [homeMode, setHomeMode] = useState<HomeMode>("story")
  const [novels, setNovels] = useState<Novel[]>(() => loadSavedNovels())
  const [activeNovelId, setActiveNovelId] = useState<string | null>(null)
  const [books, setBooks] = useState<ChildBook[]>(() => loadSavedChildBooks())
  const [activeBookId, setActiveBookId] = useState<string | null>(null)
  const [customBookChars, setCustomBookChars] = useState<
    CustomBookCharacter[]
  >(() => loadSavedCustomBookChars())
  // Book create state lifted to AppShell so the home Enter button can read
  // it (BookView owns only its setup form fields).
  const [bookPicked, setBookPicked] = useState<string>("JJ")
  const [bookSetupOpen, setBookSetupOpen] = useState(false)
  // Incremented by home Reset so NovelView/BookView reset their internal
  // length/picked scratch state (saved threads are never touched).
  const [resetSignal, setResetSignal] = useState(0)
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>(() =>
    loadSavedThreadFilter(),
  )
  const [bookIssues, setBookIssues] = useState<string[]>([])
  const [openSection, setOpenSection] = useState<string | null>("details")
  const [showGuide, setShowGuide] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [loadingPhrase, setLoadingPhrase] = useState(0)

  const [parseIssues, setParseIssues] = useState<string[]>([])
  const [rawFallback, setRawFallback] = useState<string | null>(null)

  const deleteSavedEpisode = episodes.find((e) => e.id === deleteTarget)
  const busy = generating

  // Threads: one story = one thread, no matter how many episodes it has.
  // Episodes keep their saved order (newest first); within a thread they
  // sort by episode number for the Ep buttons.
  const threads = useMemo(() => {
    const order: string[] = []
    const byId = new Map<string, Episode[]>()
    for (const episode of episodes) {
      const id = episode.threadId || "thread-legacy-0"
      if (!byId.has(id)) {
        byId.set(id, [])
        order.push(id)
      }
      byId.get(id)!.push(episode)
    }
    return order.map((id) => {
      const sorted = [...byId.get(id)!].sort(
        (a, b) => a.episodeNumber - b.episodeNumber,
      )
      const first =
        sorted.find((episode) => episode.episodeNumber === 1) ?? sorted[0]
      return {
        id,
        title:
          threadTitles[id] ||
          first?.title ||
          first?.storyRecord?.title ||
          "Untitled story",
        episodes: sorted,
      }
    })
  }, [episodes, threadTitles])
  const activeThread = activeEpisode
    ? (threads.find((thread) => thread.id === activeEpisode.threadId) ?? null)
    : null
  // Once the next episode exists, the current one must not offer Continue
  // anymore — otherwise it would generate a duplicate next episode.
  const activeHasNext = activeEpisode
    ? episodes.some(
        (e) =>
          e.threadId === activeEpisode.threadId &&
          e.episodeNumber === activeEpisode.episodeNumber + 1,
      )
    : false
  const deleteThread = threads.find((thread) => thread.id === deleteThreadId) ?? null
  // Later episodes in the rewrite target's thread — rewriting an episode
  // deletes these (they continued the old story), so the dialog warns first.
  const rewriteLater = rewriteTarget
    ? episodes.filter(
        (e) =>
          e.threadId === rewriteTarget.threadId &&
          e.episodeNumber > rewriteTarget.episodeNumber,
      )
    : []

  // Keep refs fresh for the Google callbacks (the GIS token callback is
  // created once on mount and would otherwise see stale state).
  useEffect(() => {
    activeEpisodeRef.current = activeEpisode
  }, [activeEpisode])
  useEffect(() => {
    episodesRef.current = episodes
  }, [episodes])
  useEffect(() => {
    threadTitlesRef.current = threadTitles
  }, [threadTitles])

  function setToken(token: string | null) {
    tokenRef.current = token
    setGoogleToken(token)
  }

  function buildSyncFile(): SyncFile {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      episodes: episodesRef.current,
      threadTitles: threadTitlesRef.current,
    }
  }

  function signOutGoogle() {
    if (tokenRef.current) revokeToken(tokenRef.current)
    setToken(null)
    setGoogleUser(null)
    setGoogleFileId(null)
    setSyncStatus("idle")
    setLastSyncedAt(null)
    setSyncError(null)
    consentRequestedRef.current = false
    try {
      localStorage.removeItem(GOOGLE_SIGNED_IN_STORAGE)
      localStorage.removeItem(GOOGLE_EMAIL_STORAGE)
    } catch {
      /* ignore */
    }
  }

  function requestGoogleToken(
    flow: "signin" | "restore" | "retry" | "consent",
  ) {
    const client = tokenClientRef.current
    if (!client) return
    googleFlowRef.current = flow
    // Silent flows (restore on load, retry after expiry) must use
    // prompt: "none" — a hidden iframe, no popup at all. An empty prompt
    // was treated as "show UI as needed", which popped the Google login
    // window on every page refresh.
    // The saved email goes as `hint`: without it, Google cannot pick an
    // account silently when several are signed in, so the silent request
    // fails and every refresh drops the connection.
    if (flow === "signin") {
      client.requestAccessToken()
      return
    }
    if (flow === "consent") {
      client.requestAccessToken({ prompt: "consent" })
      return
    }
    let savedEmail: string | null = null
    try {
      savedEmail = localStorage.getItem(GOOGLE_EMAIL_STORAGE)
    } catch {
      /* ignore */
    }
    client.requestAccessToken(
      savedEmail ? { prompt: "none", hint: savedEmail } : { prompt: "none" },
    )
  }

  function signInGoogle() {
    requestGoogleToken("signin")
  }

  async function syncToDrive() {
    const token = tokenRef.current
    if (!token) return
    // Serialize uploads: a change that lands mid-upload re-runs after it
    // instead of racing it (last writer would otherwise win with older data).
    if (syncingRef.current) {
      syncPendingRef.current = true
      return
    }
    syncingRef.current = true
    setSyncStatus("syncing")
    setSyncError(null)
    try {
      const existingId =
        googleFileId ?? (await findSyncFile(token))?.id ?? null
      if (existingId) {
        await updateSyncFile(token, existingId, buildSyncFile())
        setGoogleFileId(existingId)
      } else {
        const created = await createSyncFile(token, buildSyncFile())
        setGoogleFileId(created.id)
      }
      setSyncStatus("synced")
      setLastSyncedAt(new Date().toISOString())
      consentRequestedRef.current = false
    } catch (error) {
      if (error instanceof Error && error.message === "GOOGLE_TOKEN_EXPIRED") {
        requestGoogleToken("retry")
        return
      }
      if (
        error instanceof Error &&
        error.message === "GOOGLE_INSUFFICIENT_SCOPES"
      ) {
        if (!consentRequestedRef.current) {
          // Token lacks the Drive scope — pop the consent screen again so
          // the user can allow Drive. The consent success path re-syncs.
          consentRequestedRef.current = true
          syncPendingRef.current = false
          requestGoogleToken("consent")
          return
        }
        setSyncStatus("error")
        setSyncError(SCOPE_ERROR_MESSAGE)
        toast.error(SCOPE_ERROR_MESSAGE)
        return
      }
      setSyncStatus("error")
      toast.error(
        error instanceof Error ? error.message : "Google sync failed.",
      )
    } finally {
      syncingRef.current = false
      if (syncPendingRef.current) {
        syncPendingRef.current = false
        void syncToDrive()
      }
    }
  }

  async function syncFromDrive(token: string) {
    setSyncStatus("syncing")
    setSyncError(null)
    const meta = await findSyncFile(token)
    if (!meta) {
      // First sign-in on this account: push local stories up.
      const created = await createSyncFile(token, buildSyncFile())
      setGoogleFileId(created.id)
      setSyncStatus("synced")
      setLastSyncedAt(new Date().toISOString())
      consentRequestedRef.current = false
      return
    }
    setGoogleFileId(meta.id)
    const remote = await downloadSyncFile(token, meta.id)
    const mergedEpisodes = mergeEpisodes(
      episodesRef.current,
      remote.episodes,
    ).map(normalizeEpisode)
    const mergedTitles = mergeThreadTitles(
      threadTitlesRef.current,
      remote.threadTitles,
    )
    persistEpisodes(mergedEpisodes)
    persistThreadTitles(mergedTitles)
    // Push the merged result back so the cloud also gets local-only stories.
    await updateSyncFile(token, meta.id, {
      version: 1,
      updatedAt: new Date().toISOString(),
      episodes: mergedEpisodes,
      threadTitles: mergedTitles,
    })
    setSyncStatus("synced")
    setLastSyncedAt(new Date().toISOString())
    consentRequestedRef.current = false
    // #67 landing rule: after sync the app STAYS on the home page. Threads
    // open only when the user clicks one in the sidebar — never
    // automatically (the old fresh-device auto-jump lived here).
  }

  async function handleGoogleToken(response: {
    access_token?: string
    error?: string
  }) {
    const flow = googleFlowRef.current
    googleFlowRef.current = null
    if (response.error || !response.access_token) {
      // Silent restore failing just means "sign in again" — no noise.
      if (flow === "signin") {
        toast.error("Google sign-in failed. Please try again.")
      } else if (flow === "retry") {
        signOutGoogle()
        toast.error("Google session expired — please sign in again.")
      } else if (flow === "consent") {
        setSyncStatus("error")
        setSyncError(SCOPE_ERROR_MESSAGE)
        toast.error(SCOPE_ERROR_MESSAGE)
      }
      return
    }
    const token = response.access_token
    setToken(token)
    try {
      const user = await fetchUserInfo(token)
      setGoogleUser(user)
      try {
        localStorage.setItem(GOOGLE_SIGNED_IN_STORAGE, "1")
        if (user.email) {
          localStorage.setItem(GOOGLE_EMAIL_STORAGE, user.email)
        }
      } catch {
        /* ignore */
      }
      await syncFromDrive(token)
    } catch (error) {
      if (error instanceof Error && error.message === "GOOGLE_TOKEN_EXPIRED") {
        requestGoogleToken("retry")
        return
      }
      if (
        error instanceof Error &&
        error.message === "GOOGLE_INSUFFICIENT_SCOPES"
      ) {
        if (!consentRequestedRef.current) {
          consentRequestedRef.current = true
          requestGoogleToken("consent")
          return
        }
        setSyncStatus("error")
        setSyncError(SCOPE_ERROR_MESSAGE)
        toast.error(SCOPE_ERROR_MESSAGE)
        return
      }
      setSyncStatus("error")
      toast.error(
        error instanceof Error ? error.message : "Google sync failed.",
      )
    }
  }

  // Load Google Identity Services once, then create the token client.
  useEffect(() => {
    let cancelled = false
    loadGisScript()
      .then((accounts) => {
        if (cancelled) return
        tokenClientRef.current = accounts.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: GOOGLE_SCOPE,
          callback: (response) => {
            void handleGoogleToken(response)
          },
        })
        setGoogleReady(true)
      })
      .catch(() => {
        if (!cancelled) setGoogleLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Try to restore the Google session silently on load (no popup).
  useEffect(() => {
    if (!googleReady) return
    let signedIn = false
    try {
      signedIn = localStorage.getItem(GOOGLE_SIGNED_IN_STORAGE) === "1"
    } catch {
      /* ignore */
    }
    if (signedIn && !tokenRef.current) {
      requestGoogleToken("restore")
    }
  }, [googleReady])

  // Auto-upload to Drive a moment after stories change, while signed in.
  // Uploads never change episodes/threadTitles, so this cannot loop.
  useEffect(() => {
    if (!googleToken) return
    const timer = setTimeout(() => {
      void syncToDrive()
    }, 2000)
    return () => clearTimeout(timer)
  }, [episodes, threadTitles, googleToken, googleFileId])

  useEffect(() => {
    if (!generating) return
    const timer = setInterval(
      () => setLoadingPhrase((phrase) => (phrase + 1) % LOADING_PHRASES.length),
      2000,
    )
    return () => clearInterval(timer)
  }, [generating])

  useEffect(() => {
    if (settingsOpen) {
      if (savedKey) setApiKey(savedKey)
      if (savedOpenAIKey) setOpenAIKey(savedOpenAIKey)
      setProviderDraft(provider)
      setShowKey(false)
    }
  }, [settingsOpen, savedKey, savedOpenAIKey, provider])

  // Switching episodes re-opens only the details section (EpisodeView used
  // to reset this by remounting; the state now lives here for the fixed
  // right-panel header's Expand/Collapse buttons).
  useEffect(() => {
    setOpenSection("details")
  }, [activeEpisode?.id])

  function copyPrompt(text: string, label: string) {
    void navigator.clipboard?.writeText(text).catch(() => {
      /* clipboard unavailable in some browsers; toast still confirms the action */
    })
    toast.success(`${label} copied`, {
      description: "Paste it into Google Flow.",
    })
  }

  function exportEpisode(episode: Episode) {
    try {
      const filename = episodeFileName(episode)
      downloadTextFile(filename, buildEpisodeMarkdown(episode))
      toast.success("Exported", { description: filename })
    } catch {
      toast.error("Export failed — try again")
    }
  }

  function exportStory(thread: {
    id: string
    title: string
    episodes: Episode[]
  }) {
    try {
      const filename = storyFileName(thread.title)
      downloadTextFile(
        filename,
        buildStoryMarkdown(thread.title, thread.episodes),
      )
      toast.success("Exported", { description: filename })
    } catch {
      toast.error("Export failed — try again")
    }
  }

  function persistEpisodes(next: Episode[]) {
    setEpisodes(next)
    try {
      localStorage.setItem(EPISODES_STORAGE, JSON.stringify(next))
    } catch {
      /* storage full or unavailable — episodes stay in memory for the session */
    }
  }

  function persistThreadTitles(next: Record<string, string>) {
    setThreadTitles(next)
    try {
      localStorage.setItem(THREAD_TITLES_STORAGE, JSON.stringify(next))
    } catch {
      /* storage full or unavailable — titles stay in memory for the session */
    }
  }

  // Multi-mode persist helpers — same try/catch shape as persistEpisodes.
  function persistNovels(next: Novel[]) {
    setNovels(next)
    try {
      localStorage.setItem(NOVELS_STORAGE, JSON.stringify(next))
    } catch {
      /* storage full or unavailable — novels stay in memory for the session */
    }
  }

  function persistBooks(next: ChildBook[]) {
    setBooks(next)
    try {
      localStorage.setItem(CHILD_BOOKS_STORAGE, JSON.stringify(next))
    } catch {
      /* storage full or unavailable — books stay in memory for the session */
    }
  }

  function persistCustomBookChars(next: CustomBookCharacter[]) {
    setCustomBookChars(next)
    try {
      localStorage.setItem(CUSTOM_BOOK_CHARS_STORAGE, JSON.stringify(next))
    } catch {
      /* storage full or unavailable — characters stay in memory */
    }
  }

  const activeNovel = useMemo(
    () => novels.find((novel) => novel.id === activeNovelId) ?? null,
    [novels, activeNovelId],
  )

  const activeBook = useMemo(
    () => books.find((book) => book.id === activeBookId) ?? null,
    [books, activeBookId],
  )

  function deleteNovel(id: string) {
    persistNovels(novels.filter((novel) => novel.id !== id))
    // Deleting what you're viewing lands back on home (#67).
    if (activeNovelId === id) {
      setActiveNovelId(null)
      setMode("home")
    }
  }

  function deleteBook(id: string) {
    persistBooks(books.filter((book) => book.id !== id))
    if (activeBookId === id) {
      setActiveBookId(null)
      setBookIssues([])
      setMode("home")
    }
  }

  /** Home = the new-item create page. Clears every active reader. */
  function goHome(mode?: HomeMode) {
    setActiveEpisode(null)
    setActiveNovelId(null)
    setActiveBookId(null)
    setRawFallback(null)
    setParseIssues([])
    setBookIssues([])
    setShowGuide(false)
    if (mode) setHomeMode(mode)
    setMode("home")
  }

  /** Home Reset: input + story settings back to defaults, mode kept.
   * Saved threads are never touched. */
  function handleHomeReset() {
    setIdea("")
    setGenre("family")
    setCustomGenre("")
    setStyle("cinematic")
    setCustomStyle("")
    setSceneDuration(8)
    setRatio("16:9")
    setCharacters([])
    setBackgrounds([])
    setBookPicked("JJ")
    setResetSignal((n) => n + 1)
  }

  /** Home Random: a random idea from the existing pool (story mode also
   * takes the pool entry's genre, matching the old create view). */
  function handleHomeRandom() {
    const candidates = RANDOM_IDEAS.filter((entry) => entry.idea !== idea)
    const list = candidates.length > 0 ? candidates : RANDOM_IDEAS
    const pick = list[Math.floor(Math.random() * list.length)]
    if (homeMode === "story") setGenre(pick.genre)
    setIdea(pick.idea)
  }

  /** Home Enter: the ONLY way generation starts from home. */
  function handleHomeEnter() {
    const text = idea.trim()
    if (!text) {
      toast.error("Idea ထည့်ပါ", {
        description: "Idea တစ်ကြောင်း အရင်ရိုက်ပါ။",
      })
      return
    }
    if (homeMode === "story") {
      void handleGenerate()
      return
    }
    if (homeMode === "novel") {
      void runNovelDrafts(text)
      return
    }
    const fixed = FIXED_BOOK_CHARACTERS.find((c) => c.id === bookPicked)
    if (fixed) {
      void runBook({
        fixedId: fixed.id,
        custom: null,
        topic: text,
        characterId: fixed.id,
        characterName: fixed.shortLabel,
      })
      return
    }
    const custom = customBookChars.find((c) => c.id === bookPicked)
    if (custom) {
      void runBook({
        fixedId: null,
        custom,
        topic: text,
        characterId: custom.id,
        characterName: custom.name,
      })
      return
    }
    // "new-custom" with no saved character yet: open setup first.
    setBookSetupOpen(true)
    toast.info("Character setup အရင် လုပ်ပါ", {
      description: "Character အသစ် ဆောက်ပြီးမှ Enter နှိပ်ပါ။",
    })
  }

  function saveCustomBookCharacter(
    character: Omit<CustomBookCharacter, "id">,
  ): string {
    const id = `bookchar-${Date.now()}`
    persistCustomBookChars([...customBookChars, { ...character, id }])
    return id
  }

  function showEpisode(episode: Episode | null) {
    setActiveEpisode(episode)
    setRawFallback(null)
    setParseIssues([])
  }

  function showThread(thread: { episodes: Episode[] }) {
    const latest = thread.episodes[thread.episodes.length - 1]
    if (latest) showEpisode(latest)
  }

  const effectiveGenre =
    genre === "custom"
      ? customGenre.trim()
      : (GENRE_OPTIONS.find((option) => option.value === genre)?.label ?? "")
  const effectiveStyle =
    style === "custom"
      ? customStyle.trim()
      : (STYLE_OPTIONS.find((option) => option.value === style)?.label ?? "")

  function openNewCharacter() {
    setEditingCharacter(null)
    setCharacterName("")
    setCharacterAge("")
    setCharacterAppearance("")
    setCharacterBehavior("")
    setCharacterModalOpen(true)
  }

  function openEditCharacter(character: StoryCharacter) {
    setEditingCharacter(character)
    setCharacterName(character.name)
    setCharacterAge(character.age)
    setCharacterAppearance(character.appearance)
    setCharacterBehavior(character.behavior)
    setCharacterModalOpen(true)
  }

  function saveCharacter() {
    const name = characterName.trim()
    if (!name) {
      toast.error("နာမည် ထည့်ပါ", {
        description: "Character နာမည်က မဖြစ်မနေ လိုတယ်။",
      })
      return
    }
    const next = {
      name,
      age: characterAge.trim(),
      appearance: characterAppearance.trim(),
      behavior: characterBehavior.trim(),
    }
    if (editingCharacter) {
      setCharacters(
        characters.map((item) =>
          item.id === editingCharacter.id ? { ...item, ...next } : item,
        ),
      )
    } else {
      setCharacters([...characters, { id: `char-${Date.now()}`, ...next }])
    }
    setCharacterModalOpen(false)
  }

  function characterMiniDescription(character: StoryCharacter): string {
    const text = [character.appearance, character.behavior]
      .filter(Boolean)
      .join(" — ")
    return text.length > 90 ? `${text.slice(0, 90)}…` : text
  }

  function buildCharacterLines(list: StoryCharacter[]): string {
    return list
      .map((character, index) => {
        const id = `CHAR_${String(index + 1).padStart(3, "0")}`
        const ageText = character.age
          ? /^\d+$/.test(character.age)
            ? `${character.age} years old`
            : character.age
          : ""
        const parts = [
          character.name,
          ageText,
          character.appearance,
          character.behavior,
        ]
          .filter(Boolean)
          .join(" — ")
        return `${id} ${parts}`
      })
      .join("\n")
  }

  function openNewBackground() {
    setEditingBackground(null)
    setBackgroundName("")
    setBackgroundDescription("")
    setBackgroundTimeWeather("")
    setBackgroundModalOpen(true)
  }

  function openEditBackground(background: StoryBackground) {
    setEditingBackground(background)
    setBackgroundName(background.name)
    setBackgroundDescription(background.description)
    setBackgroundTimeWeather(background.timeWeather)
    setBackgroundModalOpen(true)
  }

  function saveBackground() {
    const name = backgroundName.trim()
    if (!name) {
      toast.error("နာမည် ထည့်ပါ", {
        description: "Background နာမည်က မဖြစ်မနေ လိုတယ်။",
      })
      return
    }
    const next = {
      name,
      description: backgroundDescription.trim(),
      timeWeather: backgroundTimeWeather.trim(),
    }
    if (editingBackground) {
      setBackgrounds(
        backgrounds.map((item) =>
          item.id === editingBackground.id ? { ...item, ...next } : item,
        ),
      )
    } else {
      setBackgrounds([...backgrounds, { id: `bg-${Date.now()}`, ...next }])
    }
    setBackgroundModalOpen(false)
  }

  function backgroundMiniDescription(background: StoryBackground): string {
    const text = [background.description, background.timeWeather]
      .filter(Boolean)
      .join(" — ")
    return text.length > 90 ? `${text.slice(0, 90)}…` : text
  }

  function buildBackgroundLines(list: StoryBackground[]): string {
    return list
      .map((background, index) => {
        const id = `BG_${String(index + 1).padStart(3, "0")}`
        const parts = [
          background.name,
          background.description,
          background.timeWeather,
        ]
          .filter(Boolean)
          .join(" — ")
        return `${id} ${parts}`
      })
      .join("\n")
  }

  // Locked backgrounds of a saved episode, for Continue/Rewrite: the
  // Background Map entries as stored, or the episode's location as BG_001
  // for episodes made before backgrounds existed.
  function episodeBackgroundLines(episode: Episode): string {
    if (episode.backgrounds.length > 0) {
      return episode.backgrounds
        .map((background) => `[${background.id}] ${background.text}`)
        .join("\n")
    }
    return episode.location ? `[BG_001] ${episode.location}` : ""
  }

  function buildUserPrompt(
    ideaText: string,
    genreText: string,
    styleText: string,
    duration: number,
    ratioLabel: string,
    characterLines?: string,
    backgroundLines?: string,
  ): string {
    const charactersBlock = characterLines
      ? `\nLocked characters — use these EXACTLY, same names, ages, looks, outfits and behaviour, as CHAR_001, CHAR_002... in this order. Only add new characters with the NEXT free CHAR IDs if the story needs them:\n${characterLines}`
      : ""
    const backgroundsBlock = backgroundLines
      ? `\nLocked backgrounds — use these EXACTLY, same names, looks, details and time & weather, as BG_001, BG_002... in this order. Only add new backgrounds with the NEXT free BG IDs if the story needs them:\n${backgroundLines}`
      : ""
    return `${ideaText}\nGenre: ${genreText}\nVisual Style: ${styleText}\nScene duration: ${duration} seconds per scene (10 scenes, ${10 * duration} seconds total).\nAspect ratio: ${ratioLabel}.${charactersBlock}${backgroundsBlock}`
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
    const backgroundLines = episodeBackgroundLines(episode)
    const backgroundsBlock = backgroundLines
      ? `Backgrounds — reuse exactly, same BG IDs, names and descriptions:\n${backgroundLines}\n`
      : ""
    return `ဆက်ပါ — Episode ${episode.episodeNumber + 1} ${duration}sec ဆက်ပေးပါ။\nGenre: ${episode.genre} — reuse this EXACTLY in Title & Details, do not reword.\nVisual Style: ${episode.visualStyle} — reuse this EXACTLY in Title & Details and in every image prompt, do not change.\nSeries memory (Story Record):\n- Story Title: ${record.title}\n- Central Premise: ${record.premise}\n- Main Conflict: ${record.conflict}\n- Key Turning Point: ${record.turningPoint}\n- Ending Type: ${record.endingType}\nCharacters — reuse exactly, same CHAR IDs, outfits and voices:\n${characterLines}\n${backgroundsBlock}Previous episode hook: ${episode.hook}\nScene duration: ${duration} seconds per scene (10 scenes, ${10 * duration} seconds total).\nAspect ratio: ${ratioLabel}.`
  }

  // Generation modal state: the modal is open while generating or while a
  // generation error is shown. A run token + AbortController make aborts and
  // retries safe: a stale run's late result can never persist or navigate.
  const [genKind, setGenKind] = useState<GenerationKind>("generate")
  const [genError, setGenError] = useState<string | null>(null)
  const [genSlow, setGenSlow] = useState(false)
  const genController = useRef<AbortController | null>(null)
  const genRunId = useRef(0)
  const genSlowTimer = useRef<number | null>(null)
  type GenLastRun =
    | {
        kind: "generate" | "continue"
        userPrompt: string
        duration: number
        aspectLabel: string
        threadId: string
      }
    | { kind: "rewrite"; episode: Episode; note: string }
    | { kind: "novel-drafts"; idea: string }
    | {
        kind: "novel-episode"
        novelId: string
        episodeNumber: number
        totalEpisodes: number
        draft: NovelDraft | null
      }
    | {
        kind: "book"
        fixedId: FixedBookCharacterId | null
        custom: CustomBookCharacter | null
        topic: string
        characterId: string
        characterName: string
      }
  const genLastRun = useRef<GenLastRun | null>(null)

  function clearGenSlowTimer() {
    if (genSlowTimer.current !== null) {
      clearTimeout(genSlowTimer.current)
      genSlowTimer.current = null
    }
  }

  function beginGen(kind: GenerationKind, lastRun: GenLastRun) {
    clearGenSlowTimer()
    genLastRun.current = lastRun
    setGenKind(kind)
    setGenError(null)
    setGenSlow(false)
    genController.current = new AbortController()
    genRunId.current += 1
    const myRun = genRunId.current
    genSlowTimer.current = window.setTimeout(() => {
      if (genRunId.current === myRun) setGenSlow(true)
    }, 180000)
  }

  function abortGen() {
    genController.current?.abort()
    genRunId.current += 1
    clearGenSlowTimer()
    setGenerating(false)
    setGenSlow(false)
    setGenError(null)
  }

  function retryGen() {
    const last = genLastRun.current
    if (!last) return
    genController.current?.abort()
    genRunId.current += 1
    clearGenSlowTimer()
    setGenError(null)
    setGenSlow(false)
    setGenerating(false)
    if (last.kind === "rewrite") {
      void runRewrite(last.episode, last.note)
    } else if (last.kind === "novel-drafts") {
      void runNovelDrafts(last.idea)
    } else if (last.kind === "novel-episode") {
      void runNovelEpisode(last)
    } else if (last.kind === "book") {
      void runBook(last)
    } else {
      void runGenerate(
        last.kind,
        last.userPrompt,
        last.duration,
        last.aspectLabel,
        last.threadId,
      )
    }
  }

  function generateWithProvider(
    key: string,
    prompt: string,
    opts: { signal?: AbortSignal; systemInstruction?: string },
  ) {
    return provider === "openai"
      ? generateEpisodeTextOpenAI(key, prompt, opts)
      : generateEpisodeText(key, prompt, opts)
  }

  async function runGenerate(
    kind: "generate" | "continue",
    userPrompt: string,
    duration: number,
    aspectLabel: string,
    threadId: string,
  ) {
    if (!activeKey) {
      setSettingsOpen(true)
      toast.info(
        provider === "openai" ? "OpenAI API key လိုတယ်" : "Gemini API key လိုတယ်",
        {
          description:
            provider === "openai"
              ? "Settings မှာ OpenAI key ထည့်ပြီးမှ Generate နှိပ်ပါ။"
              : "Settings မှာ free key ထည့်ပြီးမှ Generate နှိပ်ပါ။",
        },
      )
      return
    }
    beginGen(kind, { kind, userPrompt, duration, aspectLabel, threadId })
    const myRun = genRunId.current
    setGenerating(true)
    setLoadingPhrase(0)
    setRawFallback(null)
    setParseIssues([])
    try {
      const text = await generateWithProvider(activeKey, userPrompt, {
        signal: genController.current?.signal,
      })
      if (myRun !== genRunId.current) return
      const { episode, issues } = parseEpisode(text, {
        sceneDuration: duration,
        threadId,
      })
      if (!episode) {
        setRawFallback(text)
        setParseIssues(issues)
        setGenSlow(false)
        setGenError(
          "Episode ကို parse လုပ်လို့မရဘူး။ Raw output ကို အောက်မှာ ပြထားတယ်။",
        )
        return
      }
      episode.aspect = aspectLabel
      persistEpisodes([episode, ...episodes])
      setActiveEpisode(episode)
      // Generation started from home lands on the new episode (#67).
      setMode("story")
      setParseIssues(issues)
      toast.success("Episode ရပြီ", {
        description: `${episode.title} (Episode ${String(episode.episodeNumber).padStart(2, "0")})`,
      })
    } catch (error) {
      if (myRun !== genRunId.current) return
      setGenSlow(false)
      setGenError(
        error instanceof Error
          ? error.message
          : "Generate လုပ်လို့မရဘူး။ ပြန်စမ်းပါ။",
      )
    } finally {
      if (myRun === genRunId.current) {
        setGenerating(false)
        clearGenSlowTimer()
      }
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
      "generate",
      buildUserPrompt(
        idea.trim(),
        effectiveGenre,
        effectiveStyle,
        sceneDuration,
        ratioFull,
        characters.length > 0 ? buildCharacterLines(characters) : undefined,
        backgrounds.length > 0 ? buildBackgroundLines(backgrounds) : undefined,
      ),
      sceneDuration,
      ratioFull,
      `thread-${Date.now()}`,
    )
  }

  async function handleContinue(episode: Episode) {
    await runGenerate(
      "continue",
      buildContinuePrompt(episode, sceneDuration, ratioFull),
      sceneDuration,
      ratioFull,
      episode.threadId,
    )
  }

  function buildRewritePrompt(episode: Episode, note: string): string {
    const characterLines = episode.characters
      .map(
        (character) =>
          `[${character.id}] ${character.name} (${character.transliteration}) — ${character.description}`,
      )
      .join("\n")
    const previous = episodes.find(
      (e) =>
        e.threadId === episode.threadId &&
        e.episodeNumber === episode.episodeNumber - 1,
    )
    const lines = [
      `Episode ${episode.episodeNumber} ကို အသစ်ပြန်ရေးပေးပါ — လုံးဝ ဇာတ်လမ်းအသစ် ဖြစ်ရမယ်။`,
      `Genre: ${episode.genre}`,
      `Visual Style: ${episode.visualStyle}`,
      `Characters — reuse exactly, same CHAR IDs, outfits and voices:`,
      characterLines,
    ]
    const rewriteBackgroundLines = episodeBackgroundLines(episode)
    if (rewriteBackgroundLines) {
      lines.push(
        `Backgrounds — reuse exactly, same BG IDs, names and descriptions:\n${rewriteBackgroundLines}`,
      )
    }
    if (previous) {
      lines.push(`Previous episode summary: ${previous.storySummary}`)
      lines.push(`Previous episode hook: ${previous.hook}`)
    }
    lines.push(
      `Previous version of this episode (do NOT repeat this story — write a different one): ${episode.storySummary}`,
    )
    if (note.trim()) {
      lines.push(`User's rewrite note: ${note.trim()}`)
    }
    lines.push(
      `Scene duration: ${episode.sceneDuration} seconds per scene (10 scenes, ${10 * episode.sceneDuration} seconds total).`,
    )
    lines.push(`Aspect ratio: ${episode.aspect}.`)
    return lines.join("\n")
  }

  async function runRewrite(episode: Episode, note: string) {
    if (generating) return
    if (!activeKey) {
      setSettingsOpen(true)
      toast.info(
        provider === "openai" ? "OpenAI API key လိုတယ်" : "Gemini API key လိုတယ်",
        {
          description:
            provider === "openai"
              ? "Settings မှာ OpenAI key ထည့်ပြီးမှ Rewrite နှိပ်ပါ။"
              : "Settings မှာ free key ထည့်ပြီးမှ Rewrite နှိပ်ပါ။",
        },
      )
      return
    }
    beginGen("rewrite", { kind: "rewrite", episode, note })
    const myRun = genRunId.current
    setGenerating(true)
    setLoadingPhrase(0)
    try {
      const text = await generateWithProvider(
        activeKey,
        buildRewritePrompt(episode, note),
        { signal: genController.current?.signal },
      )
      if (myRun !== genRunId.current) return
      const { episode: fresh, issues } = parseEpisode(text, {
        sceneDuration: episode.sceneDuration,
        threadId: episode.threadId,
      })
      if (!fresh) {
        setGenSlow(false)
        setGenError(
          "Rewrite ကို parse လုပ်လို့မရဘူး။ အဟောင်း episode အတိုင်း ကျန်ပါတယ် — ပြန်စမ်းပါ။",
        )
        return
      }
      // Same id/number/thread: the rewrite replaces the old episode in
      // place, so Drive sync converges on the new version once the
      // debounced auto-upload pushes it.
      fresh.id = episode.id
      fresh.episodeNumber = episode.episodeNumber
      fresh.threadId = episode.threadId
      fresh.aspect = episode.aspect
      const next = episodes
        .filter(
          (e) =>
            !(
              e.threadId === episode.threadId &&
              e.episodeNumber > episode.episodeNumber
            ),
        )
        .map((e) => (e.id === episode.id ? fresh : e))
      persistEpisodes(next)
      setActiveEpisode(fresh)
      setParseIssues(issues)
      toast.success("Episode ပြန်ရေးပြီးပြီ", {
        description: `${fresh.title} (Episode ${String(fresh.episodeNumber).padStart(2, "0")})`,
      })
    } catch (error) {
      if (myRun !== genRunId.current) return
      setGenSlow(false)
      setGenError(
        error instanceof Error
          ? error.message
          : "Rewrite လုပ်လို့မရဘူး။ ပြန်စမ်းပါ။",
      )
    } finally {
      if (myRun === genRunId.current) {
        setGenerating(false)
        clearGenSlowTimer()
      }
    }
  }

  // ---- Multi-mode generation (2026-10-26) ----
  // Same modal flow as episodes (beginGen/abortGen/retryGen, provider
  // switch, 3-minute message-only, error Retry/Close) with mode-specific
  // system instructions and parsers. Story generation above is untouched.

  function missingKeyNotice() {
    setSettingsOpen(true)
    toast.info(
      provider === "openai" ? "OpenAI API key လိုတယ်" : "Gemini API key လိုတယ်",
      {
        description:
          provider === "openai"
            ? "Settings မှာ OpenAI key ထည့်ပြီးမှ Generate နှိပ်ပါ။"
            : "Settings မှာ free key ထည့်ပြီးမှ Generate နှိပ်ပါ။",
      },
    )
  }

  // #67 novel flow: exactly ONE draft, saved as a thread the moment it
  // arrives (episode-less, totalEpisodes 0) so the user can resume later
  // from the sidebar. Regenerate replaces the same thread instead of
  // piling up discarded drafts. No navigation here — the draft resume
  // workspace shows in the home middle area.
  async function runNovelDrafts(idea: string, replaceNovelId?: string) {
    const key = activeKey
    if (!key) {
      missingKeyNotice()
      return
    }
    beginGen("novel", { kind: "novel-drafts", idea })
    const myRun = genRunId.current
    setGenerating(true)
    setLoadingPhrase(0)
    try {
      const text = await generateWithProvider(
        key,
        buildNovelDraftsPrompt(idea),
        {
          signal: genController.current?.signal,
          systemInstruction: NOVEL_INSTRUCTION,
        },
      )
      if (myRun !== genRunId.current) return
      const drafts = parseNovelDrafts(text)
      if (drafts.length === 0) {
        setGenSlow(false)
        setGenError("Draft parse လုပ်လို့မရဘူး။ ပြန်စမ်းပါ။")
        return
      }
      const draft = drafts[0]
      const existing = replaceNovelId
        ? novels.find((novel) => novel.id === replaceNovelId)
        : undefined
      if (existing) {
        persistNovels(
          novels.map((novel) =>
            novel.id === existing.id
              ? {
                  ...novel,
                  title: draft.title,
                  titleEn: draft.titleEn,
                  premise: draft.premise,
                  premiseEn: draft.premiseEn,
                  characters: draft.characters,
                  tone: draft.tone,
                  idea,
                }
              : novel,
          ),
        )
        setActiveNovelId(existing.id)
      } else {
        const novel: Novel = {
          id: `novel-${Date.now()}`,
          title: draft.title,
          titleEn: draft.titleEn,
          premise: draft.premise,
          premiseEn: draft.premiseEn,
          characters: draft.characters,
          tone: draft.tone,
          totalEpisodes: 0,
          episodes: [],
          idea,
          createdAt: Date.now(),
        }
        persistNovels([novel, ...novels])
        setActiveNovelId(novel.id)
      }
      toast.success("Draft ရပြီ", {
        description: draft.title,
      })
    } catch (error) {
      if (myRun !== genRunId.current) return
      setGenSlow(false)
      setGenError(
        error instanceof Error
          ? error.message
          : "Generate လုပ်လို့မရဘူး။ ပြန်စမ်းပါ။",
      )
    } finally {
      if (myRun === genRunId.current) {
        setGenerating(false)
        clearGenSlowTimer()
      }
    }
  }

  async function runNovelEpisode(last: {
    novelId: string
    episodeNumber: number
    totalEpisodes: number
    draft: NovelDraft | null
  }) {
    const key = activeKey
    if (!key) {
      missingKeyNotice()
      return
    }
    const existing = novels.find((novel) => novel.id === last.novelId)
    const draft = last.draft ??
      (existing
        ? {
            title: existing.title,
            titleEn: existing.titleEn ?? "",
            premise: existing.premise,
            premiseEn: existing.premiseEn ?? "",
            characters: existing.characters,
            tone: existing.tone,
          }
        : null)
    if (!draft) {
      setGenError("ဝတ္ထု မတွေ့ဘူး။ ပြန်စမ်းပါ။")
      return
    }
    const isContinue = last.episodeNumber > 1
    beginGen(isContinue ? "continue" : "novel", {
      kind: "novel-episode",
      novelId: last.novelId,
      episodeNumber: last.episodeNumber,
      totalEpisodes: last.totalEpisodes,
      draft: last.draft,
    })
    const myRun = genRunId.current
    setGenerating(true)
    setLoadingPhrase(0)
    try {
      const storySoFar = existing ? buildStorySoFar(existing.episodes) : ""
      const text = await generateWithProvider(
        key,
        buildNovelEpisodePrompt(
          draft,
          last.episodeNumber,
          last.totalEpisodes,
          storySoFar,
        ),
        {
          signal: genController.current?.signal,
          systemInstruction: NOVEL_INSTRUCTION,
        },
      )
      if (myRun !== genRunId.current) return
      const episode = parseNovelEpisode(
        text,
        draft.title,
        last.episodeNumber,
      )
      if (!episode) {
        setGenSlow(false)
        setGenError("Episode ကို parse လုပ်လို့မရဘူး။ ပြန်စမ်းပါ။")
        return
      }
      if (existing) {
        persistNovels(
          novels.map((novel) =>
            novel.id === existing.id
              ? {
                  ...novel,
                  // A draft thread (totalEpisodes 0) gets its count when
                  // Episode 1 starts; later episodes keep it.
                  totalEpisodes:
                    existing.totalEpisodes === 0
                      ? last.totalEpisodes
                      : existing.totalEpisodes,
                  episodes: [...novel.episodes, episode],
                }
              : novel,
          ),
        )
        setActiveNovelId(existing.id)
      } else {
        const novel: Novel = {
          id: last.novelId,
          title: draft.title,
          titleEn: draft.titleEn,
          premise: draft.premise,
          premiseEn: draft.premiseEn,
          characters: draft.characters,
          tone: draft.tone,
          totalEpisodes: last.totalEpisodes,
          episodes: [episode],
          idea: "",
          createdAt: Date.now(),
        }
        persistNovels([novel, ...novels])
        setActiveNovelId(novel.id)
      }
      // Episode generation started from home lands on the reader (#67).
      setMode("novel")
      toast.success("Episode ရပြီ", {
        description: `${draft.title} (Episode ${String(last.episodeNumber).padStart(2, "0")})`,
      })
    } catch (error) {
      if (myRun !== genRunId.current) return
      setGenSlow(false)
      setGenError(
        error instanceof Error
          ? error.message
          : "Generate လုပ်လို့မရဘူး။ ပြန်စမ်းပါ။",
      )
    } finally {
      if (myRun === genRunId.current) {
        setGenerating(false)
        clearGenSlowTimer()
      }
    }
  }

  async function runBook(last: {
    fixedId: FixedBookCharacterId | null
    custom: CustomBookCharacter | null
    topic: string
    characterId: string
    characterName: string
  }) {
    const key = activeKey
    if (!key) {
      missingKeyNotice()
      return
    }
    const userPrompt = last.fixedId
      ? buildFixedBookPrompt(fixedBookCharacter(last.fixedId), last.topic)
      : last.custom
        ? buildCustomBookPrompt(last.custom, last.topic)
        : null
    if (!userPrompt) {
      setGenError("Character မတွေ့ဘူး။ ပြန်စမ်းပါ။")
      return
    }
    beginGen("book", {
      kind: "book",
      fixedId: last.fixedId,
      custom: last.custom,
      topic: last.topic,
      characterId: last.characterId,
      characterName: last.characterName,
    })
    const myRun = genRunId.current
    setGenerating(true)
    setLoadingPhrase(0)
    try {
      const text = await generateWithProvider(key, userPrompt, {
        signal: genController.current?.signal,
        systemInstruction: CHILDREN_BOOK_INSTRUCTION,
      })
      if (myRun !== genRunId.current) return
      const { book: parsed, issues } = parseChildBook(text)
      if (!parsed) {
        setGenSlow(false)
        setGenError("စာအုပ် parse လုပ်လို့မရဘူး။ ပြန်စမ်းပါ။")
        return
      }
      const book: ChildBook = {
        id: `book-${Date.now()}`,
        title: parsed.title || last.topic,
        characterId: last.characterId,
        characterName: last.characterName,
        topic: last.topic,
        intro: parsed.intro,
        pages: parsed.pages,
        quiz: parsed.quiz,
        glossary: parsed.glossary,
        activities: parsed.activities,
        whatWeLearned: parsed.whatWeLearned,
        skillsDeveloped: parsed.skillsDeveloped,
        createdAt: Date.now(),
      }
      persistBooks([book, ...books])
      setActiveBookId(book.id)
      // Book generation started from home lands on the reader (#67).
      setMode("book")
      setBookIssues(issues)
      toast.success("စာအုပ် ရပြီ", {
        description: book.title,
      })
    } catch (error) {
      if (myRun !== genRunId.current) return
      setGenSlow(false)
      setGenError(
        error instanceof Error
          ? error.message
          : "Generate လုပ်လို့မရဘူး။ ပြန်စမ်းပါ။",
      )
    } finally {
      if (myRun === genRunId.current) {
        setGenerating(false)
        clearGenSlowTimer()
      }
    }
  }

  function handleGenerateNovelDrafts(idea: string) {
    void runNovelDrafts(idea)
  }

  function handleRegenerateNovelDraft(idea: string) {
    // Regenerate replaces the open draft thread (same id, new content).
    void runNovelDrafts(idea, activeNovelId ?? undefined)
  }

  function handleGenerateNovelEpisode1(
    draft: NovelDraft,
    totalEpisodes: number,
    novelId?: string,
  ) {
    void runNovelEpisode({
      novelId: novelId ?? `novel-${Date.now()}`,
      episodeNumber: 1,
      totalEpisodes,
      draft,
    })
  }

  function handleContinueNovel(novel: Novel) {
    void runNovelEpisode({
      novelId: novel.id,
      episodeNumber: novel.episodes.length + 1,
      totalEpisodes: novel.totalEpisodes,
      draft: null,
    })
  }

  function handleGenerateFixedBook(
    characterId: FixedBookCharacterId,
    topic: string,
  ) {
    const character = fixedBookCharacter(characterId)
    void runBook({
      fixedId: characterId,
      custom: null,
      topic,
      characterId: character.id,
      characterName: character.shortLabel,
    })
  }

  function handleGenerateCustomBook(
    character: CustomBookCharacter,
    outline: string,
  ) {
    void runBook({
      fixedId: null,
      custom: character,
      topic: outline,
      characterId: character.id,
      characterName: character.name,
    })
  }

  // Story settings for the home middle area (#67): moved verbatim
  // from the old create view, minus the idea input and Generate
  // button (home owns those through its bottom composer).
  const storySettings = (
    <>
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
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Characters</span>
                  <p className="text-sm text-muted-foreground">
                    ဇာတ်ကောင် ကြိုထည့်ထားရင် AI က အဲဒါတွေကို အတိုင်း
                    သုံးမယ်။ မထည့်ရင် AI က သူ့ဟာသူ ထွင်မယ်။ ဒီ
                    thread တစ်ခုစာပဲ။
                  </p>
                  {characters.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {characters.map((character) => {
                        const mini = characterMiniDescription(character)
                        return (
                          <Card key={character.id} size="sm">
                            <CardContent className="flex items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="leading-snug font-medium">
                                  {character.name}
                                  {character.age ? (
                                    <span className="text-muted-foreground">
                                      {" "}
                                      · {character.age}
                                    </span>
                                  ) : null}
                                </p>
                                {mini ? (
                                  <p className="text-sm text-muted-foreground">
                                    {mini}
                                  </p>
                                ) : null}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Edit character"
                                onClick={() => openEditCharacter(character)}
                              >
                                <PencilIcon />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete character"
                                onClick={() =>
                                  setCharacters(
                                    characters.filter(
                                      (item) => item.id !== character.id,
                                    ),
                                  )
                                }
                              >
                                <Trash2Icon />
                              </Button>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit rounded-full"
                    onClick={openNewCharacter}
                  >
                    <PlusIcon />
                    Add character
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Backgrounds</span>
                  <p className="text-sm text-muted-foreground">
                    Background ကြိုထည့်ထားရင် AI က အဲဒါတွေကို အတိုင်း
                    သုံးမယ်။ မထည့်ရင် AI က သူ့ဟာသူ ထွင်မယ်။ ဒီ
                    thread တစ်ခုစာပဲ။
                  </p>
                  {backgrounds.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {backgrounds.map((background) => {
                        const mini = backgroundMiniDescription(background)
                        return (
                          <Card key={background.id} size="sm">
                            <CardContent className="flex items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="leading-snug font-medium">
                                  {background.name}
                                  {background.timeWeather ? (
                                    <span className="text-muted-foreground">
                                      {" "}
                                      · {background.timeWeather}
                                    </span>
                                  ) : null}
                                </p>
                                {mini ? (
                                  <p className="text-sm text-muted-foreground">
                                    {mini}
                                  </p>
                                ) : null}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Edit background"
                                onClick={() => openEditBackground(background)}
                              >
                                <PencilIcon />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete background"
                                onClick={() =>
                                  setBackgrounds(
                                    backgrounds.filter(
                                      (item) => item.id !== background.id,
                                    ),
                                  )
                                }
                              >
                                <Trash2Icon />
                              </Button>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit rounded-full"
                    onClick={openNewBackground}
                  >
                    <PlusIcon />
                    Add background
                  </Button>
                </div>
    </>
  )

  // Key warning, shown at the top of the home page (all modes
  // need a key; Enter with no key opens Settings instead).
  const keyAlert = !activeKey ? (
            <Alert className="rounded-lg bg-card px-2.5 py-2 text-card-foreground">
              <AlertIcon />
              <AlertContent>
              <AlertTitle>{provider === "openai" ? "OpenAI API key မထည့်ရသေးဘူး" : "Gemini API key မထည့်ရသေးဘူး"}</AlertTitle>
              <AlertDescription>
                {provider === "openai" ? "Generate လုပ်ဖို့ OpenAI API key တစ်ခု လိုတယ်။" : "Generate လုပ်ဖို့ free Google AI Studio key တစ်ခု လိုတယ်။"}
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
              </AlertContent>
            </Alert>
  ) : null

  // Visible sidebar thread count for the filter empty state (#67).
  const visibleThreadCount =
    (threadFilter === "all" || threadFilter === "story"
      ? threads.length
      : 0) +
    (threadFilter === "all" || threadFilter === "novel" ? novels.length : 0) +
    (threadFilter === "all" || threadFilter === "book" ? books.length : 0)

  // Home middle area (#67): the selected mode's settings. Story reuses
  // the moved settings fragment + the sample preview; novel/book reuse
  // their views embedded (no idea input, no Generate button — the home
  // bottom composer owns those).
  const homeMiddle =
    homeMode === "story" ? (
      <>
        <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
          <CardContent className="flex flex-col gap-6">
            {storySettings}
          </CardContent>
        </Card>
        <SampleView
          sceneDuration={sceneDuration}
          onCopy={copyPrompt}
          toast={toast}
        />
      </>
    ) : homeMode === "novel" ? (
      <NovelView
        busy={busy}
        activeNovel={activeNovel}
        onNewNovel={() => goHome("novel")}
        onDeleteNovel={deleteNovel}
        onGenerateDrafts={handleGenerateNovelDrafts}
        onRegenerateDraft={handleRegenerateNovelDraft}
        onGenerateEpisode1={handleGenerateNovelEpisode1}
        onContinueNovel={handleContinueNovel}
        embedded
        resetSignal={resetSignal}
        toast={toast}
      />
    ) : (
      <BookView
        busy={busy}
        activeBook={activeBook}
        customCharacters={customBookChars}
        bookIssues={bookIssues}
        onNewBook={() => goHome("book")}
        onDeleteBook={deleteBook}
        onSaveCustomCharacter={saveCustomBookCharacter}
        onGenerateFixedBook={handleGenerateFixedBook}
        onGenerateCustomBook={handleGenerateCustomBook}
        picked={bookPicked}
        onPickedChange={setBookPicked}
        setupOpen={bookSetupOpen}
        onSetupOpenChange={setBookSetupOpen}
        embedded
        resetSignal={resetSignal}
        toast={toast}
      />
    )

  const homeViewElement = (
    <HomeView
      selectedMode={homeMode}
      onSelectMode={setHomeMode}
      middle={homeMiddle}
      keyAlert={keyAlert}
      idea={idea}
      onIdeaChange={setIdea}
      onReset={handleHomeReset}
      onRandom={handleHomeRandom}
      onEnter={handleHomeEnter}
      busy={busy}
    />
  )

  return (
    <AnimatedSidebarProvider>
      <AnimatedSidebar collapsible="offcanvas" panelClassName="bg-sidebar">
        <AnimatedSidebarHeader>
          <AnimatedSidebarMenu>
            <AnimatedSidebarMenuItem>
              <AnimatedSidebarMenuButton
                closeOnSelect={false}
                className="h-12 text-foreground"
              >
                <span className="flex items-center gap-2">
                  <img
                    src={logoUrl}
                    alt="StoryFlow logo"
                    className="size-8 shrink-0"
                  />
                  <span className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-medium">StoryFlow</span>
                    <span className="truncate text-xs text-muted-foreground">
                      Make your imagination happens
                    </span>
                  </span>
                </span>
              </AnimatedSidebarMenuButton>
            </AnimatedSidebarMenuItem>
          </AnimatedSidebarMenu>
        </AnimatedSidebarHeader>
        <AnimatedSidebarContent>
          <AnimatedSidebarGroup>
            <AnimatedSidebarMenu>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  onSelect={() => {
                    goHome()
                  }}
                  icon={<PlusIcon className="size-4" />}
                  className="bg-gradient-to-r from-[#2563eb] to-[#0c098c] text-white hover:brightness-110"
                >
                  <span>New story</span>
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroup>
          {/* #67: the sidebar is the SINGLE universal thread list — one
              entry per generated item, whatever its type. Home = create,
              sidebar = all past threads. Distinct icon per type so rows
              are distinguishable at a glance: story Film, novel BookOpen,
              children book BookHeart, documentary Clapperboard. */}
          <AnimatedSidebarGroup>
            <AnimatedSidebarGroupLabel>Threads</AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent>
              <div className="px-2 pb-2">
                <Select
                  value={threadFilter}
                  onValueChange={(value) => {
                    const next = value as ThreadFilter
                    setThreadFilter(next)
                    try {
                      localStorage.setItem(THREAD_FILTER_STORAGE, next)
                    } catch {
                      /* filter stays in memory for the session */
                    }
                  }}
                >
                  <SelectTrigger aria-label="Filter threads">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="novel">Novel</SelectItem>
                    <SelectItem value="book">Children Book</SelectItem>
                    <SelectItem value="documentary">
                      Documentary Explainer
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <AnimatedSidebarMenu>
                {(threadFilter === "all" || threadFilter === "story") &&
                  threads.map((thread) => (
                    <AnimatedSidebarMenuItem key={thread.id}>
                      <AnimatedSidebarMenuButton
                        isActive={activeThread?.id === thread.id}
                        onSelect={() => { setMode("story"); showThread(thread); setShowGuide(false) }}
                        icon={<FilmIcon className="size-4" />}
                        className="pr-8"
                      >
                        <span className="truncate">{thread.title}</span>
                      </AnimatedSidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <button
                              type="button"
                              aria-label="Story actions"
                              className="absolute top-2 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0"
                            />
                          }
                        >
                          <EllipsisVerticalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start" className="w-auto">
                          <DropdownMenuItem
                            className="whitespace-nowrap"
                            onClick={() => {
                              setRenameTarget({ kind: "story", id: thread.id })
                              setRenameValue(thread.title)
                            }}
                          >
                            <PencilIcon />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="whitespace-nowrap"
                            onClick={() => exportStory(thread)}
                          >
                            <DownloadIcon />
                            Export prompts
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="whitespace-nowrap"
                            variant="destructive"
                            onClick={() => setDeleteThreadId(thread.id)}
                          >
                            <Trash2Icon />
                            Delete story
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </AnimatedSidebarMenuItem>
                  ))}
                {(threadFilter === "all" || threadFilter === "novel") &&
                  [...novels]
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((novel) => (
                      <AnimatedSidebarMenuItem key={novel.id}>
                        <AnimatedSidebarMenuButton
                          isActive={activeNovelId === novel.id}
                          onSelect={() => { setMode("novel"); setActiveNovelId(novel.id); setShowGuide(false) }}
                          icon={<BookOpenIcon className="size-4" />}
                          className="pr-8"
                        >
                          <span className="truncate">{novel.title}</span>
                          {novel.episodes.length === 0 && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              Draft
                            </span>
                          )}
                        </AnimatedSidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                type="button"
                                aria-label="Novel actions"
                                className="absolute top-2 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0"
                              />
                            }
                          >
                            <EllipsisVerticalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start" className="w-auto">
                            <DropdownMenuItem
                              className="whitespace-nowrap"
                              onClick={() => {
                                setRenameTarget({ kind: "novel", id: novel.id })
                                setRenameValue(novel.title)
                              }}
                            >
                              <PencilIcon />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="whitespace-nowrap"
                              variant="destructive"
                              onClick={() => setSidebarDelete({ kind: "novel", id: novel.id, title: novel.title })}
                            >
                              <Trash2Icon />
                              Delete novel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </AnimatedSidebarMenuItem>
                    ))}
                {(threadFilter === "all" || threadFilter === "book") &&
                  [...books]
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((book) => (
                      <AnimatedSidebarMenuItem key={book.id}>
                        <AnimatedSidebarMenuButton
                          isActive={activeBookId === book.id}
                          onSelect={() => { setMode("book"); setActiveBookId(book.id); setBookIssues([]); setShowGuide(false) }}
                          icon={<BookHeartIcon className="size-4" />}
                          className="pr-8"
                        >
                          <span className="truncate">{book.title}</span>
                        </AnimatedSidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                type="button"
                                aria-label="Book actions"
                                className="absolute top-2 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0"
                              />
                            }
                          >
                            <EllipsisVerticalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start" className="w-auto">
                            <DropdownMenuItem
                              className="whitespace-nowrap"
                              onClick={() => {
                                setRenameTarget({ kind: "book", id: book.id })
                                setRenameValue(book.title)
                              }}
                            >
                              <PencilIcon />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="whitespace-nowrap"
                              variant="destructive"
                              onClick={() => setSidebarDelete({ kind: "book", id: book.id, title: book.title })}
                            >
                              <Trash2Icon />
                              Delete book
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </AnimatedSidebarMenuItem>
                    ))}
                {visibleThreadCount === 0 && (
                  <p className="px-2 py-2 text-sm text-muted-foreground">
                    {threadFilter === "documentary"
                      ? "Documentary threads don't exist yet — coming soon."
                      : "Nothing here yet."}
                  </p>
                )}
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
        </AnimatedSidebarContent>
        <AnimatedSidebarFooter>
          {googleUser ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {googleUser.picture ? (
                  <img
                    src={googleUser.picture}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="size-8 shrink-0 rounded-full"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {googleUser.name || googleUser.email}
                  </p>
                  {googleUser.name ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {googleUser.email}
                    </p>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {syncStatus === "syncing"
                  ? "Syncing…"
                  : syncStatus === "error"
                    ? (syncError ?? "Sync failed — try again")
                    : lastSyncedAt
                      ? `Synced · ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : "Signed in"}
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void syncToDrive()}
                  disabled={syncStatus === "syncing"}
                >
                  Sync now
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSignOutOpen(true)}
                >
                  Sign out
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="lg"
                disabled={!googleReady}
                onClick={signInGoogle}
              >
                Sign in with Google
              </Button>
              {googleLoadFailed ? (
                <p className="text-xs text-muted-foreground">
                  Google sign-in failed to load. Check your connection and
                  reopen the app.
                </p>
              ) : null}
            </div>
          )}
        </AnimatedSidebarFooter>
      </AnimatedSidebar>

      <AnimatedSidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 sm:px-6">
          <AnimatedSidebarTrigger className="size-11">
            <PanelLeftIcon />
          </AnimatedSidebarTrigger>
          <h1 className="truncate text-base font-medium sm:text-lg">
            {showGuide
              ? "How to Use"
              : mode === "home"
                ? "New story"
                : mode === "novel"
                  ? (activeNovel?.title ?? "Novel Writer")
                  : mode === "book"
                    ? (activeBook?.title ?? "Children Book Writer")
                    : activeEpisode
                      ? activeEpisode.title
                      : "New story"}
          </h1>
          {mode === "story" && (
          <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
            {(activeEpisode
              ? activeEpisode.aspect.split(" ")[0]
              : ratio)}{" "}
            · 10 scenes ×{" "}
            {activeEpisode ? activeEpisode.sceneDuration : sceneDuration}s
          </Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={showGuide ? "default" : "outline"}
              aria-label="How to Use"
              className="h-9"
              onClick={() => setShowGuide(true)}
            >
              <BookOpenIcon />
              <span className="hidden md:inline">How to Use</span>
            </Button>
            <ThemeToggle />
            <Button
              variant="outline"
              size="icon"
              aria-label="Settings"
              className="size-9"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon />
            </Button>
          </div>
        </header>

        <main className={`mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 ${showGuide ? "lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden" : ""}`}>
          {showGuide ? (
            <div className="lg:h-full lg:min-h-0 lg:overflow-y-auto">
              <GuideView />
            </div>
          ) : mode === "novel" ? (
            <NovelView
              busy={busy}
              activeNovel={activeNovel}
              onNewNovel={() => goHome("novel")}
              onDeleteNovel={deleteNovel}
              onGenerateDrafts={handleGenerateNovelDrafts}
              onRegenerateDraft={handleRegenerateNovelDraft}
              onGenerateEpisode1={handleGenerateNovelEpisode1}
              onContinueNovel={handleContinueNovel}
              toast={toast}
            />
          ) : mode === "book" ? (
            <BookView
              busy={busy}
              activeBook={activeBook}
              customCharacters={customBookChars}
              bookIssues={bookIssues}
              onNewBook={() => goHome("book")}
              onDeleteBook={deleteBook}
              onSaveCustomCharacter={saveCustomBookCharacter}
              onGenerateFixedBook={handleGenerateFixedBook}
              onGenerateCustomBook={handleGenerateCustomBook}
              picked={bookPicked}
              onPickedChange={setBookPicked}
              setupOpen={bookSetupOpen}
              onSetupOpenChange={setBookSetupOpen}
              toast={toast}
            />
          ) : (
          <div className="grid grid-cols-1 gap-8">
            <div className="flex min-w-0 flex-col">
            {activeEpisode && activeThread && (
              <div className="sticky top-14 z-10 flex shrink-0 flex-col gap-4 border-b bg-background px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    {activeThread.episodes.map((episode) => (
                      <div key={episode.id} className="flex">
                        <Button
                          variant={
                            episode.id === activeEpisode.id
                              ? "default"
                              : "outline"
                          }
                          size="lg"
                          className="rounded-r-none"
                          aria-pressed={episode.id === activeEpisode.id}
                          onClick={() => showEpisode(episode)}
                        >
                          Ep {String(episode.episodeNumber).padStart(2, "0")}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant={
                                  episode.id === activeEpisode.id
                                    ? "default"
                                    : "outline"
                                }
                                size="icon-lg"
                                className={
                                  episode.id === activeEpisode.id
                                    ? "rounded-l-none border-l border-white/30"
                                    : "rounded-l-none border-l-0"
                                }
                                aria-label={`Ep ${String(episode.episodeNumber).padStart(2, "0")} actions`}
                              />
                            }
                          >
                            <EllipsisVerticalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-auto">
                            <DropdownMenuItem
                              className="whitespace-nowrap"
                              onClick={() => {
                                setRewriteTarget(episode)
                                setRewriteNote("")
                              }}
                            >
                              <RefreshCwIcon />
                              Rewrite
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="whitespace-nowrap"
                              onClick={() => exportEpisode(episode)}
                            >
                              <DownloadIcon />
                              Export prompts
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="whitespace-nowrap"
                              variant="destructive"
                              onClick={() => setDeleteTarget(episode.id)}
                            >
                              <Trash2Icon />
                              Delete episode
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                  {!activeHasNext && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="lg"
                        disabled={busy}
                        onClick={() => handleContinue(activeEpisode)}
                        className="bg-gradient-to-r from-[#2563eb] to-[#0c098c] text-white hover:brightness-110"
                      >
                        Continue → Episode{" "}
                        {String(activeEpisode.episodeNumber + 1).padStart(2, "0")}
                      </Button>
                    </div>
                  )}
                </div>
                <h2 className="text-lg font-medium">
                  (Episode{" "}
                  {String(activeEpisode.episodeNumber).padStart(2, "0")}){" "}
                  {activeEpisode.title}
                </h2>
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">


            {parseIssues.length > 0 && activeEpisode && (
              <Alert className="rounded-lg bg-card px-2.5 py-2 text-card-foreground">
                <AlertIcon />
                <AlertContent>
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
                </AlertContent>
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
                  <Alert className="rounded-lg bg-card px-2.5 py-2 text-card-foreground">
                    <AlertIcon />
                    <AlertContent>
                    <AlertTitle>Parse လုပ်လို့မရဘူး</AlertTitle>
                    <AlertDescription>
                      <ul className="flex flex-col gap-1">
                        {parseIssues.map((issue) => (
                          <li key={issue}>• {issue}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                    </AlertContent>
                  </Alert>
                )}
                <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Raw Gemini output
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="font-mono overflow-x-auto rounded-lg bg-muted p-5 text-sm leading-relaxed whitespace-pre-wrap sm:p-6">
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
                key={activeEpisode.id}
                episode={activeEpisode}
                busy={busy}
                onCopy={copyPrompt}
                onContinue={handleContinue}
                hasNextEpisode={activeHasNext}
                openSection={openSection}
                onOpenSectionChange={setOpenSection}
              />
            ) : (
              homeViewElement
            )}
            </div>
            </div>
          </div>
          )}
        </main>
      </AnimatedSidebarInset>

      <GenerationModal
        open={generating || genError !== null}
        kind={genKind}
        phrase={LOADING_PHRASES[loadingPhrase]}
        slow={genSlow}
        error={genError}
        onAbort={abortGen}
        onClose={() => setGenError(null)}
        onRetry={retryGen}
      />

      <CenterMorphModal open={characterModalOpen} onOpenChange={setCharacterModalOpen}>
        <CenterMorphModalContent ariaLabel={editingCharacter ? "Character ပြင်မယ်" : "Character ထည့်မယ်"} ariaDescribedBy="character-desc" className="flex flex-col gap-4 p-6 text-sm bg-popover max-w-[calc(100%-2rem)] sm:max-w-xl">
          <div className="flex flex-col gap-3 pr-10">
            <h2 className="text-base leading-none font-medium">
              {editingCharacter ? "Character ပြင်မယ်" : "Character ထည့်မယ်"}
            </h2>
            <p id="character-desc" className="text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground">
              ဇာတ်ကောင်အကြောင်း ထည့်ပါ။ Generate နှိပ်ရင် AI က ဒီ
              ဇာတ်ကောင်ကို အတိုင်း သုံးမယ်။
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Name *</span>
              <Input
                value={characterName}
                onChange={(event) => setCharacterName(event.target.value)}
                placeholder="ဥပမာ — မောင်မောင်"
                className="text-base"
                aria-label="Character name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Age</span>
              <Input
                value={characterAge}
                onChange={(event) => setCharacterAge(event.target.value)}
                placeholder="ဥပမာ — ၈"
                className="text-base"
                aria-label="Character age"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                Appearances and outfit
              </span>
              <Textarea
                value={characterAppearance}
                onChange={(event) =>
                  setCharacterAppearance(event.target.value)
                }
                placeholder="ဥပမာ — ဆံပင်တိုတို၊ အနီရောင် တီရှပ်၊ ပုဆိုး"
                className="min-h-20 text-base leading-relaxed"
                aria-label="Appearances and outfit"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Behavior</span>
              <Textarea
                value={characterBehavior}
                onChange={(event) => setCharacterBehavior(event.target.value)}
                placeholder="ဥပမာ — စပ်စု၊ ရဲရင့်၊ စကားများ"
                className="min-h-20 text-base leading-relaxed"
                aria-label="Behavior"
              />
            </div>
          </div>
          <div className="-mx-6 -mb-6 flex flex-col-reverse gap-2 rounded-b-[30px] border-t bg-muted/50 p-6 sm:flex-row sm:justify-end">
            <CenterMorphModalClose><Button variant="outline" size="lg">Cancel</Button></CenterMorphModalClose>
            <Button size="lg" onClick={saveCharacter}>
              Save
            </Button>
          </div>
        </CenterMorphModalContent>
      </CenterMorphModal>
      <CenterMorphModal open={backgroundModalOpen} onOpenChange={setBackgroundModalOpen}>
        <CenterMorphModalContent ariaLabel={editingBackground ? "Background ပြင်မယ်" : "Background ထည့်မယ်"} ariaDescribedBy="background-desc" className="flex flex-col gap-4 p-6 text-sm bg-popover max-w-[calc(100%-2rem)] sm:max-w-xl">
          <div className="flex flex-col gap-3 pr-10">
            <h2 className="text-base leading-none font-medium">
              {editingBackground ? "Background ပြင်မယ်" : "Background ထည့်မယ်"}
            </h2>
            <p id="background-desc" className="text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground">
              နေရာအကြောင်း ထည့်ပါ။ Generate နှိပ်ရင် AI က ဒီ
              background ကို အတိုင်း သုံးမယ်။
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Name *</span>
              <Input
                value={backgroundName}
                onChange={(event) => setBackgroundName(event.target.value)}
                placeholder="ဥပမာ — မင်းသမီးရဲ့ အိပ်ခန်း"
                className="text-base"
                aria-label="Background name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Description</span>
              <Textarea
                value={backgroundDescription}
                onChange={(event) =>
                  setBackgroundDescription(event.target.value)
                }
                placeholder="ဥပမာ — ပန်းရောင် နံရံ၊ သစ်သားကုတင်၊ ပြတင်းပေါက်က မနက်ခင်းနေရောင်"
                className="min-h-20 text-base leading-relaxed"
                aria-label="Background description"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Time &amp; weather</span>
              <Input
                value={backgroundTimeWeather}
                onChange={(event) =>
                  setBackgroundTimeWeather(event.target.value)
                }
                placeholder="ဥပမာ — မနက်ခင်း၊ နေသာတယ်"
                className="text-base"
                aria-label="Background time and weather"
              />
            </div>
          </div>
          <div className="-mx-6 -mb-6 flex flex-col-reverse gap-2 rounded-b-[30px] border-t bg-muted/50 p-6 sm:flex-row sm:justify-end">
            <CenterMorphModalClose><Button variant="outline" size="lg">Cancel</Button></CenterMorphModalClose>
            <Button size="lg" onClick={saveBackground}>
              Save
            </Button>
          </div>
        </CenterMorphModalContent>
      </CenterMorphModal>
      <CenterMorphModal open={settingsOpen} onOpenChange={setSettingsOpen}>
        <CenterMorphModalContent ariaLabel="Settings" ariaDescribedBy="settings-desc" className="flex flex-col gap-4 p-6 text-sm bg-popover max-w-[calc(100%-2rem)] sm:max-w-lg">
          <div className="flex flex-col gap-3 pr-10">
            <h2 className="text-base leading-none font-medium">Settings</h2>
            <p id="settings-desc" className="text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground">
              {providerDraft === "openai"
                ? "capflow အတွက် ဝယ်ထားတဲ့ OpenAI API key ကို ဒီမှာထည့်ပါ။ Key က ဒီ browser ရဲ့ local storage ထဲမှာပဲ နေမယ်။"
                : "Free key ကို Google AI Studio ကနေ ယူပြီး ဒီမှာထည့်ပါ။ Key က ဒီ browser ရဲ့ local storage ထဲမှာပဲ နေမယ်။"}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Provider
            </label>
            <Select
              value={providerDraft}
              onValueChange={(value) => setProviderDraft(value as Provider)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Gemini (free)</SelectItem>
                <SelectItem value="openai">OpenAI (GPT-6 Luna)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={providerDraft === "openai" ? "openai-key" : "gemini-key"} className="text-sm font-medium">
              {providerDraft === "openai" ? "OpenAI API key" : "Gemini API key"}
            </label>
            <div className="flex gap-2">
              <Input
                id={providerDraft === "openai" ? "openai-key" : "gemini-key"}
                type={showKey ? "text" : "password"}
                value={providerDraft === "openai" ? openAIKey : apiKey}
                onChange={(event) =>
                  providerDraft === "openai"
                    ? setOpenAIKey(event.target.value)
                    : setApiKey(event.target.value)
                }
                placeholder={providerDraft === "openai" ? "sk-…" : "AIza…"}
                className="text-base flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                aria-label={showKey ? "Hide API key" : "Show API key"}
                onClick={() => setShowKey((value) => !value)}
              >
                {showKey ? <EyeOffIcon /> : <EyeIcon />}
              </Button>
            </div>
          </div>
          <div className="-mx-6 -mb-6 flex flex-col-reverse gap-2 rounded-b-[30px] border-t bg-muted/50 p-6 sm:flex-row sm:justify-end">
            {(providerDraft === "openai" ? savedOpenAIKey : savedKey) && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  try {
                    localStorage.removeItem(
                      providerDraft === "openai" ? OPENAI_KEY_STORAGE : GEMINI_KEY_STORAGE,
                    )
                  } catch {
                    /* storage unavailable — key stays cleared in state */
                  }
                  if (providerDraft === "openai") {
                    setSavedOpenAIKey(null)
                    setOpenAIKey("")
                  } else {
                    setSavedKey(null)
                    setApiKey("")
                  }
                  toast.success("Key removed")
                }}
              >
                Remove key
              </Button>
            )}
            <CenterMorphModalClose><Button variant="outline" size="lg">Cancel</Button></CenterMorphModalClose>
            <Button
              size="lg"
              onClick={() => {
                const key = (providerDraft === "openai" ? openAIKey : apiKey).trim()
                if (!key) {
                  toast.error("API key ထည့်ပါ")
                  return
                }
                try {
                  localStorage.setItem(
                    providerDraft === "openai" ? OPENAI_KEY_STORAGE : GEMINI_KEY_STORAGE,
                    key,
                  )
                  localStorage.setItem(PROVIDER_STORAGE, providerDraft)
                } catch {
                  /* storage unavailable — key stays in memory for the session */
                }
                if (providerDraft === "openai") setSavedOpenAIKey(key)
                else setSavedKey(key)
                setProvider(providerDraft)
                setSettingsOpen(false)
                toast.success("Key saved (this browser only)")
              }}
            >
              Save key
            </Button>
          </div>
        </CenterMorphModalContent>
      </CenterMorphModal>

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
                  const remaining = episodes.filter(
                    (e) => e.id !== deleteSavedEpisode.id,
                  )
                  persistEpisodes(remaining)
                  if (activeEpisode?.id === deleteSavedEpisode.id) {
                    const siblings = remaining
                      .filter(
                        (e) => e.threadId === deleteSavedEpisode.threadId,
                      )
                      .sort((a, b) => a.episodeNumber - b.episodeNumber)
                    setActiveEpisode(siblings[siblings.length - 1] ?? null)
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

      <AlertDialog
        open={deleteThreadId !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteThreadId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Story ကို ဖျက်မှာလား?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteThread
                ? `“${deleteThread.title}” နဲ့ သူ့ရဲ့ episode အားလုံး အပြီးဖျက်သွားမယ်။ ဒါကို ပြန်မရနိုင်ဘူး။`
                : "ဒီ story နဲ့ သူ့ရဲ့ episode အားလုံးကို အပြီးဖျက်သွားမယ်။ ပြန်မရနိုင်ဘူး။"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="lg"
              onClick={() => {
                if (deleteThread) {
                  persistEpisodes(
                    episodes.filter((e) => e.threadId !== deleteThread.id),
                  )
                  const nextTitles = { ...threadTitles }
                  delete nextTitles[deleteThread.id]
                  persistThreadTitles(nextTitles)
                  if (activeEpisode?.threadId === deleteThread.id) {
                    setActiveEpisode(null)
                  }
                }
                setDeleteThreadId(null)
                toast.success("Story deleted")
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={sidebarDelete !== null}
        onOpenChange={(open) => {
          if (!open) setSidebarDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {sidebarDelete?.kind === "novel"
                ? "Novel ကို ဖျက်မှာလား?"
                : "Book ကို ဖျက်မှာလား?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {sidebarDelete
                ? `“${sidebarDelete.title}” ကို အပြီးဖျက်သွားမယ်။ ဒါကို ပြန်မရနိုင်ဘူး။`
                : "ဒါကို အပြီးဖျက်သွားမယ်။ ပြန်မရနိုင်ဘူး။"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="lg"
              onClick={() => {
                if (sidebarDelete) {
                  if (sidebarDelete.kind === "novel") {
                    deleteNovel(sidebarDelete.id)
                    toast.success("Novel deleted")
                  } else {
                    deleteBook(sidebarDelete.id)
                    toast.success("Book deleted")
                  }
                }
                setSidebarDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to log out?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your stories stay saved in your Google account and in this
              browser. Syncing pauses until you sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              size="lg"
              onClick={() => {
                setSignOutOpen(false)
                signOutGoogle()
              }}
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CenterMorphModal
        open={renameTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setRenameTarget(null)
        }}
      >
        <CenterMorphModalContent ariaLabel="နာမည် ပြောင်းမယ်" ariaDescribedBy="rename-desc" className="flex flex-col gap-4 p-6 text-sm bg-popover max-w-[calc(100%-2rem)] sm:max-w-sm">
          <div className="flex flex-col gap-3 pr-10">
            <h2 className="text-base leading-none font-medium">{renameTarget?.kind === "novel" ? "Novel နာမည် ပြောင်းမယ်" : renameTarget?.kind === "book" ? "Book နာမည် ပြောင်းမယ်" : "Story နာမည် ပြောင်းမယ်"}</h2>
            <p id="rename-desc" className="text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground">
              {renameTarget?.kind === "story"
                ? "Sidebar မှာ ပြမယ့် နာမည်ပါ — episode တွေရဲ့ နာမည်က မပြောင်းဘူး။"
                : "Sidebar မှာ ပြမယ့် နာမည်ပါ။"}
            </p>
          </div>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              const name = renameValue.trim()
              if (!renameTarget || !name) return
              if (renameTarget.kind === "story") {
                persistThreadTitles({
                  ...threadTitles,
                  [renameTarget.id]: name,
                })
                toast.success("Story renamed")
              } else if (renameTarget.kind === "novel") {
                persistNovels(
                  novels.map((novel) =>
                    novel.id === renameTarget.id
                      ? { ...novel, title: name }
                      : novel,
                  ),
                )
                toast.success("Novel renamed")
              } else {
                persistBooks(
                  books.map((book) =>
                    book.id === renameTarget.id
                      ? { ...book, title: name }
                      : book,
                  ),
                )
                toast.success("Book renamed")
              }
              setRenameTarget(null)
            }}
          >
            <Input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              placeholder="Story name"
              aria-label="Story name"
              className="text-base"
              autoFocus
            />
            <div className="-mx-6 -mb-6 flex flex-col-reverse gap-2 rounded-b-[30px] border-t bg-muted/50 p-6 sm:flex-row sm:justify-end">
              <CenterMorphModalClose><Button variant="outline" size="lg">Cancel</Button></CenterMorphModalClose>
              <Button size="lg" type="submit" disabled={!renameValue.trim()}>
                Save
              </Button>
            </div>
          </form>
        </CenterMorphModalContent>
      </CenterMorphModal>

      <CenterMorphModal
        open={rewriteTarget !== null}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setRewriteTarget(null)
            setRewriteNote("")
          }
        }}
      >
        <CenterMorphModalContent ariaLabel={rewriteTarget ? `Episode ${String(rewriteTarget.episodeNumber).padStart(2, "0")} ပြန်ရေးမယ်` : "Episode ပြန်ရေးမယ်"} ariaDescribedBy="rewrite-desc" className="flex flex-col gap-4 p-6 text-sm bg-popover max-w-[calc(100%-2rem)] sm:max-w-sm">
          <div className="flex flex-col gap-3 pr-10">
            <h2 className="text-base leading-none font-medium">
              {rewriteTarget
                ? `Episode ${String(rewriteTarget.episodeNumber).padStart(2, "0")} ပြန်ရေးမယ်`
                : "Episode ပြန်ရေးမယ်"}
            </h2>
            <p id="rewrite-desc" className="text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground">
              အသစ်စက်စက် ဇာတ်လမ်းနဲ့ အစားထိုးမယ် — အဟောင်း episode
              က ပြန်မရတော့ဘူး။
            </p>
          </div>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!rewriteTarget) return
              const target = rewriteTarget
              const note = rewriteNote
              setRewriteTarget(null)
              setRewriteNote("")
              void runRewrite(target, note)
            }}
          >
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                ဘာပြောင်းချင်လဲ (မထည့်လဲ ရတယ်)
              </span>
              <Textarea
                value={rewriteNote}
                onChange={(event) => setRewriteNote(event.target.value)}
                placeholder="ဥပမာ — ဗီလိန်ကို ပိုရယ်ရအောင်လုပ်"
                className="min-h-20 text-base leading-relaxed"
                aria-label="Rewrite note"
              />
            </div>
            {rewriteLater.length > 0 && (
              <p className="text-sm text-destructive">
                သတိ — ဒီ episode ရဲ့ နောက်က{" "}
                {rewriteLater
                  .map((e) => `Episode ${String(e.episodeNumber).padStart(2, "0")}`)
                  .join(", ")}{" "}
                ကိုပါ ဖျက်မယ် (သူတို့က အဟောင်း story ကို ဆက်ထားလို့ပါ)။
                ဖျက်ပြီးရင် Continue က နောက် episode အသစ် ပြန်ထုတ်ဖို့
                ပြန်ပေါ်မယ်။
              </p>
            )}
            <div className="-mx-6 -mb-6 flex flex-col-reverse gap-2 rounded-b-[30px] border-t bg-muted/50 p-6 sm:flex-row sm:justify-end">
              <CenterMorphModalClose><Button variant="outline" size="lg">Cancel</Button></CenterMorphModalClose>
              <Button size="lg" type="submit" disabled={busy}>
                Rewrite
              </Button>
            </div>
          </form>
        </CenterMorphModalContent>
      </CenterMorphModal>

      <AnimatedToastStack toasts={toasts} onDismiss={dismissToast} fixed />
    </AnimatedSidebarProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider delay={0}>
        <AppShell />
      </TooltipProvider>
    </ThemeProvider>
  )
}
