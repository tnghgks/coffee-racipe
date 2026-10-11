import type { SVGProps } from "react";

/*
 * Line-art dripper silhouettes on a 64×64 grid, drawn with currentColor so callers control tone.
 * Kept deliberately simple: each shape only needs to be recognizable as a large, faint watermark.
 */

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 64 64",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function V60(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 14h48" />
      <path d="M11 14l17 32h8l17-32" />
      <path d="M19 18q7 12 11 24M45 18q-7 12-11 24M32 16v26" />
      <path d="M51 19c9 0 9 14-3 13" />
      <path d="M28 46v4M36 46v4M18 50h28" />
    </svg>
  );
}

function KalitaWave(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 14h48" />
      <path d="M11 14l9 30h24l9-30" />
      <path d="M13 21q2-4 4 0t4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0 4 0" />
      <circle cx="26" cy="48" r="1.2" />
      <circle cx="32" cy="48" r="1.2" />
      <circle cx="38" cy="48" r="1.2" />
      <path d="M16 52h32" />
    </svg>
  );
}

function Origami(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 14l4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4" />
      <path d="M10 16l18 30h8l18-30" />
      <path d="M16 15l13 31M24 15l6 31M32 15v31M40 15l-6 31M48 15l-13 31" />
      <path d="M22 50h20M26 50l-2 4M38 50l2 4" />
    </svg>
  );
}

function Chemex(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14 6l15 20v6q-17 14-15 24 1 2 4 2h28q3 0 4-2 2-10-15-24v-6L50 6" />
      <path d="M14 6h36" />
      <rect x="24" y="24" width="16" height="10" rx="2" />
      <path d="M40 30l4 4" />
      <circle cx="45.5" cy="35.5" r="2" />
    </svg>
  );
}

function Melitta(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10 14h44" />
      <path d="M12 14l12 30h16l12-30" />
      <path d="M22 18l6 24M42 18l-6 24M32 18v24" />
      <path d="M50 19h8v12h-11" />
      <circle cx="32" cy="48" r="1.4" />
      <path d="M20 52h24" />
    </svg>
  );
}

function Clever(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10 10h44M28 10V6h8v4" />
      <path d="M9 15h46" />
      <path d="M11 15l9 29h24l9-29" />
      <path d="M51 20c9 0 9 14-3 13" />
      <path d="M17 48h30M22 48v4M42 48v4" />
    </svg>
  );
}

function GenericCone(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 14h48" />
      <path d="M11 14l17 32h8l17-32" />
      <path d="M18 50h28" />
    </svg>
  );
}

const icons: Record<string, (props: IconProps) => React.JSX.Element> = {
  v60: V60,
  "kalita-wave": KalitaWave,
  origami: Origami,
  chemex: Chemex,
  melitta: Melitta,
  clever: Clever,
};

export function DripperIcon({ slug, ...props }: IconProps & { slug: string }) {
  const Icon = icons[slug] ?? GenericCone;
  return <Icon aria-hidden focusable={false} {...props} />;
}
