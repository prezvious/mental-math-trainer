import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSupabaseAuth } from 'utils/supabaseAuthContext';

export default function SiteLayout({ children }) {
  const router = useRouter();
  const { user, isConfigured, signOut } = useSupabaseAuth();

  const navLinks = [
    { href: '/', label: 'Trainer' },
    { href: '/stats', label: 'Progress' }
  ];

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      await router.push('/login');
    }
  };

  return (
    <div className='app-shell'>
      <header className='site-header'>
        <div className='site-header-inner'>
          <Link href='/' className='brand' aria-label='MathTrainer home'>
            <span className='brand-chip'>MathTrainer</span>
            <span className='brand-title'>Mental Math Studio</span>
          </Link>
          <nav className='site-nav' aria-label='Main'>
            {navLinks.map((link) => {
              const isActive = router.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`site-nav-link ${isActive ? 'is-active' : ''}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className='site-actions'>
            {!isConfigured && <span className='status-badge'>Supabase not set</span>}
            {user ? (
              <>
                <span className='user-pill'>{user.email}</span>
                <button type='button' className='button button-quiet' onClick={handleSignOut}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href='/login' className='button button-quiet'>
                  Log in
                </Link>
                <Link href='/signup' className='button button-strong'>
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className='site-main'>{children}</main>
      <footer className='site-footer'>
        <p>
          Built for focused repetition, measurable progress, and ruthless consistency.
        </p>
      </footer>
    </div>
  );
}
