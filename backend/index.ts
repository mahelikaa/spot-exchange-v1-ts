import express from "express";
import { SignJWT, jwtVerify } from "jose";
import { createClient } from "redis";

const redisClient = createClient({
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
});

redisClient.on("error", (error) => {
    console.error("Redis error: ", error);
});

await redisClient.connect();

// await redisClient.set("spot:health", "connected");
// const redisStatus = await redisClient.get("spot:health");
// console.log("Redis status: ", redisStatus);

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
type OrderStatus = "open" | "partially_filled" | "filled" | "cancelled";
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
    ORDERBOOKS[s.symbol] = { bids: {}, asks: {} };
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
    for (const s of STOCKS) {
        stocks[s.symbol] = { available: 0, locked: 0 };
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

function settle(
    buyOrder: Order,
    sellOrder: Order,
    tradePrice: number,
    tradeQty: number,
    symbol: string
) {
    const buyerBalance = BALANCES[buyOrder.userId];
    const sellerBalance = BALANCES[sellOrder.userId];

    if (!buyerBalance) {
        throw new Error(`Missing balance for buyer ${buyOrder.userId}`);
    }

    if (!sellerBalance) {
        throw new Error(`Missing balance for seller ${sellOrder.userId}`);
    }

    const buyerStock = buyerBalance.stocks[symbol];
    const sellerStock = sellerBalance.stocks[symbol];

    if (!buyerStock) {
        throw new Error(`Buyer has no ${symbol} balance`);
    }

    if (!sellerStock) {
        throw new Error(`Seller has no ${symbol} balance`);
    }

    if (buyOrder.price === null) {
        throw new Error("Market buy orders are not supported");
    }

    if (tradeQty <= 0) {
        throw new Error("Trade quantity must be positive");
    }

    if (tradePrice <= 0) {
        throw new Error("Trade price must be positive");
    }
    const reservedAmount = buyOrder.price * tradeQty;
    const actualTradeValue = tradePrice * tradeQty;
    const buyerRefund = reservedAmount - actualTradeValue;

    if (buyerRefund < 0) {
        throw new Error(
            `Trade price ${tradePrice} exceeds buyer limit ${buyOrder.price}`
        );
    }

    if (buyerBalance.usd.locked < reservedAmount) {
        throw new Error("Buyer has insufficient locked USD");
    }

    if (sellerStock.locked < tradeQty) {
        throw new Error("Seller has insufficient locked stock");
    }

    buyerBalance.usd.locked -= reservedAmount;
    buyerBalance.usd.available += buyerRefund;
    buyerStock.available += tradeQty;
    sellerStock.locked -= tradeQty;
    sellerBalance.usd.available += actualTradeValue;
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
        const stockBal = balance.stocks[market_id]; //stockBal gets a ptr to the obj
        if (!stockBal) {
            return res.status(400).json({ error: "no balance for this stock." });
        }
        if (stockBal.available < qty) {
            return res.status(400).json({ error: "insufficeint stocks" });
        }

        stockBal.available -= qty;
        stockBal.locked += qty;
    }

    const orderId = crypto.randomUUID();
    const order: Order = {
        id: orderId,
        userId,
        symbol: market_id,
        side,
        type,
        price,
        qty,
        filledQty: 0,
        status: "open"
    }
    let remaining = qty;
    let tradedValue = 0; // summatio of (tradePrice x tradeQty) - for avg price

    const makerSide = side === "buy" ? book.asks : book.bids;
    const prices = Object.keys(makerSide).map(Number).sort((a, b) => (side === "buy" ? a - b : b - a)); //buy is low to high, sell is high to low

    for (const level of prices) {
        if (remaining === 0) break;
        if (side === "buy" && level > price) break;
        if (side === "sell" && level < price) break;

        const queue = makerSide[level];
        if (!queue) continue;

        while (queue.length > 0 && remaining > 0) {
            const maker = queue[0]!;
            const makerRemaining = maker.qty - maker.filledQty;

            const tradeQty = Math.min(remaining, makerRemaining);
            const tradePrice = level; // trade at makeer's price

            const buyOrder = side === "buy" ? order : maker;
            const sellOrder = side === "buy" ? maker : order;

            settle(buyOrder, sellOrder, tradePrice, tradeQty, market_id);

            FILLS.push({
                id: crypto.randomUUID(),
                symbol: market_id,
                price: tradePrice,
                qty: tradeQty,
                buyOrderId: buyOrder.id,
                sellOrderId: sellOrder.id,
                buyerId: buyOrder.userId,
                sellerId: sellOrder.userId,
            });

            order.filledQty += tradeQty;
            maker.filledQty += tradeQty;
            remaining -= tradeQty;
            tradedValue += tradePrice * tradeQty;

            if (maker.filledQty === maker.qty) {
                maker.status = "filled";
                queue.shift();
            } else {
                maker.status = "partially_filled";
            }
        }

        if (queue.length === 0) delete makerSide[level];
    }
    if (order.filledQty === 0) order.status = "open";
    else if (order.filledQty < order.qty) order.status = "partially_filled";
    else order.status = "filled";

    // rest the leftover on OUR side
    if (remaining > 0) {
        const ourSide = side === "buy" ? book.bids : book.asks;
        if (!ourSide[price]) ourSide[price] = [];
        ourSide[price]!.push(order);
    }

    ORDERS.push(order);
    const averagePrice = order.filledQty > 0 ? tradedValue / order.filledQty : 0;
    return res.json({ orderId, filledQty: order.filledQty, averagePrice });
})

