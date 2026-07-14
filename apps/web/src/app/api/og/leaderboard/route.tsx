import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { db, capperStats, cappers } from "@graded/db";
import { and, desc, eq } from "drizzle-orm";
import { gradeFor } from "@/lib/grade";

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

function gradeColor(grade: string | null): string {
  if (grade === null) return "#737373";
  if (grade.startsWith("A")) return "#4ade80";
  if (grade === "B") return "#e5e5e5";
  if (grade === "C") return "#a3a3a3";
  return "#f87171";
}

// Satori needs raw font data. Fetch fonts once per process via the Google
// Fonts CSS API — an old-browser UA makes it serve WOFF/TTF, which satori
// accepts (it can't parse woff2). Falls back to system sans if anything fails.
const fontCache = new Map<string, Promise<ArrayBuffer | null>>();
function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  const key = `${family}:${weight}`;
  if (!fontCache.has(key)) {
    fontCache.set(
      key,
      (async () => {
        try {
          const css = await fetch(
            `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`,
            { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; rv:10.0) Gecko/20100101 Firefox/10.0" } }
          ).then((r) => r.text());
          const url = css.match(/src:\s*url\((https:[^)]+)\)\s*format\(['"](?:truetype|opentype|woff)['"]\)/)?.[1];
          if (!url) return null;
          return await fetch(url).then((r) => r.arrayBuffer());
        } catch {
          return null;
        }
      })()
    );
  }
  return fontCache.get(key)!;
}

// 1200x630 shareable leaderboard card (§14). Doubles as the OG image for
// link previews; Tyler also posts it to social manually each morning.
export async function GET(request: NextRequest) {
  const windowParam = request.nextUrl.searchParams.get("window") ?? "30d";
  const window = windowParam in WINDOW_LABELS ? windowParam : "30d";

  const [rows, displayFont, bodyFont] = await Promise.all([
    db
      .select({
        displayName: cappers.displayName,
        wins: capperStats.wins,
        losses: capperStats.losses,
        pushes: capperStats.pushes,
        unitsNet: capperStats.unitsNet,
        roi: capperStats.roi,
        gradedPicks: capperStats.gradedPicks,
        deletedPicks: capperStats.deletedPicks,
      })
      .from(capperStats)
      .innerJoin(cappers, eq(capperStats.capperId, cappers.id))
      .where(and(eq(capperStats.window, window), eq(capperStats.sport, "all"), eq(cappers.isActive, true)))
      .orderBy(desc(capperStats.unitsNet))
      .limit(8),
    loadGoogleFont("Barlow Condensed", 700),
    loadGoogleFont("Geist", 400),
  ]);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });

  const display = displayFont ? "Barlow Condensed" : "sans-serif";
  const body = bodyFont ? "Geist" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0a0a0a",
          color: "#ededed",
          padding: "48px 56px",
          fontFamily: body,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ display: "flex", fontSize: 56, fontFamily: display, fontWeight: 700 }}>
            GRADED<span style={{ color: "#fbbf24" }}>.</span>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#a3a3a3" }}>
            {WINDOW_LABELS[window]} · {today}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 20, color: "#737373", marginTop: 2 }}>
          Every pick tracked. Every deletion counted.
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 30, flex: 1 }}>
          {rows.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 30,
                border: "1px solid #262626",
                padding: "32px 36px",
              }}
            >
              <div style={{ display: "flex", fontSize: 44, fontFamily: display, fontWeight: 700 }}>
                RECORDS ARE BUILDING.
              </div>
              <div style={{ display: "flex", fontSize: 22, color: "#a3a3a3", marginTop: 10 }}>
                No seed data — every number is computed from archived, timestamped posts.
              </div>
            </div>
          )}
          {rows.map((r, i) => {
            const units = Number(r.unitsNet ?? 0);
            const grade = gradeFor(r.roi, r.gradedPicks);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "9px 0",
                  borderBottom: i < rows.length - 1 ? "1px solid #262626" : "none",
                  fontSize: 27,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div style={{ display: "flex", width: 36, color: "#737373" }}>{i + 1}</div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 40,
                      height: 40,
                      border: `1px solid ${gradeColor(grade)}`,
                      color: gradeColor(grade),
                      fontFamily: display,
                      fontWeight: 700,
                      fontSize: 24,
                    }}
                  >
                    {grade ?? "–"}
                  </div>
                  <div style={{ display: "flex", fontWeight: 600 }}>{r.displayName}</div>
                  <div style={{ display: "flex", color: "#737373", fontSize: 23 }}>
                    {r.wins}-{r.losses}-{r.pushes}
                  </div>
                  {(r.deletedPicks ?? 0) > 0 && (
                    <div style={{ display: "flex", color: "#fbbf24", fontSize: 20 }}>
                      ⚠ {r.deletedPicks}
                    </div>
                  )}
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

        <div style={{ display: "flex", fontSize: 18, color: "#525252" }}>
          The public record for sports picks
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        ...(displayFont
          ? [{ name: "Barlow Condensed", data: displayFont, weight: 700 as const, style: "normal" as const }]
          : []),
        ...(bodyFont
          ? [{ name: "Geist", data: bodyFont, weight: 400 as const, style: "normal" as const }]
          : []),
      ],
    }
  );
}
