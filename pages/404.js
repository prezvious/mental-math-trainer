import Head from 'next/head';
import Link from 'next/link';

function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Page not found | Mental Math Studio</title>
        <meta name='description' content='This Mental Math Studio page does not exist.' />
        <meta name='robots' content='noindex' />
      </Head>

      <section className='not-found-page panel paper-panel' aria-labelledby='not-found-title'>
        <span className='not-found-code' aria-hidden='true'>404</span>
        <div className='not-found-content'>
          <h1 id='not-found-title' className='not-found-title'>Page not found</h1>
          <p>That page is not here. Your next round is still one step away.</p>
          <div className='inline-actions'>
            <Link href='/' className='button button-strong'>Open Trainer</Link>
            <Link href='/mixed' className='button button-quiet'>Open Mixed</Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default NotFoundPage;
