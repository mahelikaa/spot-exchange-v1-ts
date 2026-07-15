import express from "express";
import { SignJWT, jwtVerify } from "jose";

const app = express();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
app.use(express.json());


async function signToken(userId: string) {
    return await new SignJWT({ userId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(JWT_SECRET);
}

type User = { id: string, username: string, password: string };
const USERS: User[] = [];

type Stock = { id: number; title: string; symbol: string };
const STOCKS: Stock[] = [
    { id: 1, title: "AXIS BANK", symbol: "AXIS" },
    { id: 2, title: "HDFC BANK", symbol: "HDFC" },
    { id: 3, title: "TATA Steel", symbol: "TATA" },
];

type Side = "buy" | "sell";
type OrderType = "market" | "limit";
type OrderStatus = "open" | "partially_filled" | "filled";
type Order = {
    id: string,
    userId: string,
    symbol: string,
    side: Side,
    type: OrderType,
    price: number | null, //null for market order.
    qty: number, // amount requested.
    filledQty: number, //amount matched so far
    status: OrderStatus,
}
const ORDERS: Order[] = [];

type Fill = {
    id: string,
    symbol: string,
    price: number,
    qty: number,
    buyOrderId: string,
    sellOrderId: string,
    buyerId: string,
    sellerId: string,
}
const FILLS: Fill[] = [];

type Balance = { available: number; locked: number };
type UserBalance = { usd: Balance; stocks: Record<string, Balance> };
const BALANCES: Record<string, UserBalance> = {};


type OrderBook = { bids: Record<number, Order[]>; asks: Record<number, Order[]> };
const ORDERBOOKS: Record<string, OrderBook> = {};
for (const s of STOCKS) {
    ORDERBOOKS[s.symbol] = {bids: {}, asks: {}};
}

app.post("/signup", async (req, res) => {
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
    for (const s of STOCKS){
        stocks[s.symbol] = {available: 0, locked: 0};
    }

    BALANCES[id] = {
        usd: { available: 100000, locked: 0 },
        stocks,
    };

    const token = await signToken(id);
    return res.status(201).json({ userId: id, token });
})

app.post("/signin", async (req, res) => {
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

async function requireAuth(req: any, res: any, next: any) {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: "missing token" });
    }
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        (req as any).userId = payload.userId as string;
        next();
    } catch {
        return res.status(401).json({ error: "invalid or expired token" });
    }
}

function settle (buyOrder: Order, sellOrder: Order, tradePrice: number, tradeQty: number, symbol: string){
}

app.post("/order", requireAuth, (req: any, res) => {
    const userId = req.userId;
    const { type, price, side, market_id, qty } = req.body;

    if (side != "buy" && side != "sell") {
        return res.status(400).json({ error: "side must be buy or sell" });
    }

    if (type != "limit") {
        return res.status(400).json({ error: "only limit orders for now." });
    }

    if (!Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({ error: "qty must be a posiive integer." });
    }

    if (!Number.isInteger(price) || price <= 0) {
        return res.status(400).json({ error: "price must be a positive integer" });
    }

    const book = ORDERBOOKS[market_id];

    if (!book) {
        return res.status(400).json({ error: "unknown market id." });
    }

    const balance = BALANCES[userId];
    if (!balance) {
        return res.status(401).json({ error: "unknown user" });
    }

    if (side === "buy") {
        const cost = price * qty;

        if (balance.usd.available < cost) {
            return res.status(400).json({ error: "insufficient usd." });
        }

        balance.usd.available -= cost;
        balance.usd.locked += cost;
    }

    if (side === "sell") {
        const stockBal = balance.stocks[market_id];
        if (!stockBal) {
            return res.status(400).json({ error: "no balance for this stock." });
        }
        if (stockBal.available < qty) {
            return res.status(400).json({ error: "insufficeint stocks" });
        }

        stockBal.available -= qty;
        stockBal.locked += qty;
    }
})

app.get("/order/:orderId", (req, res) => res.status(501).json({ error: "not implemented" }));
app.delete("/order/:orderId", (req, res) => res.status(501).json({ error: "not implemented" }));
app.get("/depth/:symbol", (req, res) => res.status(501).json({ error: "not implemented" }));
app.get("/orders", (req, res) => res.status(501).json({ error: "not implemented" }));
app.get("/fills", (req, res) => res.status(501).json({ error: "not implemented" }));
app.get("/balance/usd", (req, res) => res.status(501).json({ error: "not implemented" }));
app.get("/balance", (req, res) => res.status(501).json({ error: "not implemented" }));


app.listen(3000);