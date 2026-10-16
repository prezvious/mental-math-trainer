function Calculator() {
  return (
    <>
      <path
        className='art-guide'
        d='M32 332H608M64 82H566M82 52V370M558 52V370'
      />
      <circle className='art-secondary' cx='505' cy='112' r='66' />
      <g transform='translate(184 30) rotate(-8 144 180)'>
        <rect
          className='art-shadow'
          x='8'
          y='12'
          width='280'
          height='356'
          rx='27'
        />
        <rect
          className='art-paper art-outline'
          width='280'
          height='356'
          rx='27'
        />
        <path className='art-line' d='M23 28H65M23 34H65M23 40H65' />
        <text className='art-label' x='254' y='37' textAnchor='end'>
          MENTAL / MATH
        </text>
        <rect
          className='art-ink'
          x='22'
          y='59'
          width='236'
          height='81'
          rx='8'
        />
        <text className='art-display' x='239' y='115' textAnchor='end'>
          12 × 8
        </text>
        <text className='art-label' x='24' y='162'>
          A LITTLE EVERY DAY.
        </text>
        {Array.from({ length: 12 }, (_, index) => {
          const column = index % 4;
          const row = Math.floor(index / 4);
          return (
            <g
              key={index}
              transform={`translate(${24 + column * 59} ${177 + row * 49})`}
            >
              <rect
                className={
                  column === 3 ? 'art-primary' : 'art-soft art-outline'
                }
                width='46'
                height='42'
                rx='7'
              />
              <text
                className={column === 3 ? 'art-key art-on-primary' : 'art-key'}
                x='23'
                y='28'
                textAnchor='middle'
              >
                {
                  ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '='][
                    index
                  ]
                }
              </text>
            </g>
          );
        })}
        <path className='art-line' d='M24 333H256' />
      </g>
      <g className='art-line' strokeWidth='3'>
        <path d='M96 205h34m-17-17v34M500 287h38m-38 14h38' />
      </g>
      <text className='art-label' x='468' y='366'>
        THINK. TAP. REPEAT.
      </text>
    </>
  );
}

function Riso() {
  return (
    <>
      <g className='art-guide'>
        <path d='M40 50h30m-15-15v30M570 50h30m-15-15v30M40 370h30m-15-15v30M570 370h30m-15-15v30' />
      </g>
      <g transform='translate(97 38) rotate(-7 190 165)'>
        <path className='art-secondary' d='M12 16H410V344H12z' />
        <path className='art-paper art-outline' d='M0 0H398V328H0z' />
        <path className='art-primary' d='M20 20H378V81H20z' />
        <text className='art-poster art-on-primary' x='33' y='66'>
          MATH CLUB
        </text>
        <circle className='art-secondary' cx='128' cy='182' r='83' />
        <path
          className='art-primary'
          d='M187 101h49v58h58v48h-58v58h-49v-58h-58v-48h58z'
        />
        <g className='art-ink' opacity='.24'>
          {Array.from({ length: 12 }, (_, index) => (
            <path key={index} d={`M${44 + index * 9} 260h4V104h-4z`} />
          ))}
        </g>
        <text className='art-label' x='24' y='302'>
          LESS SCROLLING. MORE SOLVING.
        </text>
        <path
          className='art-line'
          d='M310 250h64m-64 10h64m-64 10h64m-64 10h64'
        />
      </g>
      <g transform='translate(470 270) rotate(12)'>
        <circle className='art-primary' r='65' />
        <text className='art-stamp art-on-primary' textAnchor='middle' y='-5'>
          MAKE IT
        </text>
        <text className='art-stamp art-on-primary' textAnchor='middle' y='24'>
          COUNT.
        </text>
      </g>
    </>
  );
}

