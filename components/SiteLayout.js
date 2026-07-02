import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HotkeyHint from 'components/HotkeyHint.js';
import IconLabel from 'components/IconLabel.js';
import ChartLineUpIcon from 'images/phosphor/chart-line-up.svg';
import CommandIcon from 'images/phosphor/command-bold.svg';
import HouseIcon from 'images/phosphor/house.svg';
import SquaresFourIcon from 'images/phosphor/squares-four.svg';
import XIcon from 'images/phosphor/x-bold.svg';
import { useAccountPreferences } from 'utils/accountPreferencesContext.js';
import { useActiveSession } from 'utils/activeSessionContext.js';
import {
  GLOBAL_HOTKEY_ACTIONS,
  HOTKEY_REFERENCE_GROUPS,
  formatHotkeyLabel,
  getGlobalHotkeyAction,
  getGlobalHotkeyLabel,
  getNextThemeKey,
  isShortcutEventEligible
} from 'utils/hotkeys.js';
import { useSupabaseAuth } from 'utils/supabaseAuthContext.js';
import { getThemeByKey, getThemeOptionLabel, THEME_OPTIONS } from 'utils/themes.js';

export default function SiteLayout({ children }) {
  const router = useRouter();
  const { user, isConfigured, signOut } = useSupabaseAuth();
  const { terminateActiveSession } = useActiveSession();
  const { themeKey, isLoadingPreferences, upsertPreferences } =
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
          !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true'
      );
    };

    const onKeyDown = (event) => {
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
    const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
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
  const themeChromeColor = activeTheme.tokens.ink900;
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
      '--hero-decor-stroke': activeTheme.tokens.heroDecorStroke,
      '--hero-decor-fill': activeTheme.tokens.heroDecorFill,
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
      closeUtilityDrawer();
      await router.push('/login');
    }
  }, [closeUtilityDrawer, router, signOut, terminateActiveSession]);

  const handleThemeChange = (event) => {
    void upsertPreferences({ themeKey: event.target.value });
  };

  const cycleTheme = useCallback(() => {
    if (user && isLoadingPreferences) {
      return;
    }

    void upsertPreferences({
      themeKey: getNextThemeKey(activeTheme.key, THEME_OPTIONS)
    });
  }, [activeTheme.key, isLoadingPreferences, upsertPreferences, user]);

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

  return (
    <div className='app-shell' data-theme-key={activeTheme.key} style={themeStyle}>
      <Head>
        <meta name='theme-color' content={themeChromeColor} key='theme-color' />
        <meta
          name='msapplication-TileColor'
          content={themeChromeColor}
          key='msapplication-TileColor'
        />
      </Head>
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
                  className={`site-nav-link ${isActive ? 'is-active' : ''}`.trim()}
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
            {!isConfigured && <span className='status-badge'>Sync offline</span>}
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
                  isUtilityDrawerOpen ? 'Close utility drawer' : 'Open utility drawer'
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
          <section
            ref={utilityDrawerRef}
            id='utility-drawer'
            className='utility-drawer-shell utility-drawer appear-up'
            role='dialog'
            aria-modal='true'
            aria-labelledby='utility-drawer-title'
            aria-label='Utility drawer'
          >
            <div className='utility-panel'>
              <div className='utility-header'>
                <div>
                  <p className='theme-kicker'>Command Desk</p>
                  <h2 id='utility-drawer-title' className='utility-title'>
                    Navigation, appearance, hotkeys
                  </h2>
                  <p className='theme-vibe'>
                    Keep the practice surface clean while the controls stay close.
                  </p>
                </div>
                <button
                  ref={utilityCloseButtonRef}
                  type='button'
                  className='control-drawer-close'
                  onClick={closeUtilityDrawer}
                  aria-label='Close utility drawer'
                >
                  <XIcon className='control-drawer-close-icon' />
                </button>
              </div>

              <section className='utility-section utility-section-nav'>
                <div className='utility-section-head'>
                  <p className='theme-kicker'>Navigate</p>
                </div>
                <div className='utility-link-list'>
                  {navLinks.map((link) => {
                    const isActive = router.pathname === link.href;

                    return (
                      <Link
                        key={`utility-${link.href}`}
                        href={link.href}
                        className={`site-nav-link utility-nav-link ${isActive ? 'is-active' : ''}`.trim()}
                        aria-keyshortcuts={link.hotkey}
                        onClick={closeUtilityDrawer}
                      >
                        <span className='utility-link-main'>
                          <IconLabel icon={link.icon} className='icon-label-nav'>
                            {link.label}
                          </IconLabel>
                        </span>
                        <HotkeyHint label={link.hotkey} />
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section className='utility-section utility-section-account'>
                <div className='utility-section-head'>
                  <p className='theme-kicker'>Account</p>
                </div>
                {user ? (
                  <div className='utility-account-card'>
                    <p className='user-pill utility-user-pill'>{user.email}</p>
                    <button
                      type='button'
                      className='button button-quiet button-full'
                      onClick={handleSignOut}
                      aria-keyshortcuts={logoutShortcut}
                    >
                      Log out
                    </button>
                  </div>
                ) : (
                  <div className='utility-account-actions'>
                    <Link
                      href='/login'
                      className='button button-quiet button-full'
                      aria-keyshortcuts={loginShortcut}
                      onClick={closeUtilityDrawer}
                    >
                      Log in
                    </Link>
                    <Link
                      href='/signup'
                      className='button button-strong button-full'
                      aria-keyshortcuts={signupShortcut}
                      onClick={closeUtilityDrawer}
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </section>

              <section className='utility-section'>
                <div className='utility-section-head'>
                  <p className='theme-kicker'>Appearance</p>
                  <HotkeyHint label={themeShortcut} />
                </div>
                <label className='theme-label' htmlFor='theme-select'>
                  Palette
                </label>
                <select
                  id='theme-select'
                  className='theme-select'
                  value={activeTheme.key}
                  onChange={handleThemeChange}
                  disabled={Boolean(user) && isLoadingPreferences}
                >
                  {THEME_OPTIONS.map((theme) => (
                    <option key={theme.key} value={theme.key}>
                      {getThemeOptionLabel(theme)}
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
              </section>

              <section className='utility-section'>
                <div className='utility-section-head'>
                  <p className='theme-kicker'>Hotkeys</p>
                </div>
                <div className='hotkey-reference'>
                  {HOTKEY_REFERENCE_GROUPS.map((group) => (
                    <section
                      key={group.id}
                      className='hotkey-group'
                      aria-labelledby={`${group.id}-title`}
                    >
                      <h3 id={`${group.id}-title`} className='hotkey-group-title'>
                        {group.label}
                      </h3>
                      <ul className='hotkey-group-list'>
                        {group.items.map((item) => (
                          <li
                            key={`${group.id}-${item.shortcut}-${item.label}`}
                            className='hotkey-row'
                          >
                            <HotkeyHint label={formatHotkeyLabel(item.shortcut)} />
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
              </section>
            </div>
          </section>
        </>
      )}

      <main className='site-main'>{children}</main>

      <footer className='site-footer'>
        <p>
          Built for focused repetition, measurable progress, and ruthless consistency.
        </p>
      </footer>
    </div>
  );
}
