import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import PageIntro from 'components/PageIntro.js';
import {
  AUTH_LOGIN_HANDOFF_REASONS,
  consumeAuthLoginHandoff
} from 'utils/authLoginHandoff.js';
import { useSupabaseAuth } from 'utils/supabaseAuthContext.js';

export default function LoginPage() {
  const router = useRouter();
  const { client, user, isConfigured } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loginHandoffReason, setLoginHandoffReason] = useState('');
  const isLoginUnavailable = !isConfigured;

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [router, user]);

  useEffect(() => {
    const loginHandoff = consumeAuthLoginHandoff();
    if (!loginHandoff) {
      return;
    }

    setLoginHandoffReason(loginHandoff.reason);
    setEmail((currentEmail) => currentEmail || loginHandoff.email);
  }, []);

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
        <PageIntro title='Log in' description='Continue with your account.' />

        <section className='panel paper-panel auth-panel appear-up'>
          {loginHandoffReason === AUTH_LOGIN_HANDOFF_REASONS.DUPLICATE_SIGNUP && (
            <p className='inline-warning'>
              This email is already registered. Enter your password to log in.
            </p>
          )}

          {!isConfigured && (
            <p className='inline-warning'>
              Accounts are unavailable right now. You can still practice as a guest.
            </p>
          )}

          <form className='auth-form' onSubmit={handleSubmit}>
            <label htmlFor='login-email'>Email</label>
            <input
              id='login-email'
              type='email'
              autoComplete='email'
              required
              disabled={isSubmitting || isLoginUnavailable}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <label htmlFor='login-password'>Password</label>
            <Link href='/forgot-password' className='text-link auth-recovery-link'>Forgot password?</Link>
            <input
              id='login-password'
              type='password'
              autoComplete='current-password'
              required
              disabled={isSubmitting || isLoginUnavailable}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <button
              type='submit'
              className='button button-strong button-full'
              disabled={isSubmitting || isLoginUnavailable}
            >
              {isLoginUnavailable
                ? 'Log in unavailable'
                : isSubmitting
                ? 'Logging in...'
                : 'Log in'}
            </button>
          </form>

          {errorMessage && <p className='feedback warning' role='alert'>{errorMessage}</p>}

          <p className='auth-helper'>
            Need an account?{' '}
            <Link href='/signup' className='text-link'>
              Sign up
            </Link>
          </p>
          {!isConfigured && <Link href='/' className='text-link'>Practice as a guest</Link>}
        </section>
      </div>
    </>
  );
}
