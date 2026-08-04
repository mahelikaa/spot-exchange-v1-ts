import express from "express";
import "./src/redis/client.ts";
import { authRouter } from "./src/routes/auth.ts";
import { balanceRouter } from "./src/routes/balances.ts";
import { marketRouter } from "./src/routes/market.ts";
import { orderRouter } from "./src/routes/orders.ts";

const app = express();
app.use(express.json());
app.use(authRouter);
app.use(balanceRouter);
app.use(marketRouter);
app.use(orderRouter);

app.listen(3000);