app.get("/order/:orderId", requireAuth, (req: any, res) => {
    const orderId = req.params.orderId;
    const userId = req.userId;
    const order = ORDERS.find((order) => order.id === orderId && order.userId === userId);

    if (!order) {
        return res.status(404).json({
            error: "order not found",
        });
    }

    return res.json(order);
});

app.delete("/order/:orderId", requireAuth, (req: any, res) => {
    const userId = req.userId;
    const orderId = req.params.orderId;

    const order = ORDERS.find(
        (order) => order.id === orderId && order.userId === userId
    );

    if (!order) {
        return res.status(404).json({
            error: "order not found",
        });
    }

    if (order.status === "filled" || order.status === "cancelled") {
        return res.status(400).json({
            error: "order cannot be cancelled",
        });
    }

    const book = ORDERBOOKS[order.symbol];
    const balance = BALANCES[userId];

    if (!book || !balance || order.price === null) {
        return res.status(500).json({
            error: "invalid order state",
        });
    }

    const remainingQty = order.qty - order.filledQty;
    const side = order.side === "buy" ? book.bids : book.asks;
    const queue = side[order.price];

    const orderIndex =
        queue?.findIndex(
            (queuedOrder) => queuedOrder.id === order.id
        ) ?? -1;

    if (!queue || orderIndex === -1) {
        return res.status(500).json({
            error: "order is missing from order book",
        });
    }

    if (order.side === "buy") {
        const unlockAmount = order.price * remainingQty;

        if (balance.usd.locked < unlockAmount) {
            return res.status(500).json({
                error: "insufficient locked USD",
            });
        }

        balance.usd.locked -= unlockAmount;
        balance.usd.available += unlockAmount;
    } else {
        const stockBalance = balance.stocks[order.symbol];

        if (!stockBalance || stockBalance.locked < remainingQty) {
            return res.status(500).json({
                error: "insufficient locked stock",
            });
        }

        stockBalance.locked -= remainingQty;
        stockBalance.available += remainingQty;
    }

    queue.splice(orderIndex, 1);

    if (queue.length === 0) {
        delete side[order.price];
    }

    order.status = "cancelled";

    return res.json({
        orderId: order.id,
        status: order.status,
        cancelledQty: remainingQty,
    });
});

app.get("/depth/:symbol", (req, res) => {
    const symbol = req.params.symbol;
    const book = ORDERBOOKS[symbol];

    if (!book) {
        return res.status(404).json({
            error: "market not found",
        });
    }

    const bids = Object.entries(book.bids)
        .map(([price, orders]) => {
            const qty = orders.reduce(
                (total, order) =>
                    total + (order.qty - order.filledQty),
                0
            );

            return {
                price: Number(price),
                qty,
            };
        })
        .sort((a, b) => b.price - a.price);

    const asks = Object.entries(book.asks)
        .map(([price, orders]) => {
            const qty = orders.reduce(
                (total, order) =>
                    total + (order.qty - order.filledQty),
                0
            );

            return {
                price: Number(price),
                qty,
            };
        })
        .sort((a, b) => a.price - b.price);

    return res.json({
        symbol,
        bids,
        asks,
    });
});


app.get("/orders", requireAuth, (req: any, res) => {
    const userId = req.userId;
    const userOrders = ORDERS.filter((order) => order.userId === userId);
    return res.json(userOrders);
});

app.get("/fills", requireAuth, (req: any, res) => {
    const userId = req.userId;
    const fills = FILLS.filter((fill) => fill.buyerId === userId || fill.sellerId === userId);

    return res.json(fills);
});


app.get("/balance/usd", requireAuth, (req: any, res) => {
    const userId = req.userId;
    const balance = BALANCES[userId];

    if (!balance) {
        return res.status(404).json({
            error: "balance not found",
        });
    }

    return res.json(balance.usd);

});

app.get("/balance", requireAuth, (req: any, res) => {
    const userId = req.userId;
    const balance = BALANCES[userId];
    if (!balance) {
        return res.status(404).json({
            error: "balance not found",
        });
    }

    return res.json(balance);
});


app.listen(3000);