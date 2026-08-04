import { Router } from "express";
import {
    requireAuth,
} from "../middleware/auth.ts";
import {
    BALANCES,
} from "../state.ts";

export const balanceRouter = Router();

balanceRouter.get("/balance/usd", requireAuth, (req: any, res) => {
    const userId = req.userId;
    const balance = BALANCES[userId];

    if (!balance) {
        return res.status(404).json({
            error: "balance not found",
        });
    }
    return res.json(balance.usd);
});

balanceRouter.get("/balance", requireAuth, (req: any, res) => {
    const userId = req.userId;
    const balance = BALANCES[userId];
    if (!balance) {
        return res.status(404).json({
            error: "balance not found",
        });
    }
    return res.json(balance);
});