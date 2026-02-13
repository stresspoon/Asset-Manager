import express, { type Request, type Response, type NextFunction } from "express";
import { setupRoutes } from "../server/routes";

const app = express();

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

const routesReady = setupRoutes(app);

app.use((req: Request, res: Response, next: NextFunction) => {
  routesReady.then(() => next()).catch(next);
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

export default app;
