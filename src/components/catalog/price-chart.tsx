/**
 * Dependency-free SVG price-history line chart (server component).
 */

type Point = { date: Date; price: number };

export function PriceChart({ points }: { points: Point[] }) {
  if (points.length < 2) return null;

  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const prices = sorted.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const W = 640;
  const H = 160;
  const PAD = 12;

  const x = (i: number) => PAD + (i / (sorted.length - 1)) * (W - PAD * 2);
  const y = (price: number) => PAD + (1 - (price - min) / range) * (H - PAD * 2);

  const path = sorted
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`)
    .join(" ");

  const fmt = new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" });
  const dateFmt = new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "numeric" });

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Vývoj ceny od ${fmt.format(max)} po ${fmt.format(min)}`}
        className="w-full"
      >
        <path
          d={`${path} L${x(sorted.length - 1).toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`}
          fill="currentColor"
          className="text-primary/10"
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />
        {sorted.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.price)}
            r={3.5}
            fill="currentColor"
            className="text-primary"
          >
            <title>{`${dateFmt.format(p.date)}: ${fmt.format(p.price)}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{dateFmt.format(sorted[0].date)}</span>
        <span>
          min {fmt.format(min)} · max {fmt.format(max)}
        </span>
        <span>{dateFmt.format(sorted[sorted.length - 1].date)}</span>
      </figcaption>
    </figure>
  );
}
