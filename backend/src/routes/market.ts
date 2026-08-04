import { Router } from "express";
import {
    ORDERBOOKS,
} from "../state.ts";

export const marketRouter = Router();
marketRouter.get("/depth/:symbol", (req, res) => {
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

