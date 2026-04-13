export default function HotkeyHint({
  label,
  variant = 'inline',
  className = ''
}) {
  if (!label) {
    return null;
  }

  return (
    <kbd
      className={`hotkey-hint hotkey-hint-${variant} ${className}`.trim()}
      aria-hidden='true'
    >
      {label}
    </kbd>
  );
}
