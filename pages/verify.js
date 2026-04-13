import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useSupabaseAuth } from 'utils/supabaseAuthContext.js';

const REDIRECT_DELAY_MS = 2000;

export default function VerifyPage() {
  const router = useRouter();
  const { isLoading, user } = useSupabaseAuth();

  useEffect(() => {
    if (isLoading || !user) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void router.replace('/');
    }, REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isLoading, router, user]);

  const redirectSeconds = REDIRECT_DELAY_MS / 1000;

  return (
    <>
      <Head>
        <title>Verify Email | Mental Math Studio</title>
        <meta
          name='description'
          content='Confirm your email for Mental Math Studio and continue into your training account.'
        />
      </Head>

      <div className='verify-shell'>
        <section className='hero-panel verify-hero appear-up'>
          <p className='hero-tag'>Account Access</p>
          <h1>
            {isLoading
              ? 'Checking your link'
              : user
              ? 'Email confirmed'
              : 'Confirm your email'}
          </h1>
          <p>
            {isLoading
              ? 'We are finishing the sign-in step from your verification email.'
              : user
              ? 'Your account is ready. We signed you in and will move you into the trainer in a moment.'
              : 'Open the confirmation link from your inbox. When it lands here, the site will sign you in automatically.'}
          </p>
        </section>

        <section className='panel paper-panel auth-panel verify-panel appear-up'>
          <div
            className={`verify-status${
              isLoading ? ' is-pending' : user ? ' is-success' : ' is-idle'
            }`}
            aria-live='polite'
          >
            <p className='verify-status-kicker'>Current status</p>
            {isLoading ? (
              <>
                <p className='verify-status-copy'>
                  Checking your verification link and restoring your session if it is
                  available.
                </p>
                <p className='verify-status-note'>This usually takes a moment.</p>
              </>
            ) : user ? (
              <>
                <p className='verify-status-copy'>
                  You are verified and already signed in.
                </p>
                {user.email && <p className='verify-user-pill'>{user.email}</p>}
                <p className='verify-status-note'>
                  Redirecting to the trainer in {redirectSeconds} seconds.
                </p>
              </>
            ) : (
              <>
                <p className='verify-status-copy'>
                  No verified session is active yet.
                </p>
                <p className='verify-status-note'>
                  Use the email link to return here. If you already confirmed your
                  account, you can log in now.
                </p>
              </>
            )}
          </div>

          {user ? (
            <>
              <div className='inline-actions verify-actions'>
                <Link href='/' className='button button-strong'>
                  Enter trainer
                </Link>
                <Link href='/stats' className='button button-quiet'>
                  View progress
                </Link>
              </div>
              <p className='auth-helper verify-helper'>
                Prefer not to wait? Open the trainer now.
              </p>
            </>
          ) : !isLoading ? (
            <>
              <div className='inline-actions verify-actions'>
                <Link href='/login' className='button button-strong'>
                  Log in
                </Link>
                <Link href='/signup' className='button button-quiet'>
                  Create account
                </Link>
              </div>
              <p className='auth-helper verify-helper'>
                The confirmation link always returns to this page first.
              </p>
            </>
          ) : null}
        </section>
      </div>
    </>
  );
}
