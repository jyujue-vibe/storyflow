import type { Episode } from "@/lib/parse"

/**
 * Google Drive appDataFolder sync for StoryFlow.
 *
 * The sync file lives in the app's private appDataFolder: only StoryFlow can
 * see it, never the user's Drive files. The Gemini API key is NEVER put in
 * this file — it stays per-device in localStorage.
 */

export const SYNC_FILE_NAME = "storyflow.json"

export interface SyncFile {
  version: 1
  updatedAt: string
  episodes: Episode[]
  threadTitles: Record<string, string>
}

export interface SyncFileMeta {
  id: string
  modifiedTime: string
}

export interface GoogleUser {
  name: string
  email: string
  picture: string
}

async function driveFetch(
  token: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })
  if (response.status === 401) {
    throw new Error("GOOGLE_TOKEN_EXPIRED")
  }
  if (!response.ok) {
    let message = `Drive request failed (${response.status})`
    try {
      const body: unknown = await response.json()
      const apiMessage = (
        body as { error?: { message?: string } }
      ).error?.message
      if (apiMessage) message = apiMessage
    } catch {
      /* keep the status message */
    }
    throw new Error(message)
  }
  return response
}

export async function findSyncFile(
  token: string,
): Promise<SyncFileMeta | null> {
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    q: `name = '${SYNC_FILE_NAME}' and trashed = false`,
    fields: "files(id,name,modifiedTime)",
    pageSize: "10",
  })
  const response = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
  )
  const body = (await response.json()) as {
    files?: SyncFileMeta[]
  }
  return body.files?.[0] ?? null
}

export async function downloadSyncFile(
  token: string,
  fileId: string,
): Promise<SyncFile> {
  const response = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
  )
  const body = (await response.json()) as SyncFile
  if (!Array.isArray(body.episodes)) {
    throw new Error("Sync file is damaged (no episodes list).")
  }
  return {
    version: 1,
    updatedAt:
      typeof body.updatedAt === "string"
        ? body.updatedAt
        : new Date().toISOString(),
    episodes: body.episodes,
    threadTitles:
      body.threadTitles && typeof body.threadTitles === "object"
        ? body.threadTitles
        : {},
  }
}

export async function createSyncFile(
  token: string,
  data: SyncFile,
): Promise<SyncFileMeta> {
  const boundary = `storyflow-${Date.now()}`
  const metadata = {
    name: SYNC_FILE_NAME,
    parents: ["appDataFolder"],
    mimeType: "application/json",
  }
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${JSON.stringify(data)}\r\n` +
    `--${boundary}--`
  const response = await driveFetch(
    token,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  )
  return (await response.json()) as SyncFileMeta
}

export async function updateSyncFile(
  token: string,
  fileId: string,
  data: SyncFile,
): Promise<void> {
  await driveFetch(
    token,
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  )
}

export async function fetchUserInfo(token: string): Promise<GoogleUser> {
  const response = await driveFetch(
    token,
    "https://openidconnect.googleapis.com/v1/userinfo",
  )
  const body = (await response.json()) as {
    name?: string
    email?: string
    picture?: string
  }
  return {
    name: body.name ?? "",
    email: body.email ?? "",
    picture: body.picture ?? "",
  }
}

export function revokeToken(token: string): void {
  try {
    const google = (
      window as unknown as {
        google?: {
          accounts?: {
            oauth2?: {
              revoke?: (token: string, done: () => void) => void
            }
          }
        }
      }
    ).google
    google?.accounts?.oauth2?.revoke?.(token, () => {
      /* revoked */
    })
  } catch {
    /* revocation is best-effort */
  }
}

/** Merge cloud episodes into local ones. Cloud wins on the same id;
 *  local-only episodes are kept. */
export function mergeEpisodes(
  local: Episode[],
  remote: Episode[],
): Episode[] {
  const byId = new Map<string, Episode>()
  for (const episode of remote) byId.set(episode.id, episode)
  for (const episode of local) {
    if (!byId.has(episode.id)) byId.set(episode.id, episode)
  }
  return [...byId.values()]
}

export function mergeThreadTitles(
  local: Record<string, string>,
  remote: Record<string, string>,
): Record<string, string> {
  return { ...local, ...remote }
}
