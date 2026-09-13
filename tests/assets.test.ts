import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CARRACK_GEAR_SETS, GEAR_SETS, MATERIALS } from "@/lib/data";

const standaloneImages = [
  "/assets/epheria-caravel.png",
  "/assets/items/ravencoin.png",
];

function publicPath(src: string) {
  return join(process.cwd(), "public", src.replace(/^\//, ""));
}

describe("local image assets", () => {
  it("keeps every planner image available and non-empty", () => {
    const gearImages = Object.values(GEAR_SETS).flatMap((gearSet) =>
      Object.values(gearSet).flatMap((gear) => [gear.icon, gear.baseIcon]),
    );
    const carrackGearImages = Object.values(CARRACK_GEAR_SETS).flatMap((gearSet) =>
      Object.values(gearSet).flatMap((gear) => [gear.icon, gear.baseIcon]),
    );
    const sources = [...standaloneImages, ...MATERIALS.map((material) => material.icon), ...gearImages, ...carrackGearImages];

    for (const src of new Set(sources)) {
      const path = publicPath(src);
      expect(existsSync(path), `${src} should exist in public`).toBe(true);
      expect(statSync(path).size, `${src} should not be empty`).toBeGreaterThan(0);
    }
  });
});
