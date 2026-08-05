use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::{OrderType, Side};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaceOrderPayload {
    pub order_id: Uuid,
    pub user_id: Uuid,
    pub symbol: String,
    pub side: Side,
    pub order_type: OrderType,
    pub price: Option<u64>,
    pub qty: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelOrderPayload {
    pub order_id: Uuid,
    pub user_id: Uuid,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DepositAssetPayload {
    pub user_id: Uuid,
    pub asset: String,
    pub amount: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")] //the enum variant is selected using the JSON type field.
pub enum EngineCommand {
    #[serde(rename = "PLACE_ORDER")]
    PlaceOrder {
        version: u8,

        #[serde(rename = "requestId")]
        request_id: Uuid,

        timestamp: String,
        payload: PlaceOrderPayload,
    },
    #[serde(rename = "CANCEL_ORDER")]
    CancelOrder {
        version: u8,

        #[serde(rename = "requestId")]
        request_id: Uuid,

        timestamp: String,
        payload: CancelOrderPayload,
    },
    #[serde(rename = "DEPOSIT_ASSET")]
    DepositAsset {
        version: u8,

        #[serde(rename = "requestId")]
        request_id: Uuid,

        timestamp: String,
        payload: DepositAssetPayload,
    },
}
