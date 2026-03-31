import Head from 'next/head';
import SiteLayout from 'components/SiteLayout';
import { AccountPreferencesProvider } from 'utils/accountPreferencesContext';
import { ActiveSessionProvider } from 'utils/activeSessionContext';
import { SupabaseAuthProvider } from 'utils/supabaseAuthContext';
import 'styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='icon' type='image/svg+xml' href='/icon.svg' />
        <link rel='shortcut icon' href='/icon.svg' />
        <link rel='manifest' href='/manifest.webmanifest' />
        <link rel='mask-icon' href='/safari-pinned-tab.svg' color='#f0622f' />
        <meta name='msapplication-TileColor' content='#12141c' />
        <meta name='theme-color' content='#12141c' />
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
