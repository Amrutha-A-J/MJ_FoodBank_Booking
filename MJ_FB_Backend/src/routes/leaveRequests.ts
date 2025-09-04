import express from "express";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware";
import {
  createLeaveRequest,
  listLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
} from "../controllers/leaveRequestController";

const router = express.Router();

router.get("/", authMiddleware, authorizeRoles("admin"), listLeaveRequests);
router.post("/", authMiddleware, authorizeRoles("staff", "admin"), createLeaveRequest);
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
