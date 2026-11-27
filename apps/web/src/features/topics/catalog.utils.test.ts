import type { CatalogCategory } from '@pq/shared';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_SELECTION,
  isSubcategorySelected,
  normalizeForSearch,
  searchCategories,
  selectionQuestionCount,
  toggleCategory,
  toggleSubcategory,
  toRequestSelection,
} from './catalog.utils';

const music: CatalogCategory = {
  id: 'music',
  name: 'Muzyka',
  questionCount: 30,
  subcategories: [
    { id: 'music/eurovision', name: 'Eurowizja', questionCount: 10 },
    { id: 'music/polish_music', name: 'Muzyka polska', questionCount: 20 },
  ],
};
const geography: CatalogCategory = {
  id: 'geography',
  name: 'Geografia',
  questionCount: 40,
  subcategories: [{ id: 'geography/cities', name: 'Miasta, np. Łódź', questionCount: 40 }],
};
const all = [music, geography];

describe('normalizeForSearch', () => {
  it('ignores case and diacritics, including Polish ł', () => {
    expect(normalizeForSearch('  Łódź ')).toBe('lodz');
    expect(normalizeForSearch('Żółw')).toBe('zolw');
  });

  it('keeps Cyrillic letters searchable', () => {
    expect(normalizeForSearch('Історія')).toBe(normalizeForSearch('історія'));
  });
});

describe('selection', () => {
  it('counts whole categories and single subcategories without double counting', () => {
    const selected = toggleSubcategory(
      toggleCategory(EMPTY_SELECTION, 'geography'),
      music,
      'music/eurovision',
    );

    expect(selectionQuestionCount(all, selected)).toBe(50);
  });

  it('replaces single subcategories when the whole category is selected', () => {
    const one = toggleSubcategory(EMPTY_SELECTION, music, 'music/eurovision');
    const whole = toggleCategory(one, 'music');

    expect(toRequestSelection(whole)).toEqual({ categories: ['music'], subcategories: [] });
  });

  it('turns a whole category into its other subcategories when one is unticked', () => {
    const whole = toggleCategory(EMPTY_SELECTION, 'music');
    const without = toggleSubcategory(whole, music, 'music/eurovision');

    expect(toRequestSelection(without)).toEqual({
      categories: [],
      subcategories: ['music/polish_music'],
    });
    expect(isSubcategorySelected(without, 'music', 'music/eurovision')).toBe(false);
  });

  it('turns all subcategories ticked one by one into the whole category', () => {
    const a = toggleSubcategory(EMPTY_SELECTION, music, 'music/eurovision');
    const b = toggleSubcategory(a, music, 'music/polish_music');

    expect(toRequestSelection(b)).toEqual({ categories: ['music'], subcategories: [] });
  });
});

describe('searchCategories', () => {
  it('lists everything for an empty query', () => {
    expect(searchCategories(all, ' ')).toHaveLength(2);
  });

  it('finds a category by its name with all its subcategories', () => {
    expect(searchCategories(all, 'muzy')).toEqual([
      { category: music, subcategories: music.subcategories, matchedSubcategory: false },
    ]);
  });

  it('finds a category through a subcategory and lists only the matching ones', () => {
    const [hit] = searchCategories(all, 'lodz');

    expect(hit?.category.id).toBe('geography');
    expect(hit?.matchedSubcategory).toBe(true);
    expect(hit?.subcategories.map((s) => s.id)).toEqual(['geography/cities']);
  });
});
