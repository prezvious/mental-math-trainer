import Image from 'next/image';
import InterfaceArtwork, { INTERFACE_ARTWORK } from 'components/InterfaceArtwork.js';
import { useAccountPreferences } from 'utils/accountPreferencesContext.js';

export default function PageIntro({ title, description, className = '' }) {
  const { interfaceStyle } = useAccountPreferences();

  if (INTERFACE_ARTWORK[interfaceStyle]) {
    return (
      <header className={['page-intro', 'collection-intro', className].filter(Boolean).join(' ')}>
        <div className='collection-intro-copy'>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
          <span className='collection-motto' aria-hidden='true'>{INTERFACE_ARTWORK[interfaceStyle].motto}</span>
        </div>
        <div className='collection-intro-art' aria-hidden='true'>
          <InterfaceArtwork style={interfaceStyle} />
        </div>
      </header>
    );
  }

  if (interfaceStyle === 'kira') {
    return (
      <header className={`page-intro kira-intro ${className}`.trim()}>
        <div className='kira-intro-copy'>
          <h1>
            <span className='visually-hidden'>{title}</span>
            <span className='kira-display' data-lettering={title} aria-hidden='true'>{title}</span>
          </h1>
          {description && <p>{description}</p>}
        </div>
        <div className='kira-intro-art' aria-hidden='true'>
          <svg className='kira-character kira-character-flashcards' viewBox='0 0 100 100' focusable='false'>
            <use href='/images/kira-math-pattern.svg#flashcards' />
          </svg>
          <svg className='kira-character kira-character-pencil' viewBox='0 0 100 100' focusable='false'>
            <use href='/images/kira-math-pattern.svg#pencil' />
          </svg>
          <svg className='kira-character kira-character-stopwatch' viewBox='0 0 100 100' focusable='false'>
            <use href='/images/kira-math-pattern.svg#stopwatch' />
          </svg>
          <svg className='kira-art-spark' viewBox='0 0 40 40' focusable='false'>
            <use href='/images/kira-math-pattern.svg#starburst' />
          </svg>
          <svg className='kira-art-plus' viewBox='0 0 40 40' fill='none' focusable='false'>
            <use href='/images/kira-math-pattern.svg#multiply' />
          </svg>
          <svg className='kira-art-tally' viewBox='0 0 40 40' focusable='false'>
            <use href='/images/kira-math-pattern.svg#tally' />
          </svg>
          <svg className='kira-art-number' viewBox='0 0 40 40' focusable='false'>
            <use href='/images/kira-math-pattern.svg#number-tile' />
          </svg>
        </div>
      </header>
    );
  }

  if (interfaceStyle === 'korner') {
    return (
      <header className={`page-intro korner-intro ${className}`.trim()}>
        <div className='korner-intro-copy'>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
          <span className='korner-lettering' aria-hidden='true'>Make it count.</span>
        </div>
        <div className='korner-intro-art' aria-hidden='true'>
          <svg className='korner-math-mark' viewBox='0 0 80 80' fill='none' focusable='false'>
            <path d='M40 10v60M10 40h60' stroke='currentColor' strokeWidth='11' strokeLinecap='round' />
          </svg>
          <Image src='/images/korner-study.png' alt='' width={1448} height={1086} sizes='(max-width: 639px) 112px, 416px' />
          <svg className='korner-math-mark korner-math-mark-second' viewBox='0 0 80 80' fill='none' focusable='false'>
            <path d='M14 29h52M14 51h52' stroke='currentColor' strokeWidth='11' strokeLinecap='round' />
          </svg>
        </div>
      </header>
    );
  }

  return (
    <header className={`page-intro appear-up ${className}`.trim()}>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
}
