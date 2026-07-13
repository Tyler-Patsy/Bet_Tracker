import { defineRailway, github, project, service } from "railway/iac";

export default defineRailway(() => {
  const Bet_Tracker = github("Tyler-Patsy/Bet_Tracker", { branch: "main" });

  // Monorepo: build from the repo root (so npm workspaces can resolve
  // @graded/db across apps/web and apps/worker), then target the specific
  // app via --workspace on the build/start commands.
  const worker = service("worker", {
    source: Bet_Tracker,
    build: "npm install",
    start: "npm run start --workspace=apps/worker",
    replicas: 1,
  });
  const web = service("web", {
    source: Bet_Tracker,
    build: "npm install && npm run build --workspace=apps/web",
    start: "npm run start --workspace=apps/web -- -p $PORT",
    healthcheck: "/api/health",
    replicas: 1,
  });

  return project("graded", {
    resources: [worker, web],
  });
});
