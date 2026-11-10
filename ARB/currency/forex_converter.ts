/**
 * ARBCurrencyConverter
 * Multi-currency normalization and live forex exchange rate management.
 * Guarantees that USD, INR, EUR, and GBP are never conflated or directly compared without conversion.
 */
export class ARBCurrencyConverter {
  private static rates: Record<string, number> = {
    USD: 1.0,
    INR: 87.50, // 1 USD = 87.50 INR baseline
    EUR: 0.95,  // 1 USD = 0.95 EUR
    GBP: 0.79   // 1 USD = 0.79 GBP
  };

  private static lastUpdated: number = 0;
  private static updatePromise: Promise<void> | null = null;

  /**
   * Refreshes forex rates from public exchange rate API asynchronously without blocking.
   */
  public static async refreshRates(): Promise<void> {
    // Cache rates for 1 hour
    if (Date.now() - this.lastUpdated < 3600000 && this.lastUpdated > 0) {
      return;
    }

    if (this.updatePromise) {
      return this.updatePromise;
    }

    this.updatePromise = (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('https://open.er-api.com/v6/latest/USD', {
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data: any = await res.json();
          if (data && data.rates) {
            if (data.rates.INR) this.rates.INR = data.rates.INR;
            if (data.rates.EUR) this.rates.EUR = data.rates.EUR;
            if (data.rates.GBP) this.rates.GBP = data.rates.GBP;
            this.lastUpdated = Date.now();
          }
        }
      } catch {
        // Fall back gracefully to robust baseline rates
      } finally {
        this.updatePromise = null;
      }
    })();

    return this.updatePromise;
  }

  /**
   * Identifies the native currency of an e-commerce merchant based on domain or TLD.
   */
  public static detectMerchantNativeCurrency(domain: string): string {
    const d = domain.toLowerCase();
    if (d.endsWith('.in') || d.includes('amazon.in') || d.includes('flipkart') || d.includes('croma') || d.includes('reliancedigital')) {
      return 'INR';
    }
    if (d.includes('walmart.com') || d.includes('bestbuy.com') || d.includes('newegg.com') || d.includes('bhphotovideo.com')) {
      return 'USD';
    }
    if (d.endsWith('.uk') || d.includes('amazon.co.uk') || d.includes('currys.co.uk')) {
      return 'GBP';
    }
    if (d.endsWith('.de') || d.endsWith('.fr') || d.endsWith('.eu')) {
      return 'EUR';
    }
    return 'USD';
  }

  /**
   * Converts an amount from source currency to target currency.
   */
  public static convert(amount: number, fromCurrency: string, toCurrency: string): number {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) {
      return Math.round(amount * 100) / 100;
    }

    const fromRate = this.rates[from] || 1.0;
    const toRate = this.rates[to] || 1.0;

    // Convert from source to USD base, then from USD to target
    const amountInUSD = amount / fromRate;
    const converted = amountInUSD * toRate;

    // Round to 2 decimal places for USD/EUR/GBP, whole number for INR
    return to === 'INR' ? Math.round(converted) : Math.round(converted * 100) / 100;
  }

  /**
   * Returns current conversion rate for display or audit logging.
   */
  public static getRate(from: string, to: string): number {
    const fromRate = this.rates[from.toUpperCase()] || 1.0;
    const toRate = this.rates[to.toUpperCase()] || 1.0;
    return toRate / fromRate;
  }
}

