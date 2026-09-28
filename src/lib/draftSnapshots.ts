export interface DraftSnapshot {
  id: string;
  timestamp: string;
  label: string;
  content: string;
  wordCount: number;
}

export const DRAFT_HISTORY_PREFIX = 'zeinity_draft_history_';
export const MAX_DRAFT_SNAPSHOTS = 5;

/**
 * Retrieve saved draft snapshots for a content item from localStorage.
 */
export function getDraftSnapshots(itemId: string): DraftSnapshot[] {
  if (typeof window === 'undefined' && typeof globalThis.localStorage === 'undefined') return [];
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage;
    const raw = storage?.getItem(`${DRAFT_HISTORY_PREFIX}${itemId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore corrupted JSON or localStorage quota issues
  }
  return [];
}

/**
 * Save a new draft snapshot capped at MAX_DRAFT_SNAPSHOTS (5) items.
 * Avoids saving duplicates if the latest snapshot already contains identical content.
 */
export function saveDraftSnapshot(
  itemId: string,
  content: string,
  label = 'Sebelum Revisi AI'
): DraftSnapshot[] {
  if (!content || !content.trim()) return getDraftSnapshots(itemId);
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage;
    if (!storage) return [];

    const existing = getDraftSnapshots(itemId);
    if (existing.length > 0 && existing[0].content.trim() === content.trim()) {
      return existing;
    }

    const newSnapshot: DraftSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      label,
      content,
      wordCount: content.trim().split(/\s+/).filter(Boolean).length,
    };

    const updated = [newSnapshot, ...existing].slice(0, MAX_DRAFT_SNAPSHOTS);
    storage.setItem(`${DRAFT_HISTORY_PREFIX}${itemId}`, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to save draft snapshot:', err);
    return getDraftSnapshots(itemId);
  }
}
