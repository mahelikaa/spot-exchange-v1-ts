use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum EngineError {
    #[error("unsupported command version: {0}")]
    UnsupportedVersion(u8),

    #[error("unknown market: {0}")]
    UnknownMarket(String),

    #[error("market orders are not supported")]
    UnsupportedOrderType,

    #[error("quantity must be greater than zero")]
    InvalidQuantity,

    #[error("price must be greater than zero")]
    InvalidPrice,

    #[error("deposit amount must be greater than zero")]
    InvalidAmount,

    #[error("balance arithmetic overflow")]
    ArithmeticOverflow,

    #[error("user balance not found")]
    BalanceNotFound,

    #[error("insufficient available USD")]
    InsufficientUsd,

    #[error("insufficient available stock: {0}")]
    InsufficientStock(String),

    #[error("insufficient locked balance")]
    InsufficientLockedBalance,
}

pub type EngineResult<T> = Result<T, EngineError>;
