import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

const ERROR_MESSAGES = {
  invalid_credentials: 'The credentials were rejected. Try again.',
  access_denied: 'Access was denied by the authentication provider.',
  unknown: 'An authentication issue occurred. Please retry.'
};

export default function AuthErrorPage() {
  const { query } = useRouter();
  const code = typeof query.error === 'string' ? query.error : 'unknown';
  const message = ERROR_MESSAGES[code] || ERROR_MESSAGES.unknown;

  return (
    <>
      <Head>
        <title>Authentication Error | Mental Math Studio</title>
        <meta name='description' content='Authentication error details for Mental Math Studio.' />
      </Head>

      <section className='hero-panel appear-up'>
        <p className='hero-tag'>Authentication</p>
        <h1>We Could Not Sign You In</h1>
        <p>{message}</p>
      </section>

      <section className='panel paper-panel appear-up'>
        <h2>Try Again</h2>
        <p>Return to login or create a fresh account.</p>
        <div className='inline-actions'>
          <Link href='/login' className='button button-strong'>
            Log in
          </Link>
          <Link href='/signup' className='button button-quiet'>
            Sign up
          </Link>
        </div>
      </section>
    </>
  );
}
