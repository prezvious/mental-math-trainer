import Head from 'next/head';
import { useEffect, useMemo } from 'react';
import { useAccountPreferences } from 'utils/accountPreferencesContext.js';
import { getThemeByKey } from 'utils/themes.js';
import { useResolvedDisplayMode } from 'utils/useResolvedDisplayMode.js';

function NotFoundPage() {
  const { themeKey, displayMode } = useAccountPreferences();
  const resolvedDisplayMode = useResolvedDisplayMode(displayMode);
  const activeTheme = useMemo(() => getThemeByKey(themeKey), [themeKey]);
  const tokens = activeTheme.tokensByMode[resolvedDisplayMode];
  const pageStyle = useMemo(
    () => ({
      colorScheme: tokens.colorScheme,
      '--not-found-background': tokens.paper,
      '--not-found-background-alt': tokens.paperStrong,
      '--not-found-text': tokens.textMain,
      '--not-found-accent': tokens.textAccent,
      '--not-found-border': tokens.controlBorder
    }),
    [tokens]
  );

  useEffect(() => {
    document.documentElement.style.colorScheme = resolvedDisplayMode;
    document.documentElement.style.backgroundColor = tokens.paper;
    return () => {
      document.documentElement.style.removeProperty('color-scheme');
      document.documentElement.style.removeProperty('background-color');
    };
  }, [resolvedDisplayMode, tokens.paper]);

  return (
    <>
      <Head>
        <title>PAGES NOT FOUND | Mental Math Studio</title>
        <meta
          name='description'
          content='The requested Mental Math Studio page does not exist.'
        />
        <meta name='theme-color' content={tokens.paper} key='theme-color' />
      </Head>

      <main
        className='not-found-page'
        data-theme-key={activeTheme.key}
        data-display-mode={displayMode}
        data-resolved-mode={resolvedDisplayMode}
        style={pageStyle}
        aria-labelledby='not-found-title'
      >
        <div className='not-found-code' aria-hidden='true'>
          404
        </div>
        <h1 id='not-found-title' className='not-found-title'>
          PAGES NOT FOUND
        </h1>
      </main>
    </>
  );
}

NotFoundPage.useSiteLayout = false;

export default NotFoundPage;
