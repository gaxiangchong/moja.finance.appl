import { DEFAULT_CATS } from './config';
import { loadCustomCategories, saveCustomCategoriesRaw } from './storage';

/** Merge built-in categories with user-added custom ones ('Other' always last). */
export function loadCategories(): string[] {
  const custom = loadCustomCategories();
  return [...new Set([...DEFAULT_CATS.filter(c => c !== 'Other'), ...custom, 'Other'])];
}

/** Persist only the custom (non-default) categories. */
export function saveCustomCategories(categories: string[]): void {
  const custom = categories.filter(c => !DEFAULT_CATS.includes(c));
  saveCustomCategoriesRaw(custom);
}

export type AddCategoryResult =
  | { ok: true; categories: string[] }
  | { ok: false; categories: string[]; reason: 'empty' | 'duplicate' };

/** Add a new category name; returns updated list ('Other' stays last). */
export function addCategory(categories: string[], name: string): AddCategoryResult {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, categories, reason: 'empty' };
  }
  if (categories.includes(trimmed)) {
    return { ok: false, categories, reason: 'duplicate' };
  }
  const next = [...categories.filter(c => c !== 'Other'), trimmed, 'Other'];
  saveCustomCategories(next);
  return { ok: true, categories: next };
}
