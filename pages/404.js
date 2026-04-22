import Head from 'next/head';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Page Not Found | Mental Math Studio</title>
        <meta name='description' content='The requested page does not exist.' />
      </Head>

      <div className='auth-shell not-found-shell'>
        <section className='hero-panel hero-panel-compact appear-up'>
          <div className='hero-layout'>
            <div className='hero-copy'>
              <p className='hero-tag'>404</p>
              <h1>Page Not Found</h1>
              <p>The page you requested is missing, moved, or never belonged on the desk.</p>
            </div>
            <div className='hero-sidebar'>
              <p className='hero-sidebar-label'>Quick reroute</p>
              <ul className='hero-checklist'>
                <li>Return to the main trainer.</li>
                <li>Switch to mixed mode.</li>
                <li>Open progress once your account is live.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className='panel paper-panel appear-up empty-state-panel'>
          <p className='panel-kicker'>Back to practice</p>
          <h2>Choose the next surface</h2>
          <p>Drop back into a round instead of wandering a dead route.</p>
          <div className='inline-actions'>
            <Link href='/' className='button button-strong'>
              Open trainer
            </Link>
            <Link href='/mixed' className='button button-quiet'>
              Open mixed mode
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
