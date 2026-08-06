use crate::models::Side;
use std::collections::{BTreeMap, VecDeque};
use uuid::Uuid;

#[derive(Debug, Default)]
pub struct OrderBook {
    bids: BTreeMap<u64, VecDeque<Uuid>>,
    asks: BTreeMap<u64, VecDeque<Uuid>>,
}

impl OrderBook {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn add(&mut self, side: &Side, price: u64, order_id: Uuid) {
        let levels = match side {
            Side::Buy => &mut self.bids,
            Side::Sell => &mut self.asks,
        };

        levels.entry(price).or_default().push_back(order_id);
    }

    pub fn best_bid(&self) -> Option<u64> {
        self.bids.keys().next_back().copied()
    }

    pub fn best_ask(&self) -> Option<u64> {
        self.asks.keys().next().copied()
    }

    pub fn best_order_id(&self, side: &Side) -> Option<&Uuid> {
        let queue = match side {
            Side::Buy => self.bids.values().next_back(),
            Side::Sell => self.asks.values().next(),
        };

        queue.and_then(|orders| orders.front())
    }

    pub fn remove(&mut self, side: &Side, price: u64, order_id: &Uuid) -> bool {
        let levels = match side {
            Side::Buy => &mut self.bids,
            Side::Sell => &mut self.asks,
        };

        let Some(queue) = levels.get_mut(&price) else {
            return false;
        };

        let Some(position) = queue.iter().position(|id| id == order_id) else {
            return false;
        };

        queue.remove(position);

        if queue.is_empty() {
            levels.remove(&price);
        }

        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn selects_best_prices_and_preserves_fifo() {
        let mut book = OrderBook::new();

        let bid_99 = Uuid::new_v4();
        let first_bid_100 = Uuid::new_v4();
        let second_bid_100 = Uuid::new_v4();
        let ask_102 = Uuid::new_v4();
        let ask_101 = Uuid::new_v4();

        book.add(&Side::Buy, 99, bid_99);
        book.add(&Side::Buy, 100, first_bid_100);
        book.add(&Side::Buy, 100, second_bid_100);

        book.add(&Side::Sell, 102, ask_102);
        book.add(&Side::Sell, 101, ask_101);

        assert_eq!(book.best_bid(), Some(100));
        assert_eq!(book.best_ask(), Some(101));

        assert_eq!(book.best_order_id(&Side::Buy), Some(&first_bid_100));

        assert_eq!(book.best_order_id(&Side::Sell), Some(&ask_101));
    }

    #[test]
    fn removes_orders_and_empty_price_levels() {
        let mut book = OrderBook::new();

        let first_order = Uuid::new_v4();
        let second_order = Uuid::new_v4();

        book.add(&Side::Buy, 100, first_order);
        book.add(&Side::Buy, 100, second_order);

        assert!(book.remove(&Side::Buy, 100, &first_order));

        assert_eq!(book.best_order_id(&Side::Buy), Some(&second_order));

        assert!(book.remove(&Side::Buy, 100, &second_order));

        assert_eq!(book.best_bid(), None);
        assert_eq!(book.best_order_id(&Side::Buy), None);
    }
}
