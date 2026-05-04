import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { serveStatic, setupVite } from "../server/_core/vite";

const app = express();
const server = createServer(app);

// Configure body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// OAuth callback
registerOAuthRoutes(app);

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Fallback for tRPC in serverless
app.use(
  "/api",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// development mode uses Vite, production mode uses static files
if (process.env.NODE_ENV === "development") {
  setupVite(app, server).catch(console.error);
} else {
  serveStatic(app);
}

// For Vercel
export default app;

// Only start the server if not running in a serverless environment
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  async function isPortAvailable(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      server.on("error", () => resolve(false));
    });
  }

  async function findAvailablePort(startPort: number = 3000): Promise<number> {
    for (let port = startPort; port < startPort + 20; port++) {
      if (await isPortAvailable(port)) {
        return port;
      }
    }
    return startPort;
  }

  async function start() {
    const preferredPort = parseInt(process.env.PORT || "3000");
    const port = await findAvailablePort(preferredPort);
    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}/`);
    });
  }

  start().catch(console.error);
}
