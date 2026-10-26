import { DownloadIcon, PrinterIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CenterMorphModal,
  CenterMorphModalContent,
} from "@/components/motion/center-morph-modal"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onDownloadMd: () => void
  onPrintPdf: () => void
}

/**
 * Shared export picker for novel/book readers (#67): Markdown download or
 * print-to-PDF (a printable view; the user picks "Save as PDF" in the
 * browser print dialog — no PDF library is used). Footer buttons
 * bottom-right, like every other modal in the app.
 */
export function ExportDialog({
  open,
  onOpenChange,
  title,
  onDownloadMd,
  onPrintPdf,
}: ExportDialogProps) {
  return (
    <CenterMorphModal open={open} onOpenChange={onOpenChange}>
      <CenterMorphModalContent
        ariaLabel={`Export ${title}`}
        ariaDescribedBy="export-desc"
        className="flex flex-col gap-4 p-6 text-sm bg-popover max-w-[calc(100%-2rem)] sm:max-w-md"
      >
        <div className="flex flex-col gap-3 pr-10">
          <h2 className="text-base leading-none font-medium">
            Export — {title}
          </h2>
          <p
            id="export-desc"
            className="text-sm text-muted-foreground"
          >
            Markdown ဖိုင်အနေနဲ့ ဒေါင်းလုဒ်လုပ်မလား၊ Print dialog ကနေ PDF
            အနေနဲ့ သိမ်းမလား ရွေးပါ။
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="lg"
            className="justify-start"
            onClick={() => {
              onDownloadMd()
              onOpenChange(false)
            }}
          >
            <DownloadIcon />
            Download .md
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="justify-start"
            onClick={() => {
              onPrintPdf()
              onOpenChange(false)
            }}
          >
            <PrinterIcon />
            Print / Save as PDF
          </Button>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </CenterMorphModalContent>
    </CenterMorphModal>
  )
}
