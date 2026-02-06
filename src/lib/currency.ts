import { prisma } from '@/lib/db';

// USD Currency ID (same as backend)
const USD_CURRENCY_ID = 6;

// Cache for exchange rates
const exchangeRatesCache: Map<string, number> = new Map();
let cacheTimestamp: number = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Convert price from source currency to USD
 * Same logic as PHP backend's convertPrice method
 * 
 * @param price The price to convert
 * @param currencyId The source currency ID
 * @returns The converted price in USD, or null if price is null
 */
export async function convertPrice(
  price: number | null | undefined,
  currencyId: number
): Promise<number | null> {
  if (price === null || price === undefined || price === 0) {
    return null;
  }

  const priceValue = Number(price);
  
  // If already in USD, return as-is
  if (currencyId === USD_CURRENCY_ID) {
    return Math.round(priceValue * 100) / 100; // Round to 2 decimals
  }

  // Check cache first
  const now = Date.now();
  if (now - cacheTimestamp > CACHE_DURATION) {
    // Cache expired, clear it
    exchangeRatesCache.clear();
    cacheTimestamp = now;
  }

  const cacheKey = `${currencyId}_${USD_CURRENCY_ID}`;
  
  if (!exchangeRatesCache.has(cacheKey)) {
    // Get exchange rate from database
    try {
      const rateResult = await prisma.$queryRawUnsafe<Array<{ rate: number }>>(
        `SELECT rate FROM ex_currency WHERE from_currency = ? AND to_currency = ? LIMIT 1`,
        currencyId,
        USD_CURRENCY_ID
      );

      if (rateResult && rateResult.length > 0) {
        exchangeRatesCache.set(cacheKey, Number(rateResult[0].rate));
      } else {
        // No rate found, return original price
        return Math.round(priceValue * 100) / 100;
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      return Math.round(priceValue * 100) / 100;
    }
  }

  const rate = exchangeRatesCache.get(cacheKey);
  if (rate) {
    return Math.round(priceValue * rate * 100) / 100;
  }

  return Math.round(priceValue * 100) / 100;
}

/**
 * Get currency symbol for USD
 * Returns hardcoded "$" since we always convert to USD
 * Note: currency table is empty, so we don't query it
 * 
 * @returns Currency symbol ("$" for USD)
 */
export function getCurrencySymbol(): string {
  // Always return USD symbol since we convert all prices to USD
  // No need to query the database as currency table is empty
  return '$';
}

/**
 * Convert multiple prices in batch (more efficient)
 * 
 * @param prices Array of { price, currencyId } objects
 * @returns Array of converted prices
 */
export async function convertPricesBatch(
  prices: Array<{ price: number | null | undefined; currencyId: number }>
): Promise<Array<number | null>> {
  // Get unique currency IDs
  const uniqueCurrencyIds = [...new Set(prices.map(p => p.currencyId))].filter(
    id => id !== USD_CURRENCY_ID
  );

  // Fetch all needed exchange rates at once
  if (uniqueCurrencyIds.length > 0) {
    try {
      const placeholders = uniqueCurrencyIds.map(() => '?').join(',');
      const rates = await prisma.$queryRawUnsafe<
        Array<{ from_currency: number; rate: number }>
      >(
        `SELECT from_currency, rate FROM ex_currency 
         WHERE from_currency IN (${placeholders}) AND to_currency = ?`,
        ...uniqueCurrencyIds,
        USD_CURRENCY_ID
      );

      // Update cache
      rates.forEach(r => {
        const cacheKey = `${r.from_currency}_${USD_CURRENCY_ID}`;
        exchangeRatesCache.set(cacheKey, Number(r.rate));
      });
      cacheTimestamp = Date.now();
    } catch (error) {
      console.error('Error fetching exchange rates batch:', error);
    }
  }

  // Convert all prices
  return Promise.all(
    prices.map(({ price, currencyId }) => convertPrice(price, currencyId))
  );
}

/**
 * Clear the currency cache (useful for testing or when rates are updated)
 */
export function clearCurrencyCache(): void {
  exchangeRatesCache.clear();
  cacheTimestamp = 0;
}

