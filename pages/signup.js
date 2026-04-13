import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { useSupabaseAuth } from 'utils/supabaseAuthContext.js';
import {
  calculateStrength,
  getPasswordRuleIndicator,
  isPasswordValid,
  validatePassword
} from 'utils/passwordValidation.js';

const PASSWORD_RULES = [
  { key: 'uppercase', label: 'Contains an uppercase letter' },
  { key: 'lowercase', label: 'Contains a lowercase letter' },
  { key: 'number', label: 'Contains a number' },
  { key: 'special', label: 'Contains a special character' },
  { key: 'minLength', label: 'Has at least 8 characters' }
];

function isDuplicateSignUpResponse({ data, error }) {
  const duplicateErrorPattern = /already\s*(registered|exists)|already\s*been\s*registered/i;
  const hasDuplicateError = Boolean(error?.message && duplicateErrorPattern.test(error.message));

  const identities = data?.user?.identities;
  const hasDuplicateIdentityPattern =
    !error &&
    !data?.session &&
    Boolean(data?.user?.email) &&
    Array.isArray(identities) &&
    identities.length === 0;

  return hasDuplicateError || hasDuplicateIdentityPattern;
}

export default function SignupPage() {
  const router = useRouter();
  const { client, user, isConfigured } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [duplicateEmail, setDuplicateEmail] = useState('');

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const strength = useMemo(
    () => calculateStrength(passwordValidation),
    [passwordValidation]
  );
  const passwordIsValid = isPasswordValid(passwordValidation);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit =
    Boolean(email.trim()) && passwordIsValid && passwordsMatch && !isSubmitting && isConfigured;

  const loginHref = `/login?email=${encodeURIComponent(duplicateEmail || email.trim())}`;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!client) {
      setErrorMessage('Account services are not configured.');
      return;
    }

    if (!passwordIsValid) {
      setErrorMessage('Password does not meet all required rules yet.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setDuplicateEmail('');

    const response = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo:
          typeof window === 'undefined' ? undefined : `${window.location.origin}/verify`
      }
    });

    setIsSubmitting(false);

    if (isDuplicateSignUpResponse(response)) {
      setDuplicateEmail(email.trim());
      setErrorMessage('');
      setSuccessMessage('This email is already registered. Do you want to log in instead?');
      return;
    }

    if (response.error) {
      setErrorMessage(response.error.message);
      return;
    }

    if (response.data.session) {
      await router.push('/');
      return;
    }

    setSuccessMessage(
      'Account created. Check your inbox to confirm your email. The link will bring you back to the verification page and sign you in automatically.'
    );
  };

  return (
    <>
      <Head>
        <title>Sign Up | Mental Math Studio</title>
        <meta
          name='description'
          content='Create your account for Mental Math Studio and keep your training history.'
        />
      </Head>
      <section className='hero-panel appear-up'>
        <p className='hero-tag'>Create Account</p>
        <h1>Sign Up</h1>
        <p>Save your rounds, build consistency, and keep your long-term progress history.</p>
      </section>

      <section className='panel paper-panel auth-panel appear-up'>
        {!isConfigured && (
          <p className='inline-warning'>
            Account features are not configured yet, so sign-up is unavailable right
            now.
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
            onChange={(event) => {
              setEmail(event.target.value);
              setDuplicateEmail('');
              setErrorMessage('');
              setSuccessMessage('');
            }}
          />

          <label htmlFor='signup-password'>Password</label>
          <div className='password-field'>
            <input
              id='signup-password'
              type={showPassword ? 'text' : 'password'}
              autoComplete='new-password'
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrorMessage('');
                setSuccessMessage('');
              }}
              aria-describedby='password-guidance'
            />
            <button
              type='button'
              className='password-toggle'
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <div id='password-guidance' className='password-guidance' aria-live='polite'>
            <div className='strength-row'>
              <span>Password strength: {strength.label}</span>
              <span>
                {strength.score}/{strength.maxScore}
              </span>
            </div>
            <div className='strength-track' aria-hidden='true'>
              {Array.from({ length: strength.maxScore }, (_unused, index) => {
                const isPassed = index < strength.score;
                return (
                  <span key={index} className={isPassed ? 'is-pass' : ''} />
                );
              })}
            </div>
            <ul className='password-rules'>
              {PASSWORD_RULES.map((rule) => {
                const isPassed = passwordValidation[rule.key];
                return (
                  <li key={rule.key} className={isPassed ? 'is-pass' : ''}>
                    <span aria-hidden='true'>{getPasswordRuleIndicator(isPassed)}</span>
                    <span>{rule.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <label htmlFor='signup-confirm-password'>Confirm password</label>
          <div className='password-field'>
            <input
              id='signup-confirm-password'
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete='new-password'
              required
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setErrorMessage('');
                setSuccessMessage('');
              }}
              aria-describedby='confirm-password-note'
            />
            <button
              type='button'
              className='password-toggle'
              onClick={() => setShowConfirmPassword((current) => !current)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <p id='confirm-password-note' className={`confirm-note ${passwordsMatch ? 'is-pass' : ''}`}>
            {confirmPassword.length === 0
              ? 'Confirm your password.'
              : passwordsMatch
              ? 'Passwords match.'
              : 'Passwords do not match yet.'}
          </p>

          <button type='submit' className='button button-strong button-full' disabled={!canSubmit}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        {errorMessage && <p className='feedback warning'>{errorMessage}</p>}
        {successMessage && <p className='feedback success'>{successMessage}</p>}

        {duplicateEmail && (
          <div className='inline-actions'>
            <Link href={loginHref} className='button button-quiet'>
              Log in with this email
            </Link>
          </div>
        )}

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
