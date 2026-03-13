import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSupabaseAuth } from 'utils/supabaseAuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { client, user, isConfigured } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!client) {
      setErrorMessage('Supabase is not configured.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Use at least 8 characters for the password.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo:
          typeof window === 'undefined' ? undefined : window.location.origin
      }
    });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data.session) {
      await router.push('/');
      return;
    }

    setSuccessMessage(
      'Account created. Confirm your email if required, then log in.'
    );
  };

  return (
    <>
      <Head>
        <title>Sign Up | Mental Math Studio</title>
        <meta
          name='description'
          content='Create your account for Mental Math Studio with Supabase authentication.'
        />
      </Head>
      <section className='hero-panel appear-up'>
        <p className='hero-tag'>Create Account</p>
        <h1>Sign Up</h1>
        <p>Store every round in Supabase and build a long-term progress history.</p>
      </section>

      <section className='panel paper-panel auth-panel appear-up'>
        {!isConfigured && (
          <p className='inline-warning'>
            Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> before using auth.
          </p>
        )}
        <form className='auth-form' onSubmit={handleSubmit}>
          <label htmlFor='signup-email'>Email</label>
          <input
            id='signup-email'
            type='email'
            autoComplete='email'
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label htmlFor='signup-password'>Password</label>
          <input
            id='signup-password'
            type='password'
            autoComplete='new-password'
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <label htmlFor='signup-confirm-password'>Confirm password</label>
          <input
            id='signup-confirm-password'
            type='password'
            autoComplete='new-password'
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          <button type='submit' className='button button-strong button-full' disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        {errorMessage && <p className='feedback warning'>{errorMessage}</p>}
        {successMessage && <p className='feedback success'>{successMessage}</p>}
        <p className='auth-helper'>
          Already have an account?{' '}
          <Link href='/login' className='text-link'>
            Log in
          </Link>
        </p>
      </section>
    </>
  );
}
