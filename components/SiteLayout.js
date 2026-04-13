import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HotkeyHint from 'components/HotkeyHint.js';
import IconLabel from 'components/IconLabel.js';
import ChartLineUpIcon from 'images/phosphor/chart-line-up.svg';
import CommandIcon from 'images/phosphor/command-bold.svg';
import HouseIcon from 'images/phosphor/house.svg';
import KeyboardIcon from 'images/phosphor/keyboard-bold.svg';
import PaletteIcon from 'images/phosphor/palette-bold.svg';
import SquaresFourIcon from 'images/phosphor/squares-four.svg';
import { useAccountPreferences } from 'utils/accountPreferencesContext.js';
import { useActiveSession } from 'utils/activeSessionContext.js';
import {
  GLOBAL_HOTKEY_ACTIONS,
  GLOBAL_HOTKEY_KEYS,
  HOTKEY_REFERENCE_GROUPS,
  formatHotkeyLabel,
  getGlobalHotkeyAction,
  getGlobalHotkeyLabel,
  getNextThemeKey,
  isShortcutEventEligible
} from 'utils/hotkeys.js';
import { useSupabaseAuth } from 'utils/supabaseAuthContext.js';
import {
  getThemeByKey,
  THEME_OPTIONS
} from 'utils/themes.js';

const CONTROL_TABS = Object.freeze({
  THEME: 'theme',
  HOTKEYS: 'hotkeys'
});

