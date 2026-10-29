import { useState } from "react"
import { Lottie } from "lottie-react"
import { useReducedMotion } from "motion/react"
import { ChevronsUp, X } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import animationData from "@/assets/Generation.json"
import { KIND_TITLES, type GenerationKind } from "@/components/GenerationModal"

interface GenerationBarProps {
  kind: GenerationKind
  phrase: string
  slow: boolean
  onExpand: () => void
  onAbort: () => void
}

/**
 * Music-player-style generation bar (#79, #80): a floating rounded box
 * fixed to the viewport bottom, shown ONLY after the user hides the
 * generation modal (the modal shows first on every generation). Same
 * Sparkle Lottie + floor-fade gradient language as the modal. Clicking
 * the bar (or the expand button) re-opens the modal; X asks for
 * confirmation, exactly like the modal's X. Toasts (z-[90]) stay above
 * this bar (z-50).
 */
export function GenerationBar({
  kind,
  phrase,
  slow,
  onExpand,
  onAbort,
}: GenerationBarProps) {
  const reduce = useReducedMotion() ?? false
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="Generation details ကို ပြမယ်"
        onClick={onExpand}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onExpand()
          }
        }}
        className="fixed inset-x-3 bottom-3 z-50 cursor-pointer overflow-hidden rounded-2xl border bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(0,0,0,0.25)] backdrop-blur-md"
      >
        {/* Flowing gradient wash (modal floor-fade colors) + indeterminate
            top line — both pure CSS, still under reduced-motion. */}
        <div
          aria-hidden="true"
          className="genbar-gradient pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(100deg, rgba(45,212,191,0.28), rgba(163,230,53,0.18), rgba(45,212,191,0.28))",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden"
        >
          <div
            className="genbar-line h-full w-2/5 bg-gradient-to-r from-teal-400 via-lime-400 to-teal-400"
          />
        </div>

        <div className="relative flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <Lottie
            src={animationData}
            loop={!reduce}
            autoplay={!reduce}
            className="size-10 shrink-0 sm:size-12"
          />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">
              {KIND_TITLES[kind]}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {slow
                ? "၃ မိနစ်ကျော်သွားပြီ — လိုင်းနှေးနေပုံရတယ်။ ပြန်ကြိုးစားကြည့်ပါ။"
                : phrase}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Generation details ကို ပြမယ်"
            onClick={(event) => {
              event.stopPropagation()
              onExpand()
            }}
          >
            <ChevronsUp />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Generation ကို ရပ်မယ်"
            onClick={(event) => {
              event.stopPropagation()
              setConfirmOpen(true)
            }}
          >
            <X />
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Generation ကို ရပ်လိုက်မှာလား?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ရပ်လိုက်ရင် ဒီတစ်ခေါက် generation ပျက်သွားမယ်၊ ဘာမှ
              မသိမ်းဘူး။
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ဆက်စောင့်</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false)
                onAbort()
              }}
            >
              ရပ်
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
