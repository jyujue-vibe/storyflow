import { SYSTEM_INSTRUCTION } from "./systemInstruction"

const MODEL_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

interface GeminiPart {
  text?: string
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[]
  error?: { message?: string }
}

/** Map an HTTP/API failure to a short user-facing message. Never includes the key. */
function mapStatusToMessage(status: number): string {
  if (status === 400 || status === 401 || status === 403) {
    return "API key မမှန်ဘူး (သို့မဟုတ်) ဒီ key နဲ့ Gemini သုံးလို့မရဘူး။ Settings မှာ key ကို ပြန်စစ်ပါ။"
  }
  if (status === 429) {
    return "Quota / rate limit ပြည့်သွားပြီ။ ခဏစောင့်ပြီး ပြန်နှိပ်ပါ။"
  }
  return `Gemini က error ပြန်တယ် (HTTP ${status})။ ခဏစောင့်ပြီး ပြန်စမ်းပါ။`
}

/**
 * Generate one episode package from Gemini. The key is passed in by the caller
 * (it lives only in the browser's localStorage) and is never logged or stored here.
 */
export async function generateEpisodeText(
  apiKey: string,
  userPrompt: string,
): Promise<string> {
  let response: Response
  try {
    response = await fetch(MODEL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ parts: [{ text: userPrompt }] }],
      }),
    })
  } catch {
    throw new Error(
      "အင်တာနက် ချိတ်ဆက်လို့မရဘူး။ Connection ကို စစ်ပြီး ပြန်နှိပ်ပါ။",
    )
  }

  let data: GeminiResponse | null = null
  try {
    data = (await response.json()) as GeminiResponse
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(mapStatusToMessage(response.status))
  }

  const parts = data?.candidates?.[0]?.content?.parts ?? []
  const text = parts
    .map((part) => part.text ?? "")
    .join("")
    .trim()
  if (!text) {
    throw new Error("Gemini က စာသား ပြန်မပေးဘူး။ ပြန်နှိပ်ပြီး စမ်းပါ။")
  }
  return text
}
