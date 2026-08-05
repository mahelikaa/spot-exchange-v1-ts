use crate::error::{EngineError, EngineResult};
use crate::models::UserBalance;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Default)]
pub struct BalanceStore {
    balances: HashMap<Uuid, UserBalance>,
}

impl BalanceStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get(&self, user_id: &Uuid) -> Option<&UserBalance> {
        self.balances.get(user_id)
    }

    pub fn deposit(&mut self, user_id: Uuid, asset: &str, amount: u64) -> EngineResult<()> {
        if amount == 0 {
            return Err(EngineError::InvalidAmount);
        }

        let asset = asset.to_uppercase();
        let user_balance = self.balances.entry(user_id).or_default();

        let balance = if asset == "USD" {
            &mut user_balance.usd
        } else {
            user_balance.stocks.entry(asset).or_default()
        };

        balance.available = balance
            .available
            .checked_add(amount)
            .ok_or(EngineError::ArithmeticOverflow)?;

        Ok(())
    }

    pub fn lock_usd(&mut self, user_id: &Uuid, amount: u64) -> EngineResult<()> {
        let user_balance = self
            .balances
            .get_mut(user_id)
            .ok_or(EngineError::BalanceNotFound)?;

        if user_balance.usd.available < amount {
            return Err(EngineError::InsufficientUsd);
        }

        user_balance.usd.locked = user_balance
            .usd
            .locked
            .checked_add(amount)
            .ok_or(EngineError::ArithmeticOverflow)?;

        user_balance.usd.available -= amount;

        Ok(())
    }

    pub fn lock_stock(&mut self, user_id: &Uuid, symbol: &str, qty: u64) -> EngineResult<()> {
        let user_balance = self
            .balances
            .get_mut(user_id)
            .ok_or(EngineError::BalanceNotFound)?;

        let symbol = symbol.to_uppercase();

        let stock_balance = user_balance
            .stocks
            .get_mut(&symbol)
            .ok_or_else(|| EngineError::InsufficientStock(symbol.clone()))?;

        if stock_balance.available < qty {
            return Err(EngineError::InsufficientStock(symbol));
        }

        stock_balance.locked = stock_balance
            .locked
            .checked_add(qty)
            .ok_or(EngineError::ArithmeticOverflow)?;
        stock_balance.available -= qty;

        Ok(())
    }

    pub fn unlock_usd(&mut self, user_id: &Uuid, amount: u64) -> EngineResult<()> {
        let user_balance = self
            .balances
            .get_mut(user_id)
            .ok_or(EngineError::BalanceNotFound)?;

        if user_balance.usd.locked < amount {
            return Err(EngineError::InsufficientLockedBalance);
        }

        user_balance.usd.available = user_balance
            .usd
            .available
            .checked_add(amount)
            .ok_or(EngineError::ArithmeticOverflow)?;

        user_balance.usd.locked -= amount;

        Ok(())
    }

    pub fn unlock_stock(&mut self, user_id: &Uuid, symbol: &str, qty: u64) -> EngineResult<()> {
        let user_balance = self
            .balances
            .get_mut(user_id)
            .ok_or(EngineError::BalanceNotFound)?;

        let symbol = symbol.to_uppercase();

        let stock_balance = user_balance
            .stocks
            .get_mut(&symbol)
            .ok_or_else(|| EngineError::InsufficientStock(symbol.clone()))?;

        if stock_balance.locked < qty {
            return Err(EngineError::InsufficientLockedBalance);
        }

        stock_balance.available = stock_balance
            .available
            .checked_add(qty)
            .ok_or(EngineError::ArithmeticOverflow)?;

        stock_balance.locked -= qty;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deposits_locks_and_unlocks_usd() {
        let mut store = BalanceStore::new();
        let user_id = Uuid::new_v4();

        store.deposit(user_id.clone(), "USD", 1_000).unwrap();
        store.lock_usd(&user_id, 400).unwrap();
        store.unlock_usd(&user_id, 100).unwrap();

        let balance = store.get(&user_id).unwrap();

        assert_eq!(balance.usd.available, 700);
        assert_eq!(balance.usd.locked, 300);
    }

    #[test]
    fn deposits_locks_and_unlocks_stock() {
        let mut store = BalanceStore::new();
        let user_id = Uuid::new_v4();

        store.deposit(user_id.clone(), "AXIS", 50).unwrap();
        store.lock_stock(&user_id, "AXIS", 20).unwrap();
        store.unlock_stock(&user_id, "AXIS", 5).unwrap();

        let balance = store.get(&user_id).unwrap();
        let axis_balance = balance.stocks.get("AXIS").unwrap();

        assert_eq!(axis_balance.available, 35);
        assert_eq!(axis_balance.locked, 15);
    }
}
