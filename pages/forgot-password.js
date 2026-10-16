import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import PageIntro from 'components/PageIntro.js';
import { useSupabaseAuth } from 'utils/supabaseAuthContext.js';

export default function ForgotPasswordPage() {
  const { client, isConfigured } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!client || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      setErrorMessage(error?.status === 429
        ? 'Too many requests. Wait a little and try again.'
        : 'Could not send the reset link right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head><title>Reset password | Mental Math Studio</title></Head>
      <div className='auth-shell'>
        <PageIntro title='Reset password' description='Request a secure link by email.' />
        <section className='panel paper-panel auth-panel appear-up'>
          {!isConfigured && <p className='inline-warning'>Accounts are unavailable right now. You can still practice as a guest.</p>}
          {sent ? (
            <p className='feedback success' role='status'>If an account exists for that email, a password-reset link is on its way. Check your inbox and spam folder.</p>
          ) : (
            <form className='auth-form' onSubmit={handleSubmit}>
              <label htmlFor='recovery-email'>Email</label>
              <input id='recovery-email' type='email' autoComplete='email' required value={email}
                onChange={(event) => setEmail(event.target.value)} disabled={!isConfigured || isSubmitting} />
              <button type='submit' className='button button-strong button-full' disabled={!isConfigured || isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
          {errorMessage && <p className='feedback warning' role='alert'>{errorMessage}</p>}
          <p className='auth-helper'><Link href='/login' className='text-link'>Back to login</Link></p>
          {!isConfigured && <Link href='/' className='text-link'>Practice as a guest</Link>}
        </section>
      </div>
    </>
  );
}
