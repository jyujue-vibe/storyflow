import { SYSTEM_INSTRUCTION } from "./systemInstruction"

// GPT-6 Luna: OpenAI's cheapest GPT-6 tier (Chat Completions, model id
// "gpt-6-luna", 1.05M context, 128K max output). Used only when the user
// picks the OpenAI provider in Settings; Gemini stays the default.
const OPENAI_URL = "https://api.openai.com/v1/chat/completions"
const OPENAI_MODEL = "gpt-6-luna"

interface OpenAIChoice {
  message?: { content?: string | null }
}

interface OpenAIResponse {
  choices?: OpenAIChoice[]
  error?: { message?: string }
}

/** Map an HTTP/API failure to a short user-facing message. Never includes the key.
 * The API's own message is appended when present, so the real cause (e.g. a
 * wrong model id or key) is visible instead of just the status code. */
function mapOpenAIStatusToMessage(status: number, apiMessage?: string): string {
  let base: string
  if (status === 401 || status === 403) {
    base =
      "OpenAI API key မမှန်ဘူး (သို့မဟုတ်) ဒီ key နဲ့ OpenAI သုံးလို့မရဘူး။ Settings မှာ key ကို ပြန်စစ်ပါ။"
  } else if (status === 429) {
    base = "Quota / rate limit ပြည့်သွားပြီ။ ခဏစောင့်ပြီး ပြန်နှိပ်ပါ။"
  } else {
    base = `OpenAI က error ပြန်တယ် (HTTP ${status})။ ခဏစောင့်ပြီး ပြန်စမ်းပါ။`
  }
  return apiMessage ? `${base} (${apiMessage})` : base
}

/**
 * Generate one episode package from OpenAI. Same shape as the Gemini client:
 * the key is passed in by the caller (it lives only in the browser's
 * localStorage) and is never logged or stored here. The shared system
 * instruction produces the same 8-section format, so the parser is reused
 * unchanged. Callers may override the system instruction (novel/book modes);
 * the default keeps existing callers behaving exactly as before.
 */
export async function generateEpisodeTextOpenAI(
  apiKey: string,
  userPrompt: string,
  options?: { signal?: AbortSignal; systemInstruction?: string },
): Promise<string> {
  let response: Response
  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: options?.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: options?.systemInstruction ?? SYSTEM_INSTRUCTION },
          { role: "user", content: userPrompt },
        ],
      }),
    })
  } catch (error) {
    if (options?.signal?.aborted) throw error
    throw new Error(
      "အင်တာနက် ချိတ်ဆက်လို့မရဘူး။ Connection ကို စစ်ပြီး ပြန်နှိပ်ပါ။",
    )
  }

  let data: OpenAIResponse | null = null
  try {
    data = (await response.json()) as OpenAIResponse
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(
      mapOpenAIStatusToMessage(response.status, data?.error?.message),
    )
  }

  const text = data?.choices?.[0]?.message?.content?.trim() ?? ""
  if (!text) {
    throw new Error("OpenAI က စာသား ပြန်မပေးဘူး။ ပြန်နှိပ်ပြီး စမ်းပါ။")
  }
  return text
}
