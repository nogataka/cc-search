import { zValidator } from "@hono/zod-validator";
import { setCookie } from "hono/cookie";
import { z } from "zod";
import { configSchema } from "../config/config";
import { getClaudeCodeProject } from "../service/claude-code/getProject";
import { getClaudeCodeProjects } from "../service/claude-code/getProjects";
import { getClaudeCodeSession } from "../service/claude-code/getSession";
import { getClaudeCodeSessions } from "../service/claude-code/getSessions";
import { getProject } from "../service/project/getProject";
import { getProjects } from "../service/project/getProjects";
import { search } from "../service/search/searchService";
import { getSession } from "../service/session/getSession";
import { getSessions } from "../service/session/getSessions";
import type { HonoAppType } from "./app";
import { configMiddleware } from "./middleware/config.middleware";

export const routes = (app: HonoAppType) => {
  return (
    app
      // middleware
      .use(configMiddleware)

      // routes
      .get("/config", async (c) => {
        return c.json({
          config: c.get("config"),
        });
      })

      .put("/config", zValidator("json", configSchema), async (c) => {
        const { ...config } = c.req.valid("json");

        setCookie(c, "ccv-config", JSON.stringify(config));

        return c.json({
          config,
        });
      })

      // Codex projects
      .get("/codex/projects", async (c) => {
        const { projects } = await getProjects();
        return c.json({ projects });
      })

      .get("/codex/projects/:projectId", async (c) => {
        const { projectId } = c.req.param();

        const [{ project }, { sessions }] = await Promise.all([
          getProject(projectId),
          getSessions(projectId).then(({ sessions }) => {
            let filteredSessions = sessions;

            // Filter sessions based on hideNoUserMessageSession setting
            if (c.get("config").hideNoUserMessageSession) {
              filteredSessions = filteredSessions.filter((session) => {
                return session.meta.firstCommand !== null;
              });
            }

            // Unify sessions with same title if unifySameTitleSession is enabled
            if (c.get("config").unifySameTitleSession) {
              const sessionMap = new Map<
                string,
                (typeof filteredSessions)[0]
              >();

              for (const session of filteredSessions) {
                // Generate title for comparison
                const title =
                  session.meta.firstCommand !== null
                    ? (() => {
                        const cmd = session.meta.firstCommand;
                        switch (cmd.kind) {
                          case "command":
                            return cmd.commandArgs === undefined
                              ? cmd.commandName
                              : `${cmd.commandName} ${cmd.commandArgs}`;
                          case "local-command":
                            return cmd.stdout;
                          case "text":
                            return cmd.content;
                          default:
                            return session.id;
                        }
                      })()
                    : session.id;

                const existingSession = sessionMap.get(title);
                if (existingSession) {
                  // Keep the session with the latest modification date
                  if (
                    session.meta.lastModifiedAt &&
                    existingSession.meta.lastModifiedAt
                  ) {
                    if (
                      new Date(session.meta.lastModifiedAt) >
                      new Date(existingSession.meta.lastModifiedAt)
                    ) {
                      sessionMap.set(title, session);
                    }
                  } else if (
                    session.meta.lastModifiedAt &&
                    !existingSession.meta.lastModifiedAt
                  ) {
                    sessionMap.set(title, session);
                  }
                } else {
                  sessionMap.set(title, session);
                }
              }

              filteredSessions = Array.from(sessionMap.values());
            }

            return {
              sessions: filteredSessions,
            };
          }),
        ] as const);

        return c.json({ project, sessions });
      })

      .get("/codex/projects/:projectId/sessions/:sessionId", async (c) => {
        const { projectId, sessionId } = c.req.param();
        const { session } = await getSession(projectId, sessionId);
        return c.json({ session });
      })

      // Claude Code projects
      .get("/claude-code/projects", async (c) => {
        const { projects } = await getClaudeCodeProjects();
        return c.json({ projects });
      })

      .get("/claude-code/projects/:projectId", async (c) => {
        const { projectId } = c.req.param();

        const [{ project }, { sessions }] = await Promise.all([
          getClaudeCodeProject(projectId),
          getClaudeCodeSessions(projectId),
        ] as const);

        return c.json({ project, sessions });
      })

      .get(
        "/claude-code/projects/:projectId/sessions/:sessionId",
        async (c) => {
          const { projectId, sessionId } = c.req.param();
          const { session } = await getClaudeCodeSession(projectId, sessionId);
          return c.json({ session });
        },
      )

      // Search endpoint
      .post(
        "/search",
        zValidator(
          "json",
          z.object({
            query: z.string().min(1),
            sources: z.array(z.enum(["codex", "claude-code"])),
            limit: z.number().optional().default(50),
            offset: z.number().optional().default(0),
          }),
        ),
        async (c) => {
          const { query, sources, limit, offset } = c.req.valid("json");

          const { results, total } = await search({
            query,
            sources,
            limit,
            offset,
          });

          return c.json({
            results,
            total,
            query,
            sources,
            limit,
            offset,
          });
        },
      )
  );
};

export type RouteType = ReturnType<typeof routes>;
