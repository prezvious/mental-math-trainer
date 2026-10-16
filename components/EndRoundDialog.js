import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function EndRoundDialog({ count, onCancel, onConfirm, isEnding }) {
  const keepButtonRef = useRef(null);
  const endButtonRef = useRef(null);

  useEffect(() => {
    const background = ['#main-content', '.site-header', '.site-footer', '.utility-drawer-shell']
      .map((selector) => document.querySelector(selector)).filter(Boolean);
    const previous = background.map((element) => element.inert);
    background.forEach((element) => { element.inert = true; });
    return () => background.forEach((element, index) => { element.inert = previous[index]; });
  }, []);

  useEffect(() => {
    keepButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isEnding) {
        event.preventDefault();
        onCancel();
      } else if (event.key === 'Tab') {
        const first = keepButtonRef.current;
        const last = endButtonRef.current;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isEnding, onCancel]);

  const dialog = (
    <div className='end-round-backdrop'>
      <section className='panel paper-panel end-round-dialog' role='alertdialog' aria-modal='true'
        aria-labelledby='end-round-title' aria-describedby='end-round-description'>
        <h2 id='end-round-title'>End this round?</h2>
        <p id='end-round-description'>
          {count === 0 ? 'No answers have been submitted. No history entry will be created.' :
            `${count} submitted ${count === 1 ? 'answer' : 'answers'} will be kept.`}
          {' '}The current unsubmitted answer is not counted.
        </p>
        <div className='inline-actions'>
          <button ref={keepButtonRef} type='button' className='button button-quiet'
            onClick={onCancel} disabled={isEnding}>Keep training</button>
          <button ref={endButtonRef} type='button' className='button button-danger'
            onClick={onConfirm} disabled={isEnding}>
            {isEnding ? 'Ending…' : 'End round'}
          </button>
        </div>
      </section>
    </div>
  );

  const portalTarget = typeof document === 'undefined' ? null : document.querySelector('.app-shell');
  return portalTarget ? createPortal(dialog, portalTarget) : dialog;
}
