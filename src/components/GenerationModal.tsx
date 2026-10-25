import { useState } from "react"
import { Lottie } from "lottie-react"
import { useReducedMotion } from "motion/react"
import { X } from "lucide-react"
import {
  CenterMorphModal,
  CenterMorphModalContent,
} from "@/components/motion/center-morph-modal"
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

export type GenerationKind = "generate" | "continue" | "rewrite"

interface GenerationModalProps {
  open: boolean
  kind: GenerationKind
  phrase: string
  slow: boolean
  error: string | null
  onAbort: () => void
  onClose: () => void
  onRetry: () => void
}

const KIND_TITLES: Record<GenerationKind, string> = {
  generate: "Episode ရေးနေတယ်",
  continue: "နောက်အပိုင်း ရေးနေတယ်",
  rewrite: "Episode ပြန်ရေးနေတယ်",
}

/**
 * Locked modal shown while an episode generates. Escape and backdrop presses
 * are disabled (dismissible={false}); the only way out mid-generation is the
 * X, which asks for confirmation first. Nothing here closes the modal on its
 * own — AppShell owns open state (generating || error) and all outcomes.
 */
export function GenerationModal({
  open,
  kind,
  phrase,
  slow,
  error,
  onAbort,
  onClose,
  onRetry,
}: GenerationModalProps) {
  const reduce = useReducedMotion() ?? false
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <CenterMorphModal open={open}>
        <CenterMorphModalContent
          ariaLabel={error ? "မအောင်မြင်ဘူး" : KIND_TITLES[kind]}
          dismissible={false}
          showCloseButton={false}
          className="flex flex-col gap-4 p-6 text-sm bg-popover max-w-[calc(100%-2rem)] sm:max-w-md"
        >
          {/* Gradient-floor-style animated backdrop, bottom-anchored and
              blurred (pure CSS/Tailwind recreation, no copied effect code).
              It sits behind the content and clips to the panel's corners. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 overflow-hidden"
          >
            <div className="absolute -bottom-10 left-1/2 -ml-28 h-56 w-56 rounded-full bg-teal-400/30 blur-3xl motion-safe:animate-[gen-drift_9s_ease-in-out_infinite_alternate]" />
            <div className="absolute -bottom-6 left-8 h-40 w-40 rounded-full bg-lime-300/30 blur-3xl motion-safe:animate-[gen-drift_12s_ease-in-out_infinite_alternate-reverse]" />
          </div>

          {/* Custom X (mirrors the built-in close button's position/style).
              During generation it asks for confirmation; in the error state
              it just closes, since nothing is running. */}
          <button
            type="button"
            aria-label="Close modal"
            onClick={() => {
              if (error) onClose()
              else setConfirmOpen(true)
            }}
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.05] text-muted-foreground transition-colors hover:bg-foreground/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex flex-col gap-3 pr-10">
              <h2 className="text-base leading-none font-medium">
                {error ? "မအောင်မြင်ဘူး" : KIND_TITLES[kind]}
              </h2>
            </div>

            {error ? (
              <p className="text-sm leading-relaxed">{error}</p>
            ) : (
              <>
                <Lottie
                  src={animationData}
                  loop={!reduce}
                  autoplay={!reduce}
                  className="mx-auto size-48"
                />
                <p className="text-center text-sm leading-relaxed motion-safe:animate-pulse">
                  {phrase}
                </p>
                {slow ? (
                  <p className="text-center text-sm leading-relaxed">
                    ၃ မိနစ်ကျော်သွားပြီ — လိုင်းနှေးနေပုံရတယ်။
                    ပြန်ကြိုးစားကြည့်ပါ။
                  </p>
                ) : null}
              </>
            )}

            {slow || error ? (
              <div className="-mx-6 -mb-6 flex flex-col-reverse gap-2 rounded-b-[30px] border-t bg-muted/50 p-6 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={error ? onClose : onAbort}
                >
                  Close
                </Button>
                <Button onClick={onRetry}>Retry</Button>
              </div>
            ) : null}
          </div>
        </CenterMorphModalContent>
      </CenterMorphModal>

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
