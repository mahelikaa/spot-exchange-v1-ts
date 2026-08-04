import express from "express";
import "./redis/client.ts";
import { authRouter } from "./routes/auth.ts";
import { balanceRouter } from "./routes/balances.ts";
import { marketRouter } from "./routes/market.ts";
import { orderRouter } from "./routes/orders.ts";

const app = express();
app.use(express.json());
app.use(authRouter);
app.use(balanceRouter);
app.use(marketRouter);
app.use(orderRouter);

app.listen(3000);
