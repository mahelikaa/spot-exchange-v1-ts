import { Router } from "express";
import {
    signToken,
} from "../middleware/auth.ts";
import {
    USERS,
    STOCKS,
    BALANCES,
} from "../state.ts";
import type {
    Balance,
} from "../domain/models.ts";

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "username and password required." });
    }

    if (USERS.find((u) => u.username === username)) {
        return res.status(409).json({ error: "username already taken" });
    }

    const id = crypto.randomUUID();
    const passwordHash = await Bun.password.hash(password);

    USERS.push({ id, username, password: passwordHash });

    const stocks: Record<string, Balance> = {};
    for (const s of STOCKS) {
        stocks[s.symbol] = { available: 0, locked: 0 };
    }

    BALANCES[id] = {
        usd: { available: 100000, locked: 0 },
        stocks,
    };

    const token = await signToken(id);
    return res.status(201).json({ userId: id, token });
});

authRouter.post("/signin", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "username and password required." });
    }

    const user = USERS.find((u) => u.username === username);
    const ok = user && (await Bun.password.verify(password, user.password));

    if (!ok) {
        return res.status(401).json({ error: "invalid credentials" });
    }

    const token = await signToken(user.id);
    return res.json({ userId: user.id, token });
});
