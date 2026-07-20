"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { startOfDay, startOfWeek, startOfMonth } from "@/lib/date-utils";

interface PaymentPoint {
  amountPaid: number;
  paymentDate: string;
}

type Granularity = "day" | "week" | "month";

interface Bucket {
  start: Date;
  end: Date;
  label: string;
  total: number;
}

const GRANULARITY_OPTIONS: { value: Granularity; label: string; count: number }[] = [
  { value: "day", label: "Jour", count: 14 },
  { value: "week", label: "Semaine", count: 8 },
  { value: "month", label: "Mois", count: 6 },
];

function buildBuckets(granularity: Granularity, count: number, payments: PaymentPoint[]): Bucket[] {
  const now = new Date();
  const buckets: Bucket[] = [];

  for (let i = count - 1; i >= 0; i--) {
    let start: Date;
    let end: Date;
    let label: string;

    if (granularity === "day") {
      start = startOfDay(now);
      start.setDate(start.getDate() - i);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      label = start.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    } else if (granularity === "week") {
      start = startOfWeek(now);
      start.setDate(start.getDate() - i * 7);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
      label = start.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    } else {
      start = startOfMonth(now);
      start.setMonth(start.getMonth() - i);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      label = start.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    }

    buckets.push({ start, end, label, total: 0 });
  }

  for (const payment of payments) {
    const date = new Date(payment.paymentDate);
    const bucket = buckets.find((b) => date >= b.start && date < b.end);
    if (bucket) bucket.total += payment.amountPaid;
  }

  return buckets;
}

function niceMax(value: number): number {
  if (value <= 0) return 100;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = Math.pow(10, exponent);
  const residual = value / magnitude;
  let niceResidual: number;
  if (residual > 5) niceResidual = 10;
  else if (residual > 2) niceResidual = 5;
  else if (residual > 1) niceResidual = 2;
  else niceResidual = 1;
  return niceResidual * magnitude;
}

function topRoundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return "";
  const radius = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + radius} Q${x},${y} ${x + radius},${y} L${x + w - radius},${y} Q${x + w},${y} ${x + w},${y + radius} L${x + w},${y + h} Z`;
}

function formatAriary(amount: number) {
  return `${amount.toLocaleString("fr-FR")} Ar`;
}

const CHART_WIDTH = 800;
const CHART_HEIGHT = 220;
const MARGIN = { top: 12, right: 8, bottom: 26, left: 64 };

export function CollectedPaymentsChart({ payments }: { payments: PaymentPoint[] }) {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [hovered, setHovered] = useState<number | null>(null);

  const count = GRANULARITY_OPTIONS.find((o) => o.value === granularity)!.count;
  const buckets = useMemo(
    () => buildBuckets(granularity, count, payments),
    [granularity, count, payments]
  );

  const total = buckets.reduce((sum, b) => sum + b.total, 0);
  const max = niceMax(Math.max(...buckets.map((b) => b.total), 0));

  const plotWidth = CHART_WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const slot = plotWidth / buckets.length;
  const barWidth = Math.min(24, slot * 0.6);
  const showEveryLabel = buckets.length <= 10;

  const ticks = [0, max / 2, max];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">
          Total sur la période :{" "}
          <span className="font-semibold text-foreground">{formatAriary(total)}</span>
        </p>
        <div className="flex gap-1">
          {GRANULARITY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={granularity === option.value ? "default" : "outline"}
              onClick={() => setGranularity(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label={`Paiements collectés par ${granularity === "day" ? "jour" : granularity === "week" ? "semaine" : "mois"}`}
        >
          {ticks.map((tick, i) => {
            const y = MARGIN.top + plotHeight - (tick / max) * plotHeight;
            return (
              <g key={i}>
                <line
                  x1={MARGIN.left}
                  x2={CHART_WIDTH - MARGIN.right}
                  y1={y}
                  y2={y}
                  className="stroke-border"
                  strokeWidth={1}
                />
                <text
                  x={MARGIN.left - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {tick.toLocaleString("fr-FR")}
                </text>
              </g>
            );
          })}

          {buckets.map((bucket, i) => {
            const x = MARGIN.left + i * slot + (slot - barWidth) / 2;
            const barHeight = (bucket.total / max) * plotHeight;
            const y = MARGIN.top + plotHeight - barHeight;
            const isHovered = hovered === i;

            return (
              <g key={i}>
                <rect
                  x={MARGIN.left + i * slot}
                  y={MARGIN.top}
                  width={slot}
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  tabIndex={0}
                  className="outline-none cursor-pointer"
                >
                  <title>
                    {bucket.label} : {formatAriary(bucket.total)}
                  </title>
                </rect>
                {bucket.total > 0 && (
                  <path
                    d={topRoundedRectPath(x, y, barWidth, barHeight, 4)}
                    className="fill-chart-1 pointer-events-none"
                    opacity={isHovered ? 0.85 : 1}
                  />
                )}
                {(showEveryLabel || i % 2 === 0) && (
                  <text
                    x={MARGIN.left + i * slot + slot / 2}
                    y={CHART_HEIGHT - 6}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px]"
                  >
                    {bucket.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hovered !== null && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md"
            style={{
              left: `${((MARGIN.left + hovered * slot + slot / 2) / CHART_WIDTH) * 100}%`,
              top: `${(MARGIN.top / CHART_HEIGHT) * 100}%`,
            }}
          >
            <p className="text-muted-foreground">{buckets[hovered].label}</p>
            <p className="font-semibold text-popover-foreground">
              {formatAriary(buckets[hovered].total)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
