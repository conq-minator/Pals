/**
 * ARBScrapeBudget
 * Hard caps on paid scraping APIs (Serper, Bright Data, ...) so a demo or a bug can't drain a quota.
 *
 *   PALS_SERPER_MAX_CALLS              total Serper searches per server process     (default 30)
 *   PALS_BRIGHTDATA_MAX_CALLS          total Bright Data requests per server process (default 10)
 *   PALS_BRIGHTDATA_PAGES_PER_SEARCH   product pages unlocked per research run       (default 2)
 *   PALS_SEARCH_CACHE_MINUTES          reuse a search's results for this long       (default 60)
 *
 * Limits are per process (they reset on restart). Every paid call is logged with the running count.
 */

type Paid = 'serper' | 'brightdata' | 'brave' | 'serpapi' | 'google';

const DEFAULT_LIMITS: Record<Paid, number> = { serper: 30, brightdata: 10, brave: 30, serpapi: 30, google: 30 };
const ENV: Record<Paid, string> = {
  serper: 'PALS_SERPER_MAX_CALLS',
  brightdata: 'PALS_BRIGHTDATA_MAX_CALLS',
  brave: 'PALS_BRAVE_MAX_CALLS',
  serpapi: 'PALS_SERPAPI_MAX_CALLS',
  google: 'PALS_GOOGLE_SEARCH_MAX_CALLS'
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export class ARBScrapeBudget {
  private static used: Record<Paid, number> = { serper: 0, brightdata: 0, brave: 0, serpapi: 0, google: 0 };
  private static searchCache = new Map<string, { at: number; value: unknown }>();

  static limit(api: Paid): number {
    return envInt(ENV[api], DEFAULT_LIMITS[api]);
  }

  /** Reserves one call. Returns false (and spends nothing) once the cap is reached. */
  static tryUse(api: Paid, what: string): boolean {
    const limit = this.limit(api);
    if (this.used[api] >= limit) {
      console.warn(`[ARB] ${api} cap reached (${limit}); skipping ${what}. Raise ${ENV[api]} to allow more.`);
      return false;
    }
    this.used[api]++;
    console.info(`[ARB] ${api} call ${this.used[api]}/${limit}: ${what}`);
    return true;
  }

  static usage(): Record<Paid, { used: number; limit: number }> {
    const out = {} as Record<Paid, { used: number; limit: number }>;
    for (const api of Object.keys(this.used) as Paid[]) out[api] = { used: this.used[api], limit: this.limit(api) };
    return out;
  }

  static pagesPerSearch(): number {
    return envInt('PALS_BRIGHTDATA_PAGES_PER_SEARCH', 2);
  }

  /** Cached search results, so a re-quote or a repeated question doesn't pay twice. */
  static getCachedSearch<T>(key: string): T | undefined {
    const hit = this.searchCache.get(key);
    if (!hit) return undefined;
    if (Date.now() - hit.at > envInt('PALS_SEARCH_CACHE_MINUTES', 60) * 60_000) {
      this.searchCache.delete(key);
      return undefined;
    }
    return hit.value as T;
  }

  static setCachedSearch(key: string, value: unknown): void {
    this.searchCache.set(key, { at: Date.now(), value });
  }

  /** Tests only. */
  static reset(): void {
    for (const k of Object.keys(this.used) as Paid[]) this.used[k] = 0;
    this.searchCache.clear();
  }
}

/** Per-research allowance of Bright Data page unlocks. */
export class UnlockAllowance {
  private left: number;
  constructor(pages = ARBScrapeBudget.pagesPerSearch()) {
    this.left = pages;
  }
  take(url: string): boolean {
    if (this.left <= 0) return false;
    if (!ARBScrapeBudget.tryUse('brightdata', `unlock ${url}`)) return false;
    this.left--;
    return true;
  }
}
