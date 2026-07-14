import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { db, capperStats, cappers } from "@graded/db";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const WINDOW_LABELS: Record<string, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  season: "This season",
  all: "All time",
};

function fmtUnits(n: string | null): string {
  const v = Number(n ?? 0);
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}u`;
}

// 1200x630 shareable leaderboard card (§14). Doubles as the OG image for
// link previews; Tyler also posts it to social manually each morning.
export async function GET(request: NextRequest) {
  const windowParam = request.nextUrl.searchParams.get("window") ?? "30d";
  const window = windowParam in WINDOW_LABELS ? windowParam : "30d";

  const rows = await db
    .select({
      displayName: cappers.displayName,
      wins: capperStats.wins,
      losses: capperStats.losses,
      pushes: capperStats.pushes,
      unitsNet: capperStats.unitsNet,
      gradedPicks: capperStats.gradedPicks,
    })
    .from(capperStats)
    .innerJoin(cappers, eq(capperStats.capperId, cappers.id))
    .where(and(eq(capperStats.window, window), eq(capperStats.sport, "all"), eq(cappers.isActive, true)))
    .orderBy(desc(capperStats.unitsNet))
    .limit(10);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0a0a0a",
          color: "#f5f5f5",
          padding: "48px 56px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ display: "flex", fontSize: 48, fontWeight: 700 }}>GRADED</div>
          <div style={{ display: "flex", fontSize: 24, color: "#a3a3a3" }}>
            {WINDOW_LABELS[window]} · {today}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 20, color: "#737373", marginTop: 4 }}>
          Every pick tracked. Every deletion counted.
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 32, flex: 1 }}>
          {rows.length === 0 && (
            <div style={{ display: "flex", fontSize: 28, color: "#737373", marginTop: 40 }}>
              Records are building — check back soon.
            </div>
          )}
          {rows.map((r, i) => {
            const units = Number(r.unitsNet ?? 0);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: i < rows.length - 1 ? "1px solid #262626" : "none",
                  fontSize: 26,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ display: "flex", width: 40, color: "#737373" }}>{i + 1}</div>
                  <div style={{ display: "flex", fontWeight: 600 }}>{r.displayName}</div>
                  <div style={{ display: "flex", color: "#737373", fontSize: 22 }}>
                    {r.wins}-{r.losses}-{r.pushes}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    fontWeight: 700,
                    color: units > 0 ? "#4ade80" : units < 0 ? "#f87171" : "#a3a3a3",
                  }}
                >
                  {fmtUnits(r.unitsNet)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
