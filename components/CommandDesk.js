import { useEffect, useMemo, useRef, useState } from 'react';
import HotkeyHint from 'components/HotkeyHint.js';
import XIcon from 'images/phosphor/x-bold.svg';
import { filterThemeOptionGroups } from 'utils/commandDesk.js';
import {
  DEFAULT_DISPLAY_MODE,
  DISPLAY_MODE_OPTIONS
} from 'utils/displayMode.js';
import { HOTKEY_REFERENCE_GROUPS, formatHotkeyLabel } from 'utils/hotkeys.js';
import {
  DEFAULT_THEME_KEY,
  THEME_COLLECTION_OPTIONS,
  THEME_OPTIONS
} from 'utils/themes.js';

const THEME_OPTION_GROUPS = THEME_COLLECTION_OPTIONS.map((collection) => ({
  ...collection,
  themes: THEME_OPTIONS.filter((theme) => theme.collection === collection.key)
}));

const SHORTCUT_COUNT = HOTKEY_REFERENCE_GROUPS.reduce(
  (count, group) => count + group.items.length,
  0
);

function ThemeSwatches({ theme, className = '' }) {
  return (
    <span
      className={`theme-preview-swatches ${className}`.trim()}
      aria-hidden='true'
    >
      {theme.colors.map((color) => (
        <span
          key={`${theme.key}-${color}`}
          className='theme-preview-swatch'
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}

export default function CommandDesk({
  activeTheme,
  closeButtonRef,
  displayMode,
  drawerRef,
  isLoadingPreferences,
  onClose,
  onDisplayModeChange,
  onResetAppearance,
  onThemeChange
}) {
  const [view, setView] = useState('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [isShortcutsExpanded, setIsShortcutsExpanded] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const searchInputRef = useRef(null);
  const themeResultsRef = useRef(null);
  const themeSummaryButtonRef = useRef(null);
  const shouldRestoreThemeFocusRef = useRef(false);

  const filteredThemeGroups = useMemo(
    () => filterThemeOptionGroups(THEME_OPTION_GROUPS, searchQuery),
    [searchQuery]
  );
  const visibleThemeCount = filteredThemeGroups.reduce(
    (count, group) => count + group.themes.length,
    0
  );

  useEffect(() => {
    if (view === 'themes') {
      searchInputRef.current?.focus();
      return;
    }

    if (shouldRestoreThemeFocusRef.current) {
      themeSummaryButtonRef.current?.focus();
      shouldRestoreThemeFocusRef.current = false;
    }
  }, [view]);

  const getThemeResultButtons = () =>
    Array.from(
      themeResultsRef.current?.querySelectorAll(
        '[data-theme-result]:not(:disabled)'
      ) || []
    );

  const focusThemeResult = (index) => {
    const resultButtons = getThemeResultButtons();
    if (!resultButtons.length) {
      return;
    }

    const boundedIndex = Math.max(0, Math.min(index, resultButtons.length - 1));
    resultButtons[boundedIndex].focus();
  };

  const returnToMain = () => {
    shouldRestoreThemeFocusRef.current = true;
    setSearchQuery('');
    setView('main');
  };

  const handleDrawerKeyDown = (event) => {
    if (event.key === 'Escape' && view === 'themes') {
      event.preventDefault();
      event.stopPropagation();
      returnToMain();
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusThemeResult(0);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusThemeResult(visibleThemeCount - 1);
    }
  };

  const handleThemeResultKeyDown = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return;
    }

    const resultButtons = getThemeResultButtons();
    const currentIndex = resultButtons.indexOf(event.currentTarget);
    if (currentIndex === -1) {
      return;
    }

    event.preventDefault();

    if (event.key === 'Home') {
      focusThemeResult(0);
      return;
    }

    if (event.key === 'End') {
      focusThemeResult(resultButtons.length - 1);
      return;
    }

    focusThemeResult(currentIndex + (event.key === 'ArrowDown' ? 1 : -1));
  };

  const handleThemeSelection = (themeKey) => {
    setStatusMessage('Theme applied.');
    onThemeChange(themeKey);
  };

  const handleDisplayModeSelection = (nextDisplayMode) => {
    setStatusMessage('');
    onDisplayModeChange(nextDisplayMode);
  };

  const handleResetAppearance = () => {
    setStatusMessage('Appearance reset to Carbon Paper and Adaptive mode.');
    Promise.resolve(onResetAppearance()).then(
      () => themeSummaryButtonRef.current?.focus(),
      () => themeSummaryButtonRef.current?.focus()
    );
  };

  const isAppearanceDefault =
    activeTheme.key === DEFAULT_THEME_KEY &&
    displayMode === DEFAULT_DISPLAY_MODE;

  return (
    <section
      ref={drawerRef}
      id='utility-drawer'
      className='utility-drawer-shell utility-drawer appear-up'
      role='dialog'
      aria-modal='true'
      aria-labelledby='utility-drawer-title'
      data-utility-view={view}
      onKeyDown={handleDrawerKeyDown}
    >
      {view === 'themes' ? (
        <div className='utility-panel command-desk-panel theme-browser-view'>
          <div className='theme-browser-header'>
            <button
              type='button'
              className='theme-browser-back'
              onClick={returnToMain}
            >
              <span aria-hidden='true'>←</span>
              Back
            </button>
            <h2 id='utility-drawer-title' className='utility-title'>
              Appearance themes
            </h2>
            <button
              ref={closeButtonRef}
              type='button'
              className='control-drawer-close'
              onClick={onClose}
              aria-label='Close utility drawer'
            >
              <XIcon className='control-drawer-close-icon' />
            </button>
          </div>

          <div className='theme-search-field'>
            <label className='theme-label' htmlFor='theme-search'>
              Search themes
            </label>
            <input
              ref={searchInputRef}
              id='theme-search'
              name='theme-search'
              className='theme-search-input'
              type='search'
              value={searchQuery}
              placeholder={`Search ${THEME_OPTIONS.length} themes…`}
              autoComplete='off'
              spellCheck={false}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <p className='theme-search-status' role='status' aria-live='polite'>
              {visibleThemeCount === 1
                ? '1 theme'
                : `${visibleThemeCount} themes`}
            </p>
          </div>

          <div ref={themeResultsRef} className='theme-browser-results'>
            {filteredThemeGroups.length > 0 ? (
              filteredThemeGroups.map((group) => (
                <section
                  key={group.key}
                  className='theme-result-group'
                  aria-labelledby={`theme-group-${group.key}`}
                >
                  <h3
                    id={`theme-group-${group.key}`}
                    className='theme-result-group-title'
                  >
                    {group.label}
                  </h3>
                  <ul className='theme-result-list'>
                    {group.themes.map((theme) => {
                      const isSelected = theme.key === activeTheme.key;

                      return (
                        <li key={theme.key}>
                          <button
                            type='button'
                            className={`theme-result-button ${
                              isSelected ? 'is-selected' : ''
                            }`.trim()}
                            data-theme-result
                            aria-current={isSelected ? 'true' : undefined}
                            disabled={isLoadingPreferences}
                            onClick={() => handleThemeSelection(theme.key)}
                            onKeyDown={handleThemeResultKeyDown}
                          >
                            <ThemeSwatches
                              theme={theme}
                              className='theme-result-swatches'
                            />
                            <span className='theme-result-name'>
                              {theme.name}
                            </span>
                            <span
                              className='theme-result-check'
                              aria-hidden='true'
                            >
                              {isSelected ? '✓' : ''}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            ) : (
              <div className='theme-search-empty'>
                <p>{`No themes match “${searchQuery.trim()}”.`}</p>
                <button
                  type='button'
                  className='button button-quiet'
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className='utility-panel command-desk-panel'>
          <div className='utility-header command-desk-header'>
            <h2 id='utility-drawer-title' className='utility-title'>
              Command Desk
            </h2>
            <button
              ref={closeButtonRef}
              type='button'
              className='control-drawer-close'
              onClick={onClose}
              aria-label='Close utility drawer'
            >
              <XIcon className='control-drawer-close-icon' />
            </button>
          </div>

          <section className='utility-section command-desk-appearance'>
            <div className='utility-section-head'>
              <p className='theme-kicker'>Appearance</p>
            </div>
            <fieldset
              className='display-mode-fieldset'
              disabled={isLoadingPreferences}
            >
              <legend className='theme-label'>Mode</legend>
              <div className='display-mode-options'>
                {DISPLAY_MODE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`display-mode-option ${
                      displayMode === option.value ? 'is-active' : ''
                    }`.trim()}
                  >
                    <input
                      type='radio'
                      name='display-mode'
                      value={option.value}
                      checked={displayMode === option.value}
                      onChange={() => handleDisplayModeSelection(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              ref={themeSummaryButtonRef}
              type='button'
              className='theme-summary-button'
              disabled={isLoadingPreferences}
              aria-label={`Browse themes. Selected theme: ${activeTheme.name}`}
              onClick={() => {
                setStatusMessage('');
                setView('themes');
              }}
            >
              <span className='theme-summary-copy'>
                <span className='theme-label'>Theme</span>
                <span className='theme-summary-name'>{activeTheme.name}</span>
              </span>
              <ThemeSwatches
                theme={activeTheme}
                className='theme-summary-swatches'
              />
              <span className='theme-summary-indicator' aria-hidden='true'>
                ›
              </span>
            </button>

            <div className='appearance-actions'>
              <button
                type='button'
                className='command-desk-reset'
                disabled={isLoadingPreferences || isAppearanceDefault}
                onClick={handleResetAppearance}
              >
                Reset appearance
              </button>
            </div>
          </section>

          <section className='utility-section shortcut-disclosure-section'>
            <button
              type='button'
              className='shortcut-disclosure-button'
              aria-expanded={isShortcutsExpanded}
              aria-controls='command-desk-shortcuts'
              onClick={() =>
                setIsShortcutsExpanded((currentState) => !currentState)
              }
            >
              <span>Keyboard shortcuts</span>
              <span className='shortcut-disclosure-meta'>
                <span className='shortcut-count'>{SHORTCUT_COUNT}</span>
                <span className='shortcut-disclosure-mark' aria-hidden='true'>
                  {isShortcutsExpanded ? '−' : '+'}
                </span>
              </span>
            </button>

            {isShortcutsExpanded && (
              <div id='command-desk-shortcuts' className='hotkey-reference'>
                {HOTKEY_REFERENCE_GROUPS.map((group) => (
                  <section
                    key={group.id}
                    className='hotkey-group'
                    aria-labelledby={`command-desk-${group.id}-title`}
                  >
                    <h3
                      id={`command-desk-${group.id}-title`}
                      className='hotkey-group-title'
                    >
                      {group.label}
                    </h3>
                    <ul className='hotkey-group-list'>
                      {group.items.map((item) => (
                        <li
                          key={`${group.id}-${item.shortcut}-${item.label}`}
                          className='hotkey-row'
                        >
                          <span className='hotkey-row-label'>{item.label}</span>
                          <HotkeyHint
                            label={formatHotkeyLabel(item.shortcut)}
                            variant='reference'
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
      <p className='command-desk-status' aria-live='polite'>
        {statusMessage}
      </p>
    </section>
  );
}
