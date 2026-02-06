/**
 * ExCurrency (Exchange Currency) Model
 * Represents currency exchange rates between different currencies
 * Used for converting prices from source currency to target currency (usually USD)
 */
export interface ExCurrency {
  id: number;
  fromCurrency: number;
  toCurrency: number;
  rate: number;
  lockedBy: number | null;
  createdBy: number;
  updatedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

