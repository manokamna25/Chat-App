import express from "express";
import { protectroute } from "../middleware/auth.middleware.js";
import { getAIResponse, summarizeCall } from "../controllers/ai.controller.js";

const router = express.Router();

router.post("/chat", protectroute, getAIResponse);
router.post("/summarize-call", protectroute, summarizeCall);

export default router;
