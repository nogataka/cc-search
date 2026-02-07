import { hc } from "hono/client";
import type { RouteType } from "../../server/hono/route";

export const honoClient = hc<RouteType>(
  typeof window === "undefined"
    ? `http://localhost:${process.env["PORT"] ?? 5858}/`
    : "/",
);
