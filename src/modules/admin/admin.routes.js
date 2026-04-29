import { Router } from "express";
import * as admin from "./admin.controller.js";
import { protect, loadUser, isAdmin } from "../../middlewares/auth.middleware.js";

const router = Router();

// All admin routes require auth + full user load + admin role check
router.use(protect, loadUser, isAdmin);

router.get("/stats",                 admin.getStats);
router.get("/users",                 admin.getAllUsers);
router.patch("/users/:id/role",      admin.updateUserRole);
router.patch("/users/:id/toggle-block", admin.toggleBlockUser);
router.delete("/users/:id",          admin.deleteAnyUser);
router.delete("/posts/:id",          admin.deleteAnyPost);
router.delete("/events/:id",         admin.deleteAnyEvent);

export default router;
