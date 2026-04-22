import Head from 'next/head';
import SiteLayout from 'components/SiteLayout.js';
import { AccountPreferencesProvider } from 'utils/accountPreferencesContext.js';
import { ActiveSessionProvider } from 'utils/activeSessionContext.js';
import { SupabaseAuthProvider } from 'utils/supabaseAuthContext.js';
import 'styles/globals.css';
import 'styles/redesign.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='icon' type='image/svg+xml' href='/icon.svg' />
        <link rel='shortcut icon' href='/icon.svg' />
        <link rel='manifest' href='/manifest.webmanifest' />
        <link rel='mask-icon' href='/safari-pinned-tab.svg' color='#f0622f' />
      </Head>
      <SupabaseAuthProvider>
        <ActiveSessionProvider>
          <AccountPreferencesProvider>
            <SiteLayout>
              <Component {...pageProps} />
            </SiteLayout>
          </AccountPreferencesProvider>
        </ActiveSessionProvider>
      </SupabaseAuthProvider>
    </>
  );
}
