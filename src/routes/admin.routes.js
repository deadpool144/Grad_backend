import { Router } from "express";
import * as admin from "../controllers/admin.controller.js";
import { protect, isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(protect, isAdmin);

router.get("/stats",       admin.getStats);
router.get("/users",       admin.getAllUsers);
router.put("/users/:id",   admin.updateUserRole);
router.delete("/posts/:id",  admin.deleteAnyPost);
router.delete("/events/:id", admin.deleteAnyEvent);

export default router;
