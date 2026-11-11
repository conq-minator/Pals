/*
 * defender/domain_check.ts — SCAM_DOMAIN heuristics on merchantDomain and checkoutUrl.
 * Uses Levenshtein distance for typosquatting detection.
 */

// Well-known brand domains for typosquatting detection
const WELL_KNOWN_DOMAINS = [
  'paypal.com',
  'amazon.com',
  'apple.com',
  'ebay.com',
  'walmart.com',
  'bestbuy.com',
];

function levenshteinDistance(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;

  let prev = new Array(n + 1);
  let curr = new Array(n + 1);

  for (let i = 0; i <= n; i++) prev[i] = i;
  for (let j = 0; j <= m; j++) curr[0] = j;

  for (let j = 1; j <= m; j++) {
    for (let i = 1; i <= n; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(
        prev[i] + 1,          // deletion
        curr[i - 1] + 1,      // insertion
        prev[i - 1] + cost,   // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Check if a domain is a subdomain of another.
 * e.g., sub.merchantDomain.com is a subdomain of merchantDomain.com
 *       merchantDomain.com is the domain itself (also considered)
 */
function isSubdomain(sub: string, potentialParent: string): boolean {
  const subLower = sub.toLowerCase();
  const parentLower = potentialParent.toLowerCase();

  // sub must end with .parentParent or equal parent
  return (
    subLower === parentLower ||
    subLower.endsWith('.' + parentLower)
  );
}

/**
 * Check if a host is a raw IP address (IPv4 or IPv6).
 */
function isIPAddress(host: string): boolean {
  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return true;
  // IPv6 (simplified - just check for colons and no dots pattern)
  if (host.includes(':') && !host.includes('.')) return true;
  return false;
}

/**
 * Main domain check function.
 * Returns an array of detected threats (may be empty).
 */
export interface DomainCheckThreat {
  type: string;
  severity: string;
  details: string;
}

export function checkScamDomain(
  merchantDomain: string,
  checkoutUrl: string,
  merchantTrustScore: number
): DomainCheckThreat[] {
  const threats: DomainCheckThreat[] = [];
  const url = new URL(checkoutUrl);
  const checkoutHost = url.host.toLowerCase();
  const merchantHost = merchantDomain.toLowerCase();

  // 1. checkoutUrl host is not the merchantDomain or a subdomain of it
  if (!isSubdomain(checkoutHost, merchantHost)) {
    threats.push({
      type: 'SCAM_DOMAIN',
      severity: 'HIGH',
      details: `Checkout host '${checkoutHost}' is not a subdomain of merchant domain '${merchantHost}'`,
    });
  }

  // 2. checkoutUrl not https
  if (url.protocol !== 'https:') {
    threats.push({
      type: 'SCAM_DOMAIN',
      severity: 'MEDIUM',
      details: 'Checkout URL is not using HTTPS',
    });
  }

  // 3. Host is a raw IP address or contains punycode (xn--)
  if (isIPAddress(checkoutHost)) {
    threats.push({
      type: 'SCAM_DOMAIN',
      severity: 'HIGH',
      details: 'Checkout host is a raw IP address',
    });
  }

  if (checkoutHost.includes('xn--')) {
    threats.push({
      type: 'SCAM_DOMAIN',
      severity: 'HIGH',
      details: 'Checkout host contains punycode (xn--) indicator',
    });
  }

  // 4. Typosquatting: Levenshtein distance 1-2 from well-known domains
  const checkoutParts = checkoutHost.split('.');
  if (checkoutParts.length >= 2) {
    const potentialBase = checkoutParts.slice(-2).join('.');
    for (const known of WELL_KNOWN_DOMAINS) {
      const dist = levenshteinDistance(potentialBase, known);
      if (dist >= 1 && dist <= 2) {
        threats.push({
          type: 'SCAM_DOMAIN',
          severity: 'HIGH',
          details: `Potential typosquatting: '${potentialBase}' is ${dist} edit(s) away from known domain '${known}'`,
        });
      }
    }
  }

  // 5. merchantTrustScore checks
  if (merchantTrustScore < 40) {
    threats.push({
      type: 'SCAM_DOMAIN',
      severity: 'HIGH',
      details: `Low merchant trust score: ${merchantTrustScore}`,
    });
  } else if (merchantTrustScore >= 40 && merchantTrustScore <= 60) {
    threats.push({
      type: 'SCAM_DOMAIN',
      severity: 'MEDIUM',
      details: `Medium merchant trust score: ${merchantTrustScore}`,
    });
  }

  return threats;
}

/**
 * Check a single domain against typosquatting patterns.
 * Returns true if the domain looks like a typosquat of a well-known brand.
 */
export function isTyposquattedDomain(domain: string): boolean {
  const lower = domain.toLowerCase();
  const parts = lower.split('.');
  if (parts.length < 2) return false;

  const potentialBase = parts.slice(-2).join('.');
  for (const known of WELL_KNOWN_DOMAINS) {
    const dist = levenshteinDistance(potentialBase, known);
    if (dist >= 1 && dist <= 2) return true;
  }
  // Check for digit-for-letter swaps (e.g., paypa1.com)
  if (/\d/.test(potentialBase) && potentialBase.length >= 4) {
    // If the base domain portion has a digit, check if removing it yields a known domain
    for (const known of WELL_KNOWN_DOMAINS) {
      if (potentialBase.replace(/\d/g, '') === known.replace(/\d/g, '')) {
        // Actually check character-by-character
        let diff = 0;
        const maxLen = Math.max(potentialBase.length, known.length);
        for (let i = 0; i < maxLen; i++) {
          const pc = potentialBase[i] || '';
          const kc = known[i] || '';
          if (pc !== kc) diff++;
          if (diff > 2) break;
        }
        if (diff <= 2) return true;
      }
    }
  }
  return false;
}