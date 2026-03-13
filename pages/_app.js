import Head from 'next/head';
import SiteLayout from 'components/SiteLayout';
import { SupabaseAuthProvider } from 'utils/supabaseAuthContext';
import 'styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link
          rel='apple-touch-icon'
          sizes='180x180'
          href='/apple-touch-icon.png'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='32x32'
          href='/favicon-32x32.png'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='16x16'
          href='/favicon-16x16.png'
        />
        <link rel='manifest' href='/manifest.webmanifest' />
        <link rel='mask-icon' href='/safari-pinned-tab.svg' color='#f0622f' />
        <meta name='msapplication-TileColor' content='#12141c' />
        <meta name='theme-color' content='#12141c' />
      </Head>
      <SupabaseAuthProvider>
        <SiteLayout>
          <Component {...pageProps} />
        </SiteLayout>
      </SupabaseAuthProvider>
    </>
  );
}
