import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSupabaseAuth } from 'utils/supabaseAuthContext.js';

export default function LoginPage() {
  const router = useRouter();
  const { client, user, isConfigured } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const suggestedEmail =
    typeof router.query.email === 'string' ? router.query.email : '';

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [router, user]);

  useEffect(() => {
    if (!suggestedEmail) {
      return;
    }

    setEmail((currentEmail) => currentEmail || suggestedEmail);
  }, [suggestedEmail]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!client) {
      setErrorMessage('Account services are not configured.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    const { error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await router.push('/');
  };

  return (
    <>
      <Head>
        <title>Log In | Mental Math Studio</title>
        <meta
          name='description'
          content='Log in to Mental Math Studio and continue your saved training.'
        />
      </Head>

      <div className='auth-shell'>
        <section className='hero-panel hero-panel-compact auth-hero appear-up'>
          <div className='hero-layout'>
            <div className='hero-copy'>
              <p className='hero-tag'>Account Access</p>
              <h1>Log In</h1>
              <p>Rejoin your saved training desk and pick up the next round quickly.</p>
            </div>
            <div className='hero-sidebar'>
              <p className='hero-sidebar-label'>Why sign in</p>
              <ul className='hero-checklist'>
                <li>Restore your preferred theme and trainer setup.</li>
                <li>Keep your round history and progress snapshots.</li>
                <li>Move from practice straight into analytics.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className='panel paper-panel auth-panel appear-up'>
          <p className='panel-kicker'>Welcome back</p>
          <h2>Continue your streak</h2>
          <p className='panel-copy'>
            Use the same email you used for sign-up. The next round is waiting on the main trainer.
          </p>

          {suggestedEmail && (
            <p className='inline-warning'>
              This email is already registered. Enter your password to log in.
            </p>
          )}

          {!isConfigured && (
            <p className='inline-warning'>
              Account features are not configured yet, so login is unavailable right now.
            </p>
          )}

          <form className='auth-form' onSubmit={handleSubmit}>
            <label htmlFor='login-email'>Email</label>
            <input
              id='login-email'
              type='email'
              autoComplete='email'
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <label htmlFor='login-password'>Password</label>
            <input
              id='login-password'
              type='password'
              autoComplete='current-password'
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <button
              type='submit'
              className='button button-strong button-full'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          {errorMessage && <p className='feedback warning'>{errorMessage}</p>}

          <p className='auth-helper'>
            Need an account?{' '}
            <Link href='/signup' className='text-link'>
              Sign up
            </Link>
          </p>
        </section>
      </div>
    </>
  );
}
