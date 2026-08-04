import type {
    Order,
    Fill,
    UserBalance,
} from "./models.ts";

type EventMetadata = {
    version: 1;
    eventId: string;
    requestId: string;
    timestamp: string;
};

export type OrderAcceptedEvent = EventMetadata & {
    type: "ORDER_ACCEPTED";
    payload: {
        order: Order;
    };
};

export type OrderRejectedEvent = EventMetadata & {
    type: "ORDER_REJECTED";
    payload: {
        orderId: string;
        userId: string;
        code: string;
        message: string;
    };
};

export type OrderFilledEvent = EventMetadata & {
    type: "ORDER_FILLED";
    payload: {
        fill: Fill;
    };
};

export type OrderCancelledEvent = EventMetadata & {
    type: "ORDER_CANCELLED";
    payload: {
        orderId: string;
        userId: string;
        cancelledQty: number;
    };
};

export type DepthLevel = {
    price: number;
    qty: number;
};

export type DepthUpdatedEvent = EventMetadata & {
    type: "DEPTH_UPDATED";
    payload: {
        symbol: string;
        bids: DepthLevel[];
        asks: DepthLevel[];
    };
};

export type BalanceUpdatedEvent = EventMetadata & {
    type: "BALANCE_UPDATED";
    payload: {
        userId: string;
        balance: UserBalance;
    };
};

export type EngineEvent =
    | OrderAcceptedEvent
    | OrderRejectedEvent
    | OrderFilledEvent
    | OrderCancelledEvent
    | DepthUpdatedEvent
    | BalanceUpdatedEvent;