function Orbital() {
  return (
    <>
      <g className='art-guide'>
        {Array.from({ length: 12 }, (_, index) => (
          <path key={index} d={`M${48 + index * 48} 32V388`} />
        ))}
        <path d='M32 80H608M32 160H608M32 240H608M32 320H608' />
      </g>
      <g transform='translate(320 210)'>
        <circle className='art-guide' r='174' />
        <circle className='art-line' r='150' strokeDasharray='1 12' />
        <circle className='art-line' r='113' />
        <ellipse
          className='art-line'
          rx='220'
          ry='72'
          transform='rotate(-28)'
        />
        <ellipse className='art-line' rx='190' ry='63' transform='rotate(48)' />
        <circle className='art-soft art-outline' r='76' />
        <path
          className='art-primary'
          d='M-36-12h24v-24h24v24h24v24H12v24h-24V12h-24z'
        />
        <circle
          className='art-secondary art-outline'
          cx='-166'
          cy='91'
          r='18'
        />
        <circle className='art-primary' cx='123' cy='-77' r='12' />
        <circle className='art-ink' cx='-104' cy='-124' r='6' />
        <path className='art-line' d='M0-188v26M0 162v26M-188 0h26M162 0h26' />
      </g>
      <path
        className='art-line'
        d='M38 68V38H118M522 382h80v-30M448 111h75l32-28M159 303H80l-30 29'
      />
      <text className='art-label' x='40' y='26'>
        COGNITIVE EXPLORATION
      </text>
      <text className='art-label' x='600' y='404' textAnchor='end'>
        EVERY ANSWER, ANOTHER ORBIT.
      </text>
    </>
  );
}

function Crossword() {
  const blocked = [
    0, 1, 5, 6, 7, 13, 17, 21, 24, 27, 31, 35, 41, 42, 43, 47, 48
  ];
  const letters = {
    9: 'M',
    16: 'A',
    23: 'T',
    30: 'H',
    22: 'E',
    25: 'A',
    26: 'L',
    33: 'S'
  };
  return (
    <>
      <g transform='translate(134 18) rotate(7 182 187)'>
        <path className='art-shadow' d='M10 12H374V390H10z' />
        <path className='art-paper art-outline' d='M0 0H364V378H0z' />
        <text className='art-newspaper' x='182' y='42' textAnchor='middle'>
          The Daily Number
        </text>
        <path className='art-line' d='M20 56H344M20 61H344' />
        <text className='art-label' x='22' y='80'>
          A MOMENT FOR YOUR MIND.
        </text>
        <g transform='translate(35 98)'>
          {Array.from({ length: 49 }, (_, index) => (
            <g
              key={index}
              transform={`translate(${(index % 7) * 42} ${
                Math.floor(index / 7) * 34
              })`}
            >
              <rect
                className={
                  blocked.includes(index) ? 'art-ink' : 'art-paper art-outline'
                }
                width='42'
                height='34'
              />
              {!blocked.includes(index) && index % 3 === 0 && (
                <text className='art-cell-number' x='4' y='10'>
                  {index + 1}
                </text>
              )}
              {letters[index] && (
                <text
                  className='art-cell-letter'
                  x='21'
                  y='27'
                  textAnchor='middle'
                >
                  {letters[index]}
                </text>
              )}
            </g>
          ))}
        </g>
        <path className='art-line' d='M35 353H329' />
      </g>
      <circle className='art-secondary' cx='121' cy='289' r='54' />
      <path className='art-line' strokeWidth='4' d='M96 289h50m-25-25v50' />
      <path
        className='art-primary'
        d='m482 119 16-23 19 13-16 23-19-13  -108 155-10 34 29-21z'
      />
      <path className='art-line' d='m374 264 19 13m89-158 19 13' />
    </>
  );
}

