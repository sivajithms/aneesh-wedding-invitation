/**
 * RSVPs and blessings go to a Google Sheet through a small Apps Script web app
 * (google-apps-script/Code.gs). Each phone keeps a random reply id, so changing an RSVP
 * later updates that guest's row instead of adding a second one.
 */

export type GuestbookEntry =
  | { type: 'rsvp'; name: string; attending: boolean; guests: number }
  | { type: 'blessing'; name: string; message: string };

export class GuestbookError extends Error {}

const REQUEST_TIMEOUT_MS = 12_000;
const REPLY_ID_KEY = 'invite-reply-id';

export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Private browsing: nothing is remembered, replies still send.
    }
  },
};

function replyId(): string {
  let id = storage.get(REPLY_ID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    storage.set(REPLY_ID_KEY, id);
  }
  return id;
}

export async function sendToGuestbook(endpoint: string, entry: GuestbookEntry): Promise<void> {
  if (!endpoint) {
    if (import.meta.env.DEV) {
      console.info('[guestbook] No endpoint in src/config/wedding.ts yet; this reply was not saved.', entry);
      await new Promise((resolve) => setTimeout(resolve, 700));
      return;
    }
    throw new GuestbookError('Replies aren’t connected yet. Please let the family know directly.');
  }

  // A plain form post: Apps Script can't answer CORS preflights, and this needs none.
  const body = new URLSearchParams({ id: replyId() });
  for (const [key, value] of Object.entries(entry)) body.set(key, String(value));

  let response: Response;
  try {
    response = await fetch(endpoint, { method: 'POST', body, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new GuestbookError('Couldn’t reach the guestbook. Check your connection and try again.');
  }
  const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!response.ok || !result?.ok) {
    throw new GuestbookError(result?.error ?? 'That didn’t go through. Try again in a moment.');
  }
}
