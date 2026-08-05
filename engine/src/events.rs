use crate::models::{Fill, Order, UserBalance};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventMetadata {
    pub version: u8,
    pub event_id: Uuid,
    pub request_id: Uuid,
    pub timestamp: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OrderAcceptedPayload {
    pub order: Order,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderRejectedPayload {
    pub order_id: Uuid,
    pub user_id: Uuid,
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OrderFilledPayload {
    pub fill: Fill,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderCancelledPayload {
    pub order_id: Uuid,
    pub user_id: Uuid,
    pub cancelled_qty: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DepthLevel {
    pub price: u64,
    pub qty: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DepthUpdatedPayload {
    pub symbol: String,
    pub bids: Vec<DepthLevel>,
    pub asks: Vec<DepthLevel>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BalanceUpdatedPayload {
    pub user_id: Uuid,
    pub balance: UserBalance,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")] //uses the JSON type field to select an enum variant
pub enum EngineEvent {
    #[serde(rename = "ORDER_ACCEPTED")]
    OrderAccepted {
        #[serde(flatten)]
        metadata: EventMetadata,
        payload: OrderAcceptedPayload,
    },
    #[serde(rename = "ORDER_REJECTED")]
    OrderRejected {
        #[serde(flatten)]
        metadata: EventMetadata,
        payload: OrderRejectedPayload,
    },
    #[serde(rename = "ORDER_FILLED")]
    OrderFilled {
        #[serde(flatten)]
        metadata: EventMetadata,
        payload: OrderFilledPayload,
    },
    #[serde(rename = "ORDER_CANCELLED")]
    OrderCancelled {
        #[serde(flatten)]
        metadata: EventMetadata,
        payload: OrderCancelledPayload,
    },
    #[serde(rename = "DEPTH_UPDATED")]
    DepthUpdated {
        #[serde(flatten)]
        metadata: EventMetadata,
        payload: DepthUpdatedPayload,
    },
    #[serde(rename = "BALANCE_UPDATED")]
    BalanceUpdated {
        #[serde(flatten)]
        metadata: EventMetadata,
        payload: BalanceUpdatedPayload,
    },
}
