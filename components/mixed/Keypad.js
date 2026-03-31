const KEYS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['AC', '0', 'DEL']
];

export default function Keypad({ onDigit, onClear, onDelete, disabled }) {
  const handlePointerDown = (event, key) => {
    event.preventDefault();

    if (disabled) {
      return;
    }

    if (key === 'AC') {
      onClear();
    } else if (key === 'DEL') {
      onDelete();
    } else {
      onDigit(key);
    }
  };

  return (
    <div className='keypad' role='group' aria-label='Numeric keypad'>
      {KEYS.flat().map((key) => {
        const isAction = key === 'AC' || key === 'DEL';
        return (
          <button
            key={key}
            type='button'
            className={`keypad-button${isAction ? ' action' : ''}`}
            onPointerDown={(event) => handlePointerDown(event, key)}
            disabled={disabled}
            aria-label={
              key === 'AC' ? 'Clear all' : key === 'DEL' ? 'Delete last digit' : key
            }
            tabIndex={-1}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
