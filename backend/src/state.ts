import type {
    User,
    Stock,
    Order,
    Fill,
    UserBalance,
    OrderBook,
} from "./domain/models.ts";

export const USERS: User[] = [];
export const STOCKS: Stock[] = [
    { id: 1, title: "AXIS BANK", symbol: "AXIS" },
    { id: 2, title: "HDFC BANK", symbol: "HDFC" },
    { id: 3, title: "TATA Steel", symbol: "TATA" },
];
export const ORDERS: Order[] = [];
export const FILLS: Fill[] = [];
export const BALANCES: Record<string, UserBalance> = {};
export const ORDERBOOKS: Record<string, OrderBook> = {};
for (const s of STOCKS) {
    ORDERBOOKS[s.symbol] = { bids: {}, asks: {} };
}
