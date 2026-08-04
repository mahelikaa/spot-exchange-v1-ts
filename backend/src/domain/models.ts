export type User = { id: string, username: string, password: string };
export type Stock = { id: number; title: string; symbol: string };
export type Side = "buy" | "sell";
export type OrderType = "market" | "limit";
export type OrderStatus = "open" | "partially_filled" | "filled" | "cancelled";
export type Order = {
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

export type Fill = {
    id: string,
    symbol: string,
    price: number,
    qty: number,
    buyOrderId: string,
    sellOrderId: string,
    buyerId: string,
    sellerId: string,
}

export type Balance = { available: number; locked: number };
export type UserBalance = { usd: Balance; stocks: Record<string, Balance> };
export type OrderBook = { bids: Record<number, Order[]>; asks: Record<number, Order[]> };

