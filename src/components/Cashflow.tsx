import { useState } from "react";
import { money } from "../domain/money";
import { Button } from "./ui/button";
import { Empty } from "./StatePanel";
type Point = { month: string; incomingMinor: string; outgoingMinor: string };
export function Cashflow({ points }: { points: Point[] }) {
  const [range, setRange] = useState(6);
  const shown = points.slice(-range);
  const max = shown.reduce(
    (m, p) =>
      [BigInt(p.incomingMinor), BigInt(p.outgoingMinor)].reduce(
        (v, a) => (a > v ? a : v),
        m,
      ),
    0n,
  );
  const incoming = shown.reduce((s, p) => s + BigInt(p.incomingMinor), 0n);
  const outgoing = shown.reduce((s, p) => s + BigInt(p.outgoingMinor), 0n);
  const height = (value: string) =>
    max === 0n ? 0 : Number((BigInt(value) * 16000n) / max) / 100;
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Cash Inflow & Outflow</h2>
          <p>Confirmed KES ledger movements only</p>
        </div>
        <div className="action-row">
          {[3, 6].map((months) => (
            <Button
              key={months}
              variant={range === months ? "default" : "outline"}
              aria-pressed={range === months}
              onClick={() => setRange(months)}
            >
              {months}M
            </Button>
          ))}
        </div>
      </div>
      <div className="chart-legend">
        <span className="money-incoming">
          <i className="legend-in" />
          In {money(incoming.toString(), "KES")}
        </span>
        <span className="money-outgoing">
          <i className="legend-out" />
          Out {money(outgoing.toString(), "KES")}
        </span>
      </div>
      {max === 0n ? (
        <Empty
          title="No cash movements"
          detail="Confirmed movements will appear here."
        />
      ) : (
        <svg
          className="cashflow-chart"
          viewBox="0 0 600 230"
          role="img"
          aria-label={`Cash inflow and outflow across ${range} months in KES. Exact amounts are available in the table below.`}
        >
          <line x1="15" y1="190" x2="585" y2="190" stroke="#dbe5e1" />
          {shown.map((point, i) => {
            const width = 570 / shown.length;
            const x = 15 + i * width + width / 2;
            return (
              <g key={point.month}>
                <rect
                  x={x - 22}
                  y={190 - height(point.incomingMinor)}
                  width="19"
                  height={height(point.incomingMinor)}
                  rx="2"
                  fill="#166534"
                />
                <rect
                  x={x + 3}
                  y={190 - height(point.outgoingMinor)}
                  width="19"
                  height={height(point.outgoingMinor)}
                  rx="2"
                  fill="#b42318"
                />
                <text
                  x={x}
                  y="215"
                  textAnchor="middle"
                  fontSize="11"
                  fill="#53605a"
                >
                  {new Date(point.month + "-01T00:00:00Z").toLocaleString(
                    "en-GB",
                    { month: "short", timeZone: "UTC" },
                  )}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <details className="chart-values">
        <summary>View exact cash movement amounts</summary>
        <div className="table-scroll" tabIndex={0}>
          <table>
            <caption className="sr-only">KES cash movements by month</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Incoming</th>
                <th scope="col">Outgoing</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.month}>
                  <td>{p.month}</td>
                  <td className="money-incoming">
                    {money(p.incomingMinor, "KES")}
                  </td>
                  <td className="money-outgoing">
                    {money(p.outgoingMinor, "KES")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
