import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import SettingsIcon from 'images/settings.svg';
import { useSupabaseAuth } from 'utils/supabaseAuthContext';
import {
  DEFAULT_THEME_KEY,
  getThemeByKey,
  THEME_OPTIONS
} from 'utils/themes';

const THEME_STORAGE_KEY = 'mathtrainer-theme-key';

export default function SiteLayout({ children }) {
  const router = useRouter();
  const { user, isConfigured, signOut } = useSupabaseAuth();
  const [themeKey, setThemeKey] = useState(DEFAULT_THEME_KEY);
  const [isThemePanelOpen, setIsThemePanelOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedThemeKey = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedThemeKey && THEME_OPTIONS.some((theme) => theme.key === storedThemeKey)) {
      setThemeKey(storedThemeKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, themeKey);
  }, [themeKey]);

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
    { href: '/', label: 'Trainer' },
    { href: '/stats', label: 'Progress' }
  ];

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      await router.push('/login');
    }
  };

  return (
    <div className='app-shell' data-theme-key={activeTheme.key} style={themeStyle}>
      <header className='site-header'>
        <div className='site-header-inner'>
          <Link href='/' className='brand' aria-label='MathTrainer home'>
            <span className='brand-chip'>MathTrainer</span>
            <span className='brand-title'>Mental Math Studio</span>
          </Link>
          <nav className='site-nav' aria-label='Main'>
            {navLinks.map((link) => {
              const isActive = router.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`site-nav-link ${isActive ? 'is-active' : ''}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className='site-actions'>
            {!isConfigured && <span className='status-badge'>Account sync unavailable</span>}
            {user ? (
              <>
                <span className='user-pill'>{user.email}</span>
                <button type='button' className='button button-quiet' onClick={handleSignOut}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href='/login' className='button button-quiet'>
                  Log in
                </Link>
                <Link href='/signup' className='button button-strong'>
                  Sign up
                </Link>
              </>
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
          type='button'
          className='theme-fab'
          onClick={() => setIsThemePanelOpen((isOpen) => !isOpen)}
          aria-label='Open theme settings'
          aria-expanded={isThemePanelOpen}
          aria-controls='theme-settings-panel'
        >
          <SettingsIcon className='theme-fab-icon' />
        </button>
        <section
          id='theme-settings-panel'
          className={`theme-drawer ${isThemePanelOpen ? 'is-open' : ''}`}
          aria-label='Theme settings'
        >
          <div className='theme-settings' role='group' aria-label='Theme settings'>
            <p className='theme-kicker'>Theme</p>
            <label className='theme-label' htmlFor='theme-select'>
              Palette
            </label>
            <select
              id='theme-select'
              className='theme-select'
              value={activeTheme.key}
              onChange={(event) => setThemeKey(event.target.value)}
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
