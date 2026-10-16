export const DEFAULT_INTERFACE_STYLE = 'studio';
export const INTERFACE_STYLE_OPTIONS = [
  { value: 'studio', label: 'Studio' },
  { value: 'opaline', label: 'Opaline Abacus' },
  { value: 'korner', label: 'Körner Club' },
  { value: 'kira', label: 'Kira Kira' },
  { value: 'calculator', label: 'Pocket Calculator' },
  { value: 'riso', label: 'Riso Math Club' },
  { value: 'orbital', label: 'Orbital Academy' },
  { value: 'crossword', label: 'Sunday Crossword' },
  { value: 'track', label: 'Track & Field' },
  { value: 'bauhaus', label: 'Bauhaus Blocks' },
  { value: 'fieldnotes', label: 'Field Notes' },
  { value: 'arcade', label: 'Arcade Micro' }
];

export function sanitizeInterfaceStyle(style) {
  return INTERFACE_STYLE_OPTIONS.some((option) => option.value === style)
    ? style
    : DEFAULT_INTERFACE_STYLE;
}
