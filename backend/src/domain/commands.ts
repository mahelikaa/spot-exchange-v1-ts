import type {
    Side,
    OrderType,
} from "./models.ts";

export type PlaceOrderCommand = {
    version: 1;
    type: "PLACE_ORDER";
    requestId: string;
    timestamp: string;
    payload: {
        orderId: string;
        userId: string;
        symbol: string;
        side: Side;
        orderType: OrderType;
        price: number | null;
        qty: number;
    };
};

export type CancelOrderCommand = {
    version: 1;
    type: "CANCEL_ORDER";
    requestId: string;
    timestamp: string;
    payload: {
        orderId: string;
        userId: string;
    };
};

export type DepositAssetCommand = {
    version: 1;
    type: "DEPOSIT_ASSET";
    requestId: string;
    timestamp: string;
    payload: {
        userId: string;
        asset: string;
        amount: number;
    };
};

export type EngineCommand =
    | PlaceOrderCommand
    | CancelOrderCommand
    | DepositAssetCommand;
