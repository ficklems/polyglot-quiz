import type { CatalogCategory } from '@pq/shared';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  isSubcategorySelected,
  searchCategories,
  toggleCategory,
  toggleSubcategory,
  type PickerSelection,
} from '../catalog.utils';
import { TopicIcon } from './TopicIcon';

/** How many categories the list shows before "Show all". */
export const COLLAPSED_CATEGORIES = 8;

type Props = {
  categories: CatalogCategory[];
  selection: PickerSelection;
  onChange: (selection: PickerSelection) => void;
};

export function CategoryPicker({ categories, selection, onChange }: Props) {
  const { t } = useTranslation();
  const searchId = useId();
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const searching = query.trim() !== '';
  const matches = searchCategories(categories, query);
  const hasSelection = (c: CatalogCategory) =>
    selection.categories.has(c.id) ||
    c.subcategories.some((s) => selection.subcategories.has(s.id));
  // Collapsed, the list keeps anything already selected, so a choice never disappears.
  const visible =
    searching || showAll
      ? matches
      : matches.filter((m, i) => i < COLLAPSED_CATEGORIES || hasSelection(m.category));

  const toggleExpanded = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  return (
    <section className="picker" aria-labelledby="categories-heading">
      <h2 id="categories-heading" className="section-title">
        {t('categories.heading')}
      </h2>
      <p className="section-hint">{t('categories.hint')}</p>

      <label className="field-label" htmlFor={searchId}>
        {t('categories.searchLabel')}
      </label>
      <input
        id={searchId}
        type="search"
        className="text-input search-input"
        placeholder={t('categories.searchPlaceholder')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {searching && (
        <p className="visually-hidden" role="status">
          {t('categories.results', { count: matches.length })}
        </p>
      )}
      {searching && matches.length === 0 && (
        <p className="status">{t('categories.noResults', { query: query.trim() })}</p>
      )}

      <ul className="category-list">
        {visible.map(({ category, subcategories, matchedSubcategory }) => {
          const open = expanded.has(category.id) || matchedSubcategory;
          const subsId = `subs-${category.id}`;
          return (
            <li key={category.id} className="category-row">
              <div className="category-main">
                <button
                  type="button"
                  className="topic-card category-toggle"
                  aria-pressed={selection.categories.has(category.id)}
                  data-category-id={category.id}
                  onClick={() => onChange(toggleCategory(selection, category.id))}
                >
                  <span className="topic-icon">
                    <TopicIcon topicId={category.id} />
                  </span>
                  <span className="topic-name">{category.name}</span>
                </button>
                {subcategories.length > 0 && (
                  <button
                    type="button"
                    className="icon-button expand-button"
                    aria-expanded={open}
                    aria-controls={open ? subsId : undefined}
                    aria-label={t('categories.subcategoriesOf', { name: category.name })}
                    onClick={() => toggleExpanded(category.id)}
                    disabled={matchedSubcategory}
                  >
                    <svg
                      aria-hidden="true"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                )}
              </div>
              <span className="topic-meta category-meta">
                {t('topics.questions', { count: category.questionCount })}
              </span>
              {open && (
                <div
                  role="group"
                  id={subsId}
                  className="subcategory-list"
                  aria-label={t('categories.subcategoriesOf', { name: category.name })}
                >
                  {subcategories.map((sub) => (
                    <span key={sub.id} className="subcategory-item">
                      <button
                        type="button"
                        className="filter-chip"
                        aria-pressed={isSubcategorySelected(selection, category.id, sub.id)}
                        data-subcategory-id={sub.id}
                        onClick={() => onChange(toggleSubcategory(selection, category, sub.id))}
                      >
                        {sub.name}
                      </button>
                      <span className="chip-count" aria-hidden="true">
                        {sub.questionCount}
                      </span>
                      <span className="visually-hidden">
                        {t('topics.questions', { count: sub.questionCount })}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {!searching && categories.length > COLLAPSED_CATEGORIES && (
        <button
          type="button"
          className="secondary-button show-all"
          aria-expanded={showAll}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll
            ? t('categories.showFewer')
            : t('categories.showAll', { count: categories.length })}
        </button>
      )}
    </section>
  );
}
