import { defineSchedule } from "eve/schedules";
import { processNextPlatformRun } from "../run-platform-scan";

export default defineSchedule({
  cron: "*/1 * * * *",
  run({ waitUntil }) {
    waitUntil(processNextPlatformRun());
  },
});
