import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import {
  createLeaveRequest,
  listLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
} from "../controllers/leaveRequestController";
import { createLeaveRequestSchema } from "../schemas/leaveRequestSchemas";

const router = express.Router();

router.get("/", authMiddleware, authorizeRoles("admin"), listLeaveRequests);
router.post(
  "/",
  authMiddleware,
  authorizeRoles("staff", "admin"),
  validate(createLeaveRequestSchema),
  createLeaveRequest,
);
router.post(
  "/:id/approve",
  authMiddleware,
  authorizeRoles("admin"),
  approveLeaveRequest,
);
router.post(
  "/:id/reject",
  authMiddleware,
  authorizeRoles("admin"),
  rejectLeaveRequest,
);

export default router;