export default function SiteLayout({ children }) {
  const router = useRouter();
  const { user, isConfigured, signOut } = useSupabaseAuth();
  const { terminateActiveSession } = useActiveSession();
  const { themeKey, isLoadingPreferences, upsertPreferences } =
    useAccountPreferences();
  const [isThemePanelOpen, setIsThemePanelOpen] = useState(false);
  const [activeControlTab, setActiveControlTab] = useState(CONTROL_TABS.THEME);
  const themeButtonRef = useRef(null);
  const themeSelectRef = useRef(null);
  const wasThemePanelOpenRef = useRef(false);

  useEffect(() => {
    const closeThemePanel = () => {
      setIsThemePanelOpen(false);
      setActiveControlTab(CONTROL_TABS.THEME);
    };
    router.events.on('routeChangeStart', closeThemePanel);
    return () => router.events.off('routeChangeStart', closeThemePanel);
  }, [router.events]);

  useEffect(() => {
    if (!isThemePanelOpen || typeof window === 'undefined') {
      return undefined;
    }

    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setIsThemePanelOpen(false);
      }
    };

    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [isThemePanelOpen]);

  useEffect(() => {
    if (isThemePanelOpen) {
      wasThemePanelOpenRef.current = true;
      if (activeControlTab === CONTROL_TABS.THEME) {
        themeSelectRef.current?.focus();
      }
      return;
    }

    if (wasThemePanelOpenRef.current) {
      themeButtonRef.current?.focus();
      wasThemePanelOpenRef.current = false;
    }
  }, [activeControlTab, isThemePanelOpen]);

  useEffect(() => {
    if (!isThemePanelOpen) {
      setActiveControlTab(CONTROL_TABS.THEME);
    }
  }, [isThemePanelOpen]);

  const activeTheme = useMemo(() => getThemeByKey(themeKey), [themeKey]);
  const trainerShortcut = getGlobalHotkeyLabel(GLOBAL_HOTKEY_ACTIONS.TRAINER);
  const mixedShortcut = getGlobalHotkeyLabel(GLOBAL_HOTKEY_ACTIONS.MIXED);
  const progressShortcut = getGlobalHotkeyLabel(GLOBAL_HOTKEY_ACTIONS.PROGRESS);
  const loginShortcut = getGlobalHotkeyLabel(GLOBAL_HOTKEY_ACTIONS.LOGIN);
  const signupShortcut = getGlobalHotkeyLabel(GLOBAL_HOTKEY_ACTIONS.SIGNUP);
  const logoutShortcut = getGlobalHotkeyLabel(GLOBAL_HOTKEY_ACTIONS.LOGOUT);
  const themeShortcut = getGlobalHotkeyLabel(GLOBAL_HOTKEY_ACTIONS.THEME);

  const themeStyle = useMemo(
    () => ({
      '--ink-900': activeTheme.tokens.ink900,
      '--ink-700': activeTheme.tokens.ink700,
      '--ink-500': activeTheme.tokens.ink500,
      '--paper': activeTheme.tokens.paper,
      '--paper-strong': activeTheme.tokens.paperStrong,
      '--sand': activeTheme.tokens.sand,
      '--accent-main': activeTheme.tokens.accentMain,
      '--accent-warm': activeTheme.tokens.accentWarm,
      '--accent-soft': activeTheme.tokens.accentSoft,
      '--accent-alert': activeTheme.tokens.accentAlert,
      '--text-main': activeTheme.tokens.textMain,
      '--text-subtle': activeTheme.tokens.textSubtle,
      '--line': activeTheme.tokens.line,
      '--button-strong-text': activeTheme.tokens.buttonStrongText,
      '--button-quiet-text': activeTheme.tokens.buttonQuietText,
      '--glow-main': activeTheme.tokens.glowMain,
      '--glow-warm': activeTheme.tokens.glowWarm,
      '--glow-soft': activeTheme.tokens.glowSoft,
      '--glow-line': activeTheme.tokens.glowLine,
      '--layout-main-max': activeTheme.layout.mainMax,
      '--layout-main-gap': activeTheme.layout.mainGap,
      '--layout-main-top': activeTheme.layout.mainTop,
      '--layout-main-bottom': activeTheme.layout.mainBottom,
      '--layout-header-columns': activeTheme.layout.headerColumns,
      '--layout-brand-order': String(activeTheme.layout.brandOrder),
      '--layout-nav-order': String(activeTheme.layout.navOrder),
      '--layout-actions-order': String(activeTheme.layout.actionsOrder),
      '--layout-brand-align': activeTheme.layout.brandAlign,
      '--layout-nav-align': activeTheme.layout.navAlign,
      '--layout-actions-align': activeTheme.layout.actionsAlign,
      '--layout-trainer-columns': activeTheme.layout.trainerColumns,
      '--layout-guest-columns': activeTheme.layout.guestColumns,
      '--layout-summary-columns': activeTheme.layout.summaryColumns,
      '--layout-operation-columns': activeTheme.layout.operationColumns,
      '--layout-panel-radius': activeTheme.layout.panelRadius,
      '--layout-panel-border-width': activeTheme.layout.panelBorderWidth,
      '--layout-card-tilt': activeTheme.layout.cardTilt,
      '--layout-card-lift': activeTheme.layout.cardLift,
      '--layout-hero-size': activeTheme.layout.heroSize,
      '--layout-hero-rotate': activeTheme.layout.heroRotate,
      '--layout-hero-offset-x': activeTheme.layout.heroOffsetX,
      '--layout-hero-offset-y': activeTheme.layout.heroOffsetY,
      '--layout-hero-accent-width': activeTheme.layout.heroAccentWidth,
      '--layout-hero-accent-height': activeTheme.layout.heroAccentHeight,
      '--layout-hero-accent-rotate': activeTheme.layout.heroAccentRotate,
      '--layout-hero-accent-x': activeTheme.layout.heroAccentX,
      '--layout-hero-accent-y': activeTheme.layout.heroAccentY,
      '--layout-bg-angle': activeTheme.layout.bgAngle,
      '--layout-bg-stop': activeTheme.layout.bgStop,
      '--layout-animation-duration': activeTheme.layout.animationDuration
    }),
    [activeTheme]
  );

  const navLinks = [
    {
      href: '/',
      label: 'Trainer',
      icon: HouseIcon,
      hotkey: trainerShortcut
    },
    {
      href: '/mixed',
      label: 'Mixed',
      icon: SquaresFourIcon,
      hotkey: mixedShortcut
    },
    {
      href: '/stats',
      label: 'Progress',
      icon: ChartLineUpIcon,
      hotkey: progressShortcut
    }
  ];

  const handleSignOut = useCallback(async () => {
    try {
      await terminateActiveSession('sign-out');
    } catch (error) {
      console.error('Failed to persist the active session before sign out.', error);
    }

    const { error } = await signOut();
    if (!error) {
      await router.push('/login');
    }
  }, [router, signOut, terminateActiveSession]);

  const handleThemeChange = (event) => {
    void upsertPreferences({ themeKey: event.target.value });
  };

  const cycleTheme = useCallback(() => {
    if (user && isLoadingPreferences) {
      return;
    }

    void upsertPreferences({
      themeKey: getNextThemeKey(themeKey, THEME_OPTIONS)
    });
  }, [isLoadingPreferences, themeKey, upsertPreferences, user]);

  const handleThemeFabToggle = useCallback(() => {
    setIsThemePanelOpen((isOpen) => !isOpen);
    setActiveControlTab(CONTROL_TABS.THEME);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const routeByAction = {
      [GLOBAL_HOTKEY_ACTIONS.TRAINER]: '/',
      [GLOBAL_HOTKEY_ACTIONS.MIXED]: '/mixed',
      [GLOBAL_HOTKEY_ACTIONS.PROGRESS]: '/stats',
      [GLOBAL_HOTKEY_ACTIONS.LOGIN]: '/login',
      [GLOBAL_HOTKEY_ACTIONS.SIGNUP]: '/signup'
    };

    const handleGlobalShortcut = (event) => {
      if (!isShortcutEventEligible(event)) {
        return;
      }

      const action = getGlobalHotkeyAction(event.key);
      if (!action) {
        return;
      }

      if (
        [GLOBAL_HOTKEY_ACTIONS.LOGIN, GLOBAL_HOTKEY_ACTIONS.SIGNUP].includes(action) &&
        user
      ) {
        return;
      }

      if (action === GLOBAL_HOTKEY_ACTIONS.LOGOUT && !user) {
        return;
      }

      if (action === GLOBAL_HOTKEY_ACTIONS.THEME) {
        event.preventDefault();
        cycleTheme();
        return;
      }

      if (action === GLOBAL_HOTKEY_ACTIONS.LOGOUT) {
        event.preventDefault();
        void handleSignOut();
        return;
      }

      const nextRoute = routeByAction[action];
      if (!nextRoute || router.pathname === nextRoute) {
        return;
      }

      event.preventDefault();
      void router.push(nextRoute);
    };

    window.addEventListener('keydown', handleGlobalShortcut);
    return () => window.removeEventListener('keydown', handleGlobalShortcut);
  }, [cycleTheme, handleSignOut, router, user]);

  return (
    <div className='app-shell' data-theme-key={activeTheme.key} style={themeStyle}>
      <header className='site-header'>
        <div className='site-header-inner'>
          <Link href='/' className='brand' aria-label='Mental Math home'>
            <span className='brand-chip'>Studio</span>
            <span className='brand-title'>Mental Math</span>
          </Link>
          <nav className='site-nav' aria-label='Main'>
            {navLinks.map((link) => {
              const isActive = router.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`site-nav-link ${isActive ? 'is-active' : ''}`}
                  aria-keyshortcuts={link.hotkey}
                >
                  <IconLabel icon={link.icon} className='icon-label-nav'>
                    {link.label}
                  </IconLabel>
                </Link>
              );
            })}
          </nav>
          <div className={`site-actions${user ? ' has-user-session' : ''}`}>
            {!isConfigured && <span className='status-badge'>Account sync unavailable</span>}
            {user ? (
              <div className='site-session'>
                <span className='user-pill'>{user.email}</span>
                <button
                  type='button'
                  className='button button-quiet'
                  onClick={handleSignOut}
                  aria-keyshortcuts={logoutShortcut}
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className='site-auth-links'>
                <Link
                  href='/login'
                  className='button button-quiet'
                  aria-keyshortcuts={loginShortcut}
                >
                  Log in
                </Link>
                <Link
                  href='/signup'
                  className='button button-strong'
                  aria-keyshortcuts={signupShortcut}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className='site-main'>{children}</main>
      <footer className='site-footer'>
        <p>
          Built for focused repetition, measurable progress, and ruthless consistency.
        </p>
      </footer>
      <div className='theme-floating-layer'>
        <div className='theme-fab-shell'>
          <button
            ref={themeButtonRef}
            type='button'
            className='theme-fab'
            onClick={handleThemeFabToggle}
            aria-label='Open appearance and hotkeys'
            aria-expanded={isThemePanelOpen}
            aria-controls='appearance-hotkeys-panel'
            aria-keyshortcuts={themeShortcut}
          >
            <CommandIcon className='theme-fab-icon' />
          </button>
          <HotkeyHint
            label={themeShortcut}
            variant='floating'
            className='theme-fab-hotkey'
          />
        </div>
        <section
          id='appearance-hotkeys-panel'
          className={`theme-drawer ${isThemePanelOpen ? 'is-open' : ''}`}
          aria-label='Appearance and hotkeys'
          aria-hidden={!isThemePanelOpen}
          hidden={!isThemePanelOpen}
        >
          <div className='theme-settings control-drawer' role='group' aria-label='Appearance and hotkeys'>
            <div className='control-drawer-tabs' role='tablist' aria-label='Appearance and hotkeys sections'>
              <button
                id='appearance-tab'
                type='button'
                role='tab'
                className={`control-drawer-tab${activeControlTab === CONTROL_TABS.THEME ? ' is-active' : ''}`}
                aria-selected={activeControlTab === CONTROL_TABS.THEME}
                aria-controls='appearance-panel'
                tabIndex={activeControlTab === CONTROL_TABS.THEME ? 0 : -1}
                onClick={() => setActiveControlTab(CONTROL_TABS.THEME)}
              >
                <IconLabel icon={PaletteIcon} className='icon-label-button'>
                  Theme
                </IconLabel>
              </button>
              <button
                id='hotkeys-tab'
                type='button'
                role='tab'
                className={`control-drawer-tab${activeControlTab === CONTROL_TABS.HOTKEYS ? ' is-active' : ''}`}
                aria-selected={activeControlTab === CONTROL_TABS.HOTKEYS}
                aria-controls='hotkeys-panel'
                tabIndex={activeControlTab === CONTROL_TABS.HOTKEYS ? 0 : -1}
                onClick={() => setActiveControlTab(CONTROL_TABS.HOTKEYS)}
              >
                <IconLabel icon={KeyboardIcon} className='icon-label-button'>
                  Hotkeys
                </IconLabel>
              </button>
            </div>

            <div
              id='appearance-panel'
              className='control-drawer-panel'
              role='tabpanel'
              aria-labelledby='appearance-tab'
              hidden={activeControlTab !== CONTROL_TABS.THEME}
            >
              <p className='theme-kicker'>Appearance</p>
              <label className='theme-label' htmlFor='theme-select'>
                Palette
              </label>
              <select
                ref={themeSelectRef}
                id='theme-select'
                className='theme-select'
                value={activeTheme.key}
                onChange={handleThemeChange}
                disabled={Boolean(user) && isLoadingPreferences}
              >
                {THEME_OPTIONS.map((theme) => (
                  <option key={theme.key} value={theme.key}>
                    {theme.name}
                  </option>
                ))}
              </select>
              <p className='theme-vibe'>{activeTheme.vibe}</p>
              <div className='theme-swatches' aria-hidden='true'>
                {activeTheme.colors.map((color) => (
                  <span
                    key={`${activeTheme.key}-${color}`}
                    className='theme-swatch'
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div
              id='hotkeys-panel'
              className='control-drawer-panel'
              role='tabpanel'
              aria-labelledby='hotkeys-tab'
              hidden={activeControlTab !== CONTROL_TABS.HOTKEYS}
            >
              <p className='theme-kicker'>Hotkeys</p>
              <div className='hotkey-reference'>
                {HOTKEY_REFERENCE_GROUPS.map((group) => (
                  <section key={group.id} className='hotkey-group' aria-labelledby={`${group.id}-title`}>
                    <h3 id={`${group.id}-title`} className='hotkey-group-title'>
                      {group.label}
                    </h3>
                    <ul className='hotkey-group-list'>
                      {group.items.map((item) => (
                        <li key={`${group.id}-${item.shortcut}-${item.label}`} className='hotkey-row'>
                          <HotkeyHint
                            label={formatHotkeyLabel(item.shortcut)}
                            variant='reference'
                          />
                          <div className='hotkey-row-copy'>
                            <p className='hotkey-row-label'>{item.label}</p>
                            <p className='hotkey-row-description'>{item.description}</p>
                            {item.note && <p className='hotkey-row-note'>{item.note}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
