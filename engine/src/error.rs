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
}

pub type EngineResult<T> = Result<T, EngineError>;
