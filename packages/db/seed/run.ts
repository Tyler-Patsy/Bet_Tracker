import { db, teamAliases } from "../src/index";
import { TEAM_ALIASES } from "./team-aliases-data";

async function main() {
  let inserted = 0;
  for (const team of TEAM_ALIASES) {
    for (const alias of team.aliases) {
      await db
        .insert(teamAliases)
        .values({ league: team.league, canonicalName: team.canonical, alias })
        .onConflictDoNothing();
      inserted++;
    }
  }
  console.log(`seeded ${inserted} team alias rows`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
