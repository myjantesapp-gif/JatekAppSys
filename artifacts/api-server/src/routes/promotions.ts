import { Router, type IRouter } from "express";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

/**
 * GET /api/promotions
 * Returns active driver promotions. Currently returns an empty array until
 * a promotions table is added to the database schema.
 */
router.get("/promotions", requireAuth, async (_req: AuthedRequest, res): Promise<void> => {
  // TODO: query promotions table when it exists.
  // Return empty array in correct shape so the driver app renders gracefully.
  res.json([]);
});

export default router;