function Track() {
  return (
    <>
      <g fill='none' stroke='var(--art-secondary)' strokeWidth='20'>
        <path d='M-60 330H346a112 112 0 0 0 0-224H-60' />
        <path d='M-60 367H346a149 149 0 0 0 0-298H-60' />
        <path d='M-60 404H346a186 186 0 0 0 0-372H-60' />
      </g>
      <g className='art-line' strokeDasharray='3 8'>
        <path d='M0 330H346a112 112 0 0 0 0-224H0M0 367H346a149 149 0 0 0 0-298H0' />
      </g>
      <g transform='translate(153 104) rotate(-9 145 99)'>
        <rect
          className='art-shadow'
          x='9'
          y='10'
          width='290'
          height='199'
          rx='4'
        />
        <rect
          className='art-paper art-outline'
          width='290'
          height='199'
          rx='4'
        />
        <path className='art-primary' d='M0 0h290v40H0z' />
        <text
          className='art-label art-on-primary'
          x='145'
          y='26'
          textAnchor='middle'
        >
          MENTAL ATHLETICS
        </text>
        <text className='art-bib' x='145' y='157' textAnchor='middle'>
          128
        </text>
        <path className='art-line' d='M18 178H272' />
        <circle className='art-ink' cx='14' cy='14' r='3' />
        <circle className='art-ink' cx='276' cy='14' r='3' />
      </g>
      <g transform='translate(502 294)'>
        <circle className='art-paper art-outline' r='51' />
        <circle className='art-line' r='39' strokeDasharray='2 8' />
        <path
          className='art-line'
          strokeWidth='4'
          d='M0-29V0l20 13M-11-61h22M0-61v10'
        />
      </g>
      <text className='art-label' x='26' y='245'>
        TRAIN YOUR OWN PACE.
      </text>
    </>
  );
}

function Bauhaus() {
  return (
    <>
      <path
        className='art-guide'
        d='M64 42V378M232 42V378M400 42V378M568 42V378M64 42H568M64 210H568M64 378H568'
      />
      <path className='art-primary' d='M64 42h168v168H64z' />
      <circle className='art-secondary' cx='148' cy='126' r='63' />
      <path className='art-ink' d='M232 210V42h168a168 168 0 0 1-168 168' />
      <path className='art-secondary' d='M400 42h168v168z' />
      <circle className='art-ink' cx='484' cy='294' r='84' />
      <path className='art-primary' d='M400 294a84 84 0 0 0 168 0z' />
      <path className='art-secondary' d='M64 210h168v168H64z' />
      <g className='art-line' strokeWidth='10'>
        {Array.from({ length: 6 }, (_, index) => (
          <path key={index} d={`M80 ${226 + index * 27}h136`} />
        ))}
      </g>
      <path
        className='art-primary'
        d='M292 228h48v48h48v48h-48v48h-48v-48h-48v-48h48z'
      />
      <circle className='art-paper' cx='148' cy='126' r='22' />
      <path className='art-line' d='M40 42H24v16M592 378h16v-16' />
    </>
  );
}

function Fieldnotes() {
  return (
    <>
      <g className='art-contours' fill='none'>
        <path d='M-30 335C40 181 182 397 290 237S503 49 680 133M-30 310C48 153 172 370 279 213S513 26 680 108M-30 285C55 125 166 343 268 190S523 3 680 83M-30 260C63 97 158 315 257 166S534-20 680 58M-30 235C71 69 150 287 246 142S545-43 680 33M-30 210C79 41 142 259 235 118S556-66 680 8' />
        <path d='M-30 360C32 209 190 425 301 261S493 72 680 158M-30 385C24 237 198 453 312 285S483 95 680 183M-30 410C16 265 206 481 323 309S473 118 680 208M-30 435C8 293 214 509 334 333S463 141 680 233' />
      </g>
      <g transform='translate(185 42) rotate(-8 132 166)'>
        <rect
          className='art-shadow'
          x='9'
          y='10'
          width='264'
          height='332'
          rx='8'
        />
        <rect
          className='art-paper art-outline'
          width='264'
          height='332'
          rx='8'
        />
        <path
          className='art-primary'
          d='M0 8a8 8 0 0 1 8-8h17v332H8a8 8 0 0 1-8-8z'
        />
        <path
          className='art-guide'
          d='M48 200H240M48 220H240M48 240H240M48 260H240M48 280H240'
        />
        <text className='art-journal' x='49' y='77'>
          Field
        </text>
        <text className='art-journal' x='49' y='125'>
          Notes.
        </text>
        <text className='art-label' x='49' y='160'>
          SMALL DAILY DISCOVERIES
        </text>
        <circle
          className='art-secondary art-outline'
          cx='208'
          cy='279'
          r='32'
        />
        <path className='art-line' d='m208 256 10 23-10 23-10-23zM185 279h46' />
      </g>
      <g className='art-line' transform='translate(529 93)'>
        <circle r='38' />
        <path d='M-48 0h96M0-48v96m0-24 9-24-9-24-9 24z' />
      </g>
      <text className='art-label' x='49' y='383'>
        FOLLOW YOUR CURIOSITY.
      </text>
    </>
  );
}

