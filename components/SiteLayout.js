import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import IconLabel from 'components/IconLabel.js';
import ChartLineUpIcon from 'images/phosphor/chart-line-up.svg';
import HouseIcon from 'images/phosphor/house.svg';
import SlidersHorizontalIcon from 'images/phosphor/sliders-horizontal.svg';
import SquaresFourIcon from 'images/phosphor/squares-four.svg';
import { useAccountPreferences } from 'utils/accountPreferencesContext.js';
import { useActiveSession } from 'utils/activeSessionContext.js';
import {
  GLOBAL_HOTKEY_ACTIONS,
  GLOBAL_HOTKEY_KEYS,
  getGlobalHotkeyAction,
  getNextThemeKey,
  isShortcutEventEligible
} from 'utils/hotkeys.js';
import { useSupabaseAuth } from 'utils/supabaseAuthContext.js';
import {
  getThemeByKey,
  THEME_OPTIONS
} from 'utils/themes.js';

export default function SiteLayout({ children }) {
  const router = useRouter();
  const { user, isConfigured, signOut } = useSupabaseAuth();
  const { terminateActiveSession } = useActiveSession();
  const { themeKey, isLoadingPreferences, upsertPreferences } =
    useAccountPreferences();
  const [isThemePanelOpen, setIsThemePanelOpen] = useState(false);
  const themeButtonRef = useRef(null);
  const themeSelectRef = useRef(null);
  const wasThemePanelOpenRef = useRef(false);

  useEffect(() => {
    const closeThemePanel = () => setIsThemePanelOpen(false);
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
      themeSelectRef.current?.focus();
      return;
    }

    if (wasThemePanelOpenRef.current) {
      themeButtonRef.current?.focus();
      wasThemePanelOpenRef.current = false;
    }
  }, [isThemePanelOpen]);

  const activeTheme = useMemo(() => getThemeByKey(themeKey), [themeKey]);

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
      hotkey: GLOBAL_HOTKEY_KEYS[GLOBAL_HOTKEY_ACTIONS.TRAINER].toUpperCase()
    },
    {
      href: '/mixed',
      label: 'Mixed',
      icon: SquaresFourIcon,
      hotkey: GLOBAL_HOTKEY_KEYS[GLOBAL_HOTKEY_ACTIONS.MIXED].toUpperCase()
    },
    {
      href: '/stats',
      label: 'Progress',
      icon: ChartLineUpIcon,
      hotkey: GLOBAL_HOTKEY_KEYS[GLOBAL_HOTKEY_ACTIONS.PROGRESS].toUpperCase()
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
                  aria-keyshortcuts={GLOBAL_HOTKEY_KEYS[GLOBAL_HOTKEY_ACTIONS.LOGOUT].toUpperCase()}
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className='site-auth-links'>
                <Link
                  href='/login'
                  className='button button-quiet'
                  aria-keyshortcuts={GLOBAL_HOTKEY_KEYS[GLOBAL_HOTKEY_ACTIONS.LOGIN].toUpperCase()}
                >
                  Log in
                </Link>
                <Link
                  href='/signup'
                  className='button button-strong'
                  aria-keyshortcuts={GLOBAL_HOTKEY_KEYS[GLOBAL_HOTKEY_ACTIONS.SIGNUP].toUpperCase()}
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
        <button
          ref={themeButtonRef}
          type='button'
          className='theme-fab'
          onClick={() => setIsThemePanelOpen((isOpen) => !isOpen)}
          aria-label='Open theme settings'
          aria-expanded={isThemePanelOpen}
          aria-controls='theme-settings-panel'
          aria-keyshortcuts={GLOBAL_HOTKEY_KEYS[GLOBAL_HOTKEY_ACTIONS.THEME].toUpperCase()}
        >
          <SlidersHorizontalIcon className='theme-fab-icon' />
        </button>
        <section
          id='theme-settings-panel'
          className={`theme-drawer ${isThemePanelOpen ? 'is-open' : ''}`}
          aria-label='Theme settings'
          aria-hidden={!isThemePanelOpen}
          hidden={!isThemePanelOpen}
        >
          <div className='theme-settings' role='group' aria-label='Theme settings'>
            <p className='theme-kicker'>Theme</p>
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
        </section>
      </div>
    </div>
  );
}
