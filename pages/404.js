import Head from 'next/head';

function NotFoundPage() {
  return (
    <>
      <Head>
        <title>PAGES NOT FOUND | Mental Math Studio</title>
        <meta
          name='description'
          content='The requested Mental Math Studio page does not exist.'
        />
      </Head>

      <main className='not-found-page' aria-labelledby='not-found-title'>
        <div className='not-found-code' aria-hidden='true'>
          404
        </div>
        <h1 id='not-found-title' className='not-found-title'>
          PAGES NOT FOUND
        </h1>
      </main>
    </>
  );
}

NotFoundPage.useSiteLayout = false;

export default NotFoundPage;
