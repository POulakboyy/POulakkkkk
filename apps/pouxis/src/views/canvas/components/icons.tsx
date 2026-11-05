import type { ReactNode, SVGProps } from 'react';

/** Canvas-only icons, drawn like `src/ui/icons.tsx`: 24 × 24 grid, 1.75 stroke. */
type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconCursor = (p: P) => (
  <Svg {...p}>
    <path d="M5 3.5 19 10l-6.2 1.9L10 18.5Z" />
  </Svg>
);

export const IconHand = (p: P) => (
  <Svg {...p}>
    <path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11m0-6.5V4a1.5 1.5 0 0 1 3 0v7m0-5.5a1.5 1.5 0 0 1 3 0V13a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.9-2.6L3.4 14a1.6 1.6 0 0 1 2.5-2l2.1 2" />
  </Svg>
);

export const IconNode = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="7" width="17" height="10" rx="4" />
  </Svg>
);

export const IconEdge = (p: P) => (
  <Svg {...p}>
    <circle cx="5.5" cy="17.5" r="2.5" />
    <circle cx="18.5" cy="6.5" r="2.5" />
    <path d="M7.5 15.5c3-1 3-5 9-7" />
  </Svg>
);

export const IconPen = (p: P) => (
  <Svg {...p}>
    <path d="M4 20c2.5-.4 4-1.3 5.5-2.8L19 7.7a2.1 2.1 0 0 0-3-3L6.6 14.2C5 15.8 4.3 17.4 4 20Z" />
    <path d="m14.5 6.2 3.3 3.3" />
  </Svg>
);

export const IconEraser = (p: P) => (
  <Svg {...p}>
    <path d="m8 19.5-4-4a1.8 1.8 0 0 1 0-2.5L13 4a1.8 1.8 0 0 1 2.5 0L20 8.5a1.8 1.8 0 0 1 0 2.5l-8.5 8.5H20" />
    <path d="m9 9 6 6" />
  </Svg>
);

export const IconFit = (p: P) => (
  <Svg {...p}>
    <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
  </Svg>
);

export const IconTree = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="3.5" width="6" height="4" rx="1.5" />
    <rect x="3" y="16.5" width="6" height="4" rx="1.5" />
    <rect x="15" y="16.5" width="6" height="4" rx="1.5" />
    <path d="M12 7.5V12M6 16.5V12h12v4.5" />
  </Svg>
);

export const IconPresent = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="m10.5 8 4 2-4 2Z" />
    <path d="M12 16v4m-3 0h6" />
  </Svg>
);

export const IconTimeline = (p: P) => (
  <Svg {...p}>
    <path d="M3 18h18" />
    <path d="M7 18v-3M12 18v-3M17 18v-3" />
    <rect x="5" y="5" width="8" height="5" rx="2" />
    <rect x="12" y="8" width="7" height="4" rx="2" />
  </Svg>
);

export const IconDownload = (p: P) => (
  <Svg {...p}>
    <path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 19.5h14" />
  </Svg>
);

export const IconOutline = (p: P) => (
  <Svg {...p}>
    <path d="M4 6h.01M8 6h12M7 12h.01M11 12h9M7 18h.01M11 18h9" />
  </Svg>
);

export const IconChild = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="4" width="8" height="5" rx="2" />
    <rect x="13" y="15" width="8" height="5" rx="2" />
    <path d="M7 9v4.5a4 4 0 0 0 4 4h2" />
  </Svg>
);

export const IconCollapse = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M8.5 12h7" />
  </Svg>
);

export const IconExpand = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M8.5 12h7M12 8.5v7" />
  </Svg>
);
