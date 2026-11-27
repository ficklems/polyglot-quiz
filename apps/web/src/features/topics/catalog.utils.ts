import type { CatalogCategory, Selection } from '@pq/shared';

/**
 * Lower-case, without accents, so "lodz" finds "Łódź" and "eurowizja" finds "Eurowizja".
 * NFD splits most accented letters; ł and ø have no decomposition and are mapped by hand.
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll('ł', 'l')
    .replaceAll('ø', 'o')
    .trim();
}

export type PickerSelection = {
  categories: ReadonlySet<string>;
  subcategories: ReadonlySet<string>;
};

export const EMPTY_SELECTION: PickerSelection = { categories: new Set(), subcategories: new Set() };

export function isEmpty(selection: PickerSelection): boolean {
  return selection.categories.size === 0 && selection.subcategories.size === 0;
}

/** Selecting a whole category replaces any of its single subcategories. */
export function toggleCategory(selection: PickerSelection, categoryId: string): PickerSelection {
  const categories = new Set(selection.categories);
  const subcategories = new Set(selection.subcategories);
  if (categories.has(categoryId)) {
    categories.delete(categoryId);
  } else {
    categories.add(categoryId);
    for (const ref of subcategories) {
      if (ref.startsWith(`${categoryId}/`)) subcategories.delete(ref);
    }
  }
  return { categories, subcategories };
}

/**
 * Toggles one subcategory. Inside a fully selected category, unticking a subcategory turns
 * the category into "all its other subcategories".
 */
export function toggleSubcategory(
  selection: PickerSelection,
  category: CatalogCategory,
  subId: string,
): PickerSelection {
  const categories = new Set(selection.categories);
  const subcategories = new Set(selection.subcategories);
  if (categories.has(category.id)) {
    categories.delete(category.id);
    for (const sub of category.subcategories) {
      if (sub.id !== subId) subcategories.add(sub.id);
    }
  } else if (subcategories.has(subId)) {
    subcategories.delete(subId);
  } else {
    subcategories.add(subId);
    // Every subcategory ticked = the whole category.
    if (category.subcategories.every((s) => subcategories.has(s.id))) {
      for (const sub of category.subcategories) subcategories.delete(sub.id);
      categories.add(category.id);
    }
  }
  return { categories, subcategories };
}

export function isSubcategorySelected(
  selection: PickerSelection,
  categoryId: string,
  subId: string,
): boolean {
  return selection.categories.has(categoryId) || selection.subcategories.has(subId);
}

/** How many playable questions the selection covers. Subcategories partition a category. */
export function selectionQuestionCount(
  categories: readonly CatalogCategory[],
  selection: PickerSelection,
): number {
  let total = 0;
  for (const category of categories) {
    if (selection.categories.has(category.id)) {
      total += category.questionCount;
      continue;
    }
    for (const sub of category.subcategories) {
      if (selection.subcategories.has(sub.id)) total += sub.questionCount;
    }
  }
  return total;
}

/** The request body for POST /api/rounds. */
export function toRequestSelection(selection: PickerSelection): Selection {
  return {
    categories: [...selection.categories].sort(),
    subcategories: [...selection.subcategories].sort(),
  };
}

export type VisibleCategory = {
  category: CatalogCategory;
  /** Subcategories to list under it; with a search, only the matching ones. */
  subcategories: CatalogCategory['subcategories'];
  /** A search hit inside the subcategories opens the category so the hit is visible. */
  matchedSubcategory: boolean;
};

/**
 * Categories that match the search by their own name or by one of their subcategories.
 * Without a search everything is listed.
 */
export function searchCategories(
  categories: readonly CatalogCategory[],
  query: string,
): VisibleCategory[] {
  const needle = normalizeForSearch(query);
  if (needle === '') {
    return categories.map((category) => ({
      category,
      subcategories: category.subcategories,
      matchedSubcategory: false,
    }));
  }
  const result: VisibleCategory[] = [];
  for (const category of categories) {
    const nameMatches = normalizeForSearch(category.name).includes(needle);
    const subs = category.subcategories.filter((s) => normalizeForSearch(s.name).includes(needle));
    if (nameMatches) {
      result.push({ category, subcategories: category.subcategories, matchedSubcategory: false });
    } else if (subs.length > 0) {
      result.push({ category, subcategories: subs, matchedSubcategory: true });
    }
  }
  return result;
}
