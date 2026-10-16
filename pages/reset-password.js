import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import PageIntro from 'components/PageIntro.js';
import { isPasswordValid, validatePassword } from 'utils/passwordValidation.js';
import { useSupabaseAuth } from 'utils/supabaseAuthContext.js';

export default function ResetPasswordPage() {
  const { client, user, isConfigured, isLoading, isRecoverySession, clearRecoverySession } = useSupabaseAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const validation = useMemo(() => validatePassword(password), [password]);
  const isReady = isPasswordValid(validation) && password === confirmPassword;
  const canReset = Boolean(client && user && isRecoverySession);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canReset || isSubmitting) return;
    if (!isReady) {
      setErrorMessage('Use a password with at least 8 characters, uppercase, lowercase, a number, and a special character; both entries must match.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setConfirmPassword('');
      clearRecoverySession();
      setIsComplete(true);
    } catch (error) {
      setErrorMessage(error?.message || 'Could not update your password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head><title>Choose a new password | Mental Math Studio</title></Head>
      <div className='auth-shell'>
        <PageIntro title={isComplete ? 'Password updated' : 'Choose a new password'} />
        <section className='panel paper-panel auth-panel appear-up'>
          {isComplete ? (
            <>
              <p className='feedback success' role='status'>Your password has been updated.</p>
              <Link href='/' className='button button-strong'>Continue to Trainer</Link>
            </>
          ) : !isConfigured ? (
            <p className='inline-warning'>Accounts are unavailable right now. Please try again later.</p>
          ) : isLoading ? (
            <p role='status'>Checking your reset link…</p>
          ) : !canReset ? (
            <>
              <p className='inline-warning' role='alert'>This reset link is invalid or has expired.</p>
              <Link href='/forgot-password' className='button button-strong'>Request a new link</Link>
            </>
          ) : (
            <form className='auth-form' onSubmit={handleSubmit}>
              <p className='panel-copy'>Use at least 8 characters with uppercase, lowercase, a number, and a special character.</p>
              <label htmlFor='reset-password'>New password</label>
              <input id='reset-password' type='password' autoComplete='new-password' required
                value={password} onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting} aria-invalid={Boolean(password && !isPasswordValid(validation))} />
              <label htmlFor='reset-confirm'>Confirm password</label>
              <input id='reset-confirm' type='password' autoComplete='new-password' required
                value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isSubmitting} aria-invalid={Boolean(confirmPassword && password !== confirmPassword)} />
              <button type='submit' className='button button-strong button-full' disabled={isSubmitting}>
                {isSubmitting ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
          {errorMessage && <p className='feedback warning' role='alert'>{errorMessage}</p>}
        </section>
      </div>
    </>
  );
}
