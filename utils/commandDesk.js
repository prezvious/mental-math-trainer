function normalizeSearchValue(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function filterThemeOptionGroups(groups = [], query = '') {
  if (!Array.isArray(groups)) {
    return [];
  }

  const normalizedQuery = normalizeSearchValue(query);

  return groups
    .map((group) => {
      const collectionLabel = normalizeSearchValue(group?.label);
      const themes = Array.isArray(group?.themes) ? group.themes : [];
      const filteredThemes = normalizedQuery
        ? themes.filter((theme) =>
            [theme?.name, theme?.vibe, collectionLabel].some((value) =>
              normalizeSearchValue(value).includes(normalizedQuery)
            )
          )
        : themes;

      return {
        ...group,
        themes: filteredThemes
      };
    })
    .filter((group) => group.themes.length > 0);
}
