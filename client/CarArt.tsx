import { useId } from 'react';
// Original vector artwork; category-specific bodies keep the demo fully self-contained.
export function CarArt({
  color = '#aebda8',
  category = 'Coupe',
  hero = false,
}: {
  color?: string;
  category?: string;
  hero?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const tall = category === 'SUV' || category === 'Truck';
  const compact = category === 'Hatchback';
  const roof = tall
    ? 'M156 143 L177 70 Q180 62 196 62 L318 62 Q331 62 340 78 L380 143Z'
    : compact
      ? 'M153 147 L188 89 Q193 82 210 82 L304 82 Q317 85 329 102 L363 148Z'
      : 'M138 148 Q179 83 223 82 L281 82 Q311 84 365 146Z';
  return (
    <svg viewBox="0 0 520 260" aria-hidden="true" className={hero ? 'car-art hero-car' : 'car-art'}>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0.3" y2="1">
          <stop stopColor="#fff" stopOpacity=".65" />
          <stop offset=".32" stopColor={color} />
          <stop offset=".75" stopColor={color} />
          <stop offset="1" stopColor="#182d2c" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#587675" />
          <stop offset=".5" stopColor="#243c3d" />
          <stop offset="1" stopColor="#102827" />
        </linearGradient>
        <radialGradient id={`${id}-wheel`}>
          <stop offset=".25" stopColor="#8c9695" />
          <stop offset=".29" stopColor="#2e393a" />
          <stop offset=".62" stopColor="#a5aead" />
          <stop offset=".67" stopColor="#162322" />
          <stop offset="1" stopColor="#101c1b" />
        </radialGradient>
        <filter id={`${id}-blur`}>
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <ellipse
        cx="264"
        cy="208"
        rx="211"
        ry="13"
        fill="#0a201b"
        opacity=".19"
        filter={`url(#${id}-blur)`}
      />
      <path d={roof} fill={`url(#${id}-body)`} stroke="#263f39" strokeOpacity=".28" />
      <path
        d={
          tall
            ? 'M171 135 190 76 249 76 249 135Z M258 76 317 76 350 135 258 135Z'
            : compact
              ? 'M171 139 202 95 248 95 248 139Z M257 95 299 95 338 139 257 139Z'
              : 'M161 140 Q190 94 226 94 L249 94 249 140Z M258 94 280 94 Q310 97 344 140Z'
        }
        fill={`url(#${id}-glass)`}
      />
      <path d="M160 140 344 140" stroke="#fff" strokeOpacity=".5" strokeWidth="2" />
      <path
        d="M53 150 Q76 139 138 140 L371 140 Q414 141 458 160 Q471 166 472 185 L460 199 L66 199 Q48 193 47 178Z"
        fill={`url(#${id}-body)`}
        stroke="#183931"
        strokeOpacity=".3"
      />
      <path d="M62 171 Q244 157 453 170" fill="none" stroke="#fff" strokeOpacity=".45" />
      <path
        d="M176 146 176 186 Q176 191 184 191 L328 191 338 149"
        fill="none"
        stroke="#15372f"
        strokeOpacity=".35"
      />
      <path d="M267 151h19" stroke="#3c5148" strokeWidth="3" strokeLinecap="round" />
      <path d="m342 135 15-4 10 7-23 3Z" fill={color} stroke="#29443c" />
      <path d="M430 151 460 162 458 169 430 163Z" fill="#f4f4d8" />
      <path d="m52 153 17-4-1 13-18 4" fill="#ac5143" />
      <path d="M426 184h40m-408 3h21" stroke="#203931" strokeWidth="7" />
      {[125, 391].map((x) => (
        <g key={x}>
          <path d={`M${x - 40} 199a40 40 0 0 1 80 0`} fill="#152925" />
          <circle cx={x} cy="192" r="34" fill={`url(#${id}-wheel)`} />
          <circle cx={x} cy="192" r="19" fill="#667571" />
          {Array.from({ length: 5 }, (_, i) => (
            <path
              key={i}
              d={`M${x} 175v34`}
              stroke="#ccd2ce"
              strokeWidth="3"
              transform={`rotate(${i * 36} ${x} 192)`}
            />
          ))}
          <circle cx={x} cy="192" r="6" fill="#324940" />
        </g>
      ))}
      <path d="M174 202h170" stroke="#17382e" strokeWidth="4" />
    </svg>
  );
}
