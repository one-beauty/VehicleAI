import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { agentRouter } from "./routers/agent";
import { memoryRouter } from "./routers/memory";
import { ragRouter } from "./routers/rag";
import { gatewayRouter } from "./routers/gateway";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Vehicle AI Voice Gateway & RAG System Routers
  agent: agentRouter,
  memory: memoryRouter,
  rag: ragRouter,
  gateway: gatewayRouter,
});

export type AppRouter = typeof appRouter;
