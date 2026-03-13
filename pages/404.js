import Head from 'next/head';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Page Not Found | Mental Math Studio</title>
        <meta name='description' content='The requested page does not exist.' />
      </Head>

      <section className='hero-panel appear-up'>
        <p className='hero-tag'>404</p>
        <h1>Page Not Found</h1>
        <p>The page you requested is missing or has moved.</p>
      </section>

      <section className='panel paper-panel appear-up'>
        <h2>Back to Training</h2>
        <p>Return to the main trainer and continue your session.</p>
        <Link href='/' className='button button-strong'>
          Open trainer
        </Link>
      </section>
    </>
  );
}
