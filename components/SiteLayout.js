import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CommandDesk from 'components/CommandDesk.js';
import IconLabel from 'components/IconLabel.js';
import ChartLineUpIcon from 'images/phosphor/chart-line-up.svg';
import CommandIcon from 'images/phosphor/command-bold.svg';
import HouseIcon from 'images/phosphor/house.svg';
import SquaresFourIcon from 'images/phosphor/squares-four.svg';
import { useAccountPreferences } from 'utils/accountPreferencesContext.js';
import { useActiveSession } from 'utils/activeSessionContext.js';
import {
  GLOBAL_HOTKEY_ACTIONS,
  getGlobalHotkeyAction,
  getGlobalHotkeyLabel,
  getNextThemeKey,
  isGlobalHotkeyAvailable,
  isShortcutEventEligible
} from 'utils/hotkeys.js';
import { useSupabaseAuth } from 'utils/supabaseAuthContext.js';
import { DEFAULT_DISPLAY_MODE } from 'utils/displayMode.js';
import {
  DEFAULT_THEME_KEY,
  getThemeByKey,
  THEME_OPTIONS
} from 'utils/themes.js';
import { useResolvedDisplayMode } from 'utils/useResolvedDisplayMode.js';

export default function SiteLayout({ children }) {
  const router = useRouter();
  const { user, isConfigured, signOut } = useSupabaseAuth();
  const { terminateActiveSession } = useActiveSession();
  const { themeKey, displayMode, isLoadingPreferences, upsertPreferences } =
    useAccountPreferences();
  const [isUtilityDrawerOpen, setIsUtilityDrawerOpen] = useState(false);
  const utilityButtonRef = useRef(null);
  const utilityCloseButtonRef = useRef(null);
  const utilityDrawerRef = useRef(null);
  const wasUtilityDrawerOpenRef = useRef(false);

  const closeUtilityDrawer = useCallback(() => {
    setIsUtilityDrawerOpen(false);
  }, []);

  useEffect(() => {
    router.events.on('routeChangeStart', closeUtilityDrawer);
    return () => router.events.off('routeChangeStart', closeUtilityDrawer);
  }, [closeUtilityDrawer, router.events]);

  useEffect(() => {
    if (
      !isUtilityDrawerOpen ||
      typeof window === 'undefined' ||
      typeof document === 'undefined'
    ) {
      return undefined;
    }

    const getFocusableUtilityElements = () => {
      if (!utilityDrawerRef.current) {
        return [];
      }

      return Array.from(
        utilityDrawerRef.current.querySelectorAll(
          'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(
        (element) =>
          !element.hasAttribute('hidden') &&
          element.getAttribute('aria-hidden') !== 'true'
      );
    };

    const onKeyDown = (event) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key === 'Escape') {
        closeUtilityDrawer();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableUtilityElements();
      if (!focusableElements.length) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!utilityDrawerRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        firstElement.focus();
        return;
      }

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeUtilityDrawer, isUtilityDrawerOpen]);

  useEffect(() => {
    if (!isUtilityDrawerOpen || typeof window === 'undefined') {
      return undefined;
    }

    const onClickOutside = (event) => {
      if (
        utilityDrawerRef.current &&
        !utilityDrawerRef.current.contains(event.target) &&
        utilityButtonRef.current &&
        !utilityButtonRef.current.contains(event.target)
      ) {
        closeUtilityDrawer();
      }
    };

    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, [closeUtilityDrawer, isUtilityDrawerOpen]);

  useEffect(() => {
    if (!isUtilityDrawerOpen || typeof document === 'undefined') {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscrollBehavior =
      document.body.style.overscrollBehavior;
    const previousDocumentOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [isUtilityDrawerOpen]);

  useEffect(() => {
    if (isUtilityDrawerOpen) {
      wasUtilityDrawerOpenRef.current = true;
      utilityCloseButtonRef.current?.focus();
      return;
    }

    if (wasUtilityDrawerOpenRef.current) {
      utilityButtonRef.current?.focus();
      wasUtilityDrawerOpenRef.current = false;
    }
  }, [isUtilityDrawerOpen]);

  const activeTheme = useMemo(() => getThemeByKey(themeKey), [themeKey]);
  const resolvedDisplayMode = useResolvedDisplayMode(displayMode);
  const activeThemeTokens = activeTheme.tokensByMode[resolvedDisplayMode];
  const themeChromeColor = activeThemeTokens.paper;
  const trainerShortcut = getGlobalHotkeyLabel(GLOBAL_HOTKEY_ACTIONS.TRAINER);
  const mixedShortcut = getGlobalHotkeyLabel(GLOBAL_HOTKEY_ACTIONS.MIXED);
  const progressShortcut = getGlobalHotkeyLabel(GLOBAL_HOTKEY_ACTIONS.PROGRESS);
  const loginShortcut = getGlobalHotkeyLabel(GLOBAL_HOTKEY_ACTIONS.LOGIN);
  const signupShortcut = getGlobalHotkeyLabel(GLOBAL_HOTKEY_ACTIONS.SIGNUP);
  const logoutShortcut = getGlobalHotkeyLabel(GLOBAL_HOTKEY_ACTIONS.LOGOUT);

  const themeStyle = useMemo(
    () => ({
      colorScheme: activeThemeTokens.colorScheme,
      '--ink-900': activeThemeTokens.ink900,
      '--ink-700': activeThemeTokens.ink700,
      '--ink-500': activeThemeTokens.ink500,
      '--paper': activeThemeTokens.paper,
      '--paper-strong': activeThemeTokens.paperStrong,
      '--sand': activeThemeTokens.sand,
      '--accent-main': activeThemeTokens.accentMain,
      '--accent-warm': activeThemeTokens.accentWarm,
      '--accent-soft': activeThemeTokens.accentSoft,
      '--accent-alert': activeThemeTokens.accentAlert,
      '--text-main': activeThemeTokens.textMain,
      '--text-subtle': activeThemeTokens.textSubtle,
      '--text-accent': activeThemeTokens.textAccent,
      '--text-danger': activeThemeTokens.textDanger,
      '--line': activeThemeTokens.line,
      '--control-border': activeThemeTokens.controlBorder,
      '--focus-ring': activeThemeTokens.focusRing,
      '--button-strong-text': activeThemeTokens.buttonStrongText,
      '--button-quiet-text': activeThemeTokens.buttonQuietText,
      '--button-danger-text': activeThemeTokens.buttonDangerText,
      '--surface-raised': activeThemeTokens.surfaceRaised,
      '--surface-raised-strong': activeThemeTokens.surfaceRaisedStrong,
      '--surface-input': activeThemeTokens.surfaceInput,
      '--surface-selected': activeThemeTokens.surfaceSelected,
      '--surface-positive': activeThemeTokens.surfacePositive,
      '--surface-warning': activeThemeTokens.surfaceWarning,
      '--surface-danger': activeThemeTokens.surfaceDanger,
      '--surface-highlight': activeThemeTokens.surfaceHighlight,
      '--surface-shadow': activeThemeTokens.surfaceShadow,
      '--surface-scrim': activeThemeTokens.surfaceScrim,
      '--header-surface': activeThemeTokens.headerSurface,
      '--header-surface-alt': activeThemeTokens.headerSurfaceAlt,
      '--header-text': activeThemeTokens.headerText,
      '--header-text-accent': activeThemeTokens.headerTextAccent,
      '--header-text-subtle': activeThemeTokens.headerTextSubtle,
      '--header-control-surface': activeThemeTokens.headerControlSurface,
      '--header-control-border': activeThemeTokens.headerControlBorder,
      '--header-border': activeThemeTokens.headerBorder,
      '--toggle-thumb': activeThemeTokens.toggleThumb,
      '--hero-decor-stroke': activeThemeTokens.heroDecorStroke,
      '--hero-decor-fill': activeThemeTokens.heroDecorFill,
      '--glow-main': activeThemeTokens.glowMain,
      '--glow-warm': activeThemeTokens.glowWarm,
      '--glow-soft': activeThemeTokens.glowSoft,
      '--glow-line': activeThemeTokens.glowLine,
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
    [activeTheme, activeThemeTokens]
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
      console.error(
        'Failed to persist the active session before sign out.',
        error
      );
    }

    const { error } = await signOut();
    if (!error) {
      closeUtilityDrawer();
      await router.push('/login');
    }
  }, [closeUtilityDrawer, router, signOut, terminateActiveSession]);

  const handleThemeChange = useCallback(
    (nextThemeKey) => upsertPreferences({ themeKey: nextThemeKey }),
    [upsertPreferences]
  );

  const handleDisplayModeChange = useCallback(
    (nextDisplayMode) => upsertPreferences({ displayMode: nextDisplayMode }),
    [upsertPreferences]
  );

  const handleResetAppearance = useCallback(
    () =>
      upsertPreferences({
        themeKey: DEFAULT_THEME_KEY,
        displayMode: DEFAULT_DISPLAY_MODE
      }),
    [upsertPreferences]
  );

  const cycleTheme = useCallback(() => {
    if (isLoadingPreferences) {
      return;
    }

    void upsertPreferences({
      themeKey: getNextThemeKey(activeTheme.key, THEME_OPTIONS)
    });
  }, [activeTheme.key, isLoadingPreferences, upsertPreferences]);

  const handleUtilityDrawerToggle = useCallback(() => {
    setIsUtilityDrawerOpen((currentState) => !currentState);
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
        !isGlobalHotkeyAvailable(action, {
          isAuthenticated: Boolean(user)
        })
      ) {
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
      closeUtilityDrawer();
      void router.push(nextRoute);
    };

    window.addEventListener('keydown', handleGlobalShortcut);
    return () => window.removeEventListener('keydown', handleGlobalShortcut);
  }, [closeUtilityDrawer, cycleTheme, handleSignOut, router, user]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document
      .querySelector("meta[name='theme-color']")
      ?.setAttribute('content', themeChromeColor);
    document
      .querySelector("meta[name='msapplication-TileColor']")
      ?.setAttribute('content', themeChromeColor);
  }, [themeChromeColor]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const documentElement = document.documentElement;
    documentElement.dataset.displayMode = displayMode;
    documentElement.dataset.resolvedMode = resolvedDisplayMode;
    documentElement.style.colorScheme = resolvedDisplayMode;
    documentElement.style.backgroundColor = activeThemeTokens.paper;

    return () => {
      delete documentElement.dataset.displayMode;
      delete documentElement.dataset.resolvedMode;
      documentElement.style.removeProperty('color-scheme');
      documentElement.style.removeProperty('background-color');
    };
  }, [activeThemeTokens.paper, displayMode, resolvedDisplayMode]);

  return (
    <div
      className='app-shell'
      data-theme-key={activeTheme.key}
      data-display-mode={displayMode}
      data-resolved-mode={resolvedDisplayMode}
      style={themeStyle}
    >
      <Head>
        <meta name='theme-color' content={themeChromeColor} key='theme-color' />
        <meta
          name='msapplication-TileColor'
          content={themeChromeColor}
          key='msapplication-TileColor'
        />
      </Head>
      <a className='skip-link' href='#main-content'>
        Skip to content
      </a>
      <header className='site-header'>
        <div className='site-header-inner'>
          <Link href='/' className='brand' aria-label='Mental Math home'>
            <span className='brand-chip'>Studio</span>
            <span className='brand-title'>Mental Math</span>
          </Link>

          <nav className='site-nav' aria-label='Primary'>
            {navLinks.map((link) => {
              const isActive = router.pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`site-nav-link ${
                    isActive ? 'is-active' : ''
                  }`.trim()}
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
            {!isConfigured && (
              <span className='status-badge'>Sync offline</span>
            )}
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

            <div className='site-utility-shell'>
              <button
                ref={utilityButtonRef}
                type='button'
                className='site-utility-toggle'
                onClick={handleUtilityDrawerToggle}
                aria-label={
                  isUtilityDrawerOpen
                    ? 'Close utility drawer'
                    : 'Open utility drawer'
                }
                aria-expanded={isUtilityDrawerOpen}
                aria-controls='utility-drawer'
                aria-haspopup='dialog'
              >
                <IconLabel icon={CommandIcon} className='icon-label-button'>
                  Utility
                </IconLabel>
              </button>
            </div>
          </div>
        </div>
      </header>

      {isUtilityDrawerOpen && (
        <>
          <button
            type='button'
            className='utility-backdrop'
            aria-hidden='true'
            tabIndex={-1}
            onClick={closeUtilityDrawer}
          />
          <CommandDesk
            activeTheme={activeTheme}
            closeButtonRef={utilityCloseButtonRef}
            displayMode={displayMode}
            drawerRef={utilityDrawerRef}
            isLoadingPreferences={isLoadingPreferences}
            onClose={closeUtilityDrawer}
            onDisplayModeChange={handleDisplayModeChange}
            onResetAppearance={handleResetAppearance}
            onThemeChange={handleThemeChange}
          />
        </>
      )}

      <main id='main-content' className='site-main'>
        {children}
      </main>

      <footer className='site-footer'>
        <p>
          Built for focused repetition, measurable progress, and ruthless
          consistency.
        </p>
      </footer>
    </div>
  );
}
