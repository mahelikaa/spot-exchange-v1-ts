use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Side {
    Buy,
    Sell,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OrderType {
    Limit,
    Market,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OrderStatus {
    Open,
    PartiallyFilled,
    Filled,
    Cancelled,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Order {
    pub id: Uuid,
    pub user_id: Uuid,
    pub symbol: String,
    pub side: Side,
    #[serde(rename = "type")]
    pub order_type: OrderType,
    pub price: Option<u64>,
    pub qty: u64,
    pub filled_qty: u64,
    pub status: OrderStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Fill {
    pub id: Uuid,
    pub symbol: String,
    pub price: u64,
    pub qty: u64,
    pub buy_order_id: Uuid,
    pub sell_order_id: Uuid,
    pub buyer_id: Uuid,
    pub seller_id: Uuid,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Balance {
    pub available: u64,
    pub locked: u64,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserBalance {
    pub usd: Balance,
    pub stocks: HashMap<String, Balance>,
}

impl Order {
    pub fn remaining_qty(&self) -> u64 {
        self.qty - self.filled_qty
    }
}