function Arcade() {
  return (
    <>
      <path className='art-guide' d='M55 337h530M55 83h530' />
      <g transform='translate(162 24) rotate(8 153 185)'>
        <path
          className='art-shadow'
          d='M18 12h270l18 18v302l-35 50H18L0 364V30z'
        />
        <path
          className='art-paper art-outline'
          d='M18 0h270l18 18v302l-35 50H18L0 352V18z'
        />
        <path className='art-soft art-outline' d='M24 31h258v181H24z' />
        <path className='art-ink' d='M41 49h224v145H41z' />
        <g className='art-screen-pixels'>
          <path d='M89 75h12v12h-12zm96 0h12v12h-12zM113 87h60v12h-60zm-12 12h84v12h-84zM89 111h108v24H89zm0 24h12v24H89zm96 0h12v24h-12zM113 147h12v12h-12zm48 0h12v12h-12z' />
          <path
            className='art-screen-cutout'
            d='M113 111h12v12h-12zm48 0h12v12h-12z'
          />
          <path d='M57 170h12v6H57zm18 0h12v6H75zm18 0h12v6H93zm18 0h12v6h-12z' />
        </g>
        <text className='art-label' x='27' y='232'>
          MENTAL MATH / MICRO
        </text>
        <path
          className='art-ink'
          d='M66 252h26v25h25v26H92v25H66v-25H41v-26h25z'
        />
        <circle className='art-primary art-outline' cx='236' cy='271' r='20' />
        <circle
          className='art-secondary art-outline'
          cx='191'
          cy='303'
          r='20'
        />
        <path
          className='art-line'
          strokeWidth='4'
          d='m219 338 38-13m-34 23 38-13m-34 23 38-13'
        />
        <path className='art-line' strokeWidth='7' d='M106 347h25m14 0h25' />
      </g>
      <g className='art-primary'>
        <path d='M82 113h12v12h12v12H94v12H82v-12H70v-12h12zM530 248h12v12h12v12h-12v12h-12v-12h-12v-12h12z' />
      </g>
      <path className='art-secondary' d='M500 90h14v14h-14zM92 285h14v14H92z' />
    </>
  );
}

export const INTERFACE_ARTWORK = {
  calculator: { component: Calculator, motto: 'A little every day.' },
  riso: { component: Riso, motto: 'Less scrolling. More solving.' },
  orbital: { component: Orbital, motto: 'Expand your thinking.' },
  crossword: { component: Crossword, motto: 'A moment for your mind.' },
  track: { component: Track, motto: 'Find your own pace.' },
  bauhaus: { component: Bauhaus, motto: 'Play with the fundamentals.' },
  fieldnotes: { component: Fieldnotes, motto: 'Follow your curiosity.' },
  arcade: { component: Arcade, motto: 'Small screen. Big thinking.' }
};

export default function InterfaceArtwork({ style }) {
  const Artwork = INTERFACE_ARTWORK[style]?.component;
  if (!Artwork) return null;
  return (
    <svg
      className='interface-artwork'
      viewBox='0 0 640 420'
      fill='none'
      aria-hidden='true'
      focusable='false'
    >
      <Artwork />
    </svg>
  );
}
