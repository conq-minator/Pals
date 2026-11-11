import { ARBQueryMatcher } from '../extractors/query_matcher.js';

/**
 * ARBEverydayCatalog
 *
 * Data-driven catalog for high-frequency, everyday purchases that the legacy
 * hardware-oriented branches of the market agent could not handle:
 *   - Instant food delivery (pizza, naan, burgers, curries)
 *   - Quick-commerce groceries (milk, eggs, bread, butter, curd, paneer)
 *   - Pharmacy & first aid (bandages, crepe bandages, paracetamol)
 *   - PC memory (DDR5 / DDR4 desktop DIMMs and laptop SO-DIMMs)
 *
 * Prices are indicative reference prices (not live quotes). Every offer links to
 * the merchant's own search/menu page rather than a fabricated product id, and
 * each listing is tagged so the final price is confirmed at checkout.
 *
 * Offers carry a region so local-delivery items (a naan from Swiggy) are never
 * shown to a USD shopper and vice versa.
 */

export type EverydayVertical = 'food_delivery' | 'quick_commerce' | 'pharmacy' | 'pc_components';
export type MarketRegion = 'IN' | 'US';

export interface CatalogOffer {
  domain: string;
  merchantName: string;
  brand: string;
  title: string;
  /** Item price in the offer's native currency. */
  price: number;
  /** Delivery + platform/handling fee in native currency. */
  fee: number;
  currency: 'INR' | 'USD';
  region: MarketRegion;
  eta: string;
  /** Search term used to build the merchant URL (defaults to the entry search term). */
  q?: string;
}

export interface CatalogEntry {
  id: string;
  vertical: EverydayVertical;
  /** Whole-phrase aliases. Longer matching aliases win over shorter ones. */
  aliases: string[];
  /** If any of these phrases appear, this entry is not considered. */
  blockers?: string[];
  searchTerm: string;
  /** Tax rate applied on top of item price (e.g. 5% GST on restaurant food). */
  taxRate?: number;
  warrantyMonths?: number;
  specs: Record<string, string>;
  pros: string[];
  cons?: string[];
  offers: CatalogOffer[];
}

export interface ResolvedCatalogOffer extends CatalogOffer {
  entry: CatalogEntry;
  url: string;
  tax: number;
}

const IN = 'IN' as const;
const US = 'US' as const;
const INR = 'INR' as const;
const USD = 'USD' as const;

/** Merchant search/menu URL builders (real URL patterns, no fabricated product ids). */
const URL_BUILDERS: Record<string, (q: string) => string> = {
  'swiggy.com': q => `https://www.swiggy.com/search?query=${q}`,
  'swiggy.com/instamart': q => `https://www.swiggy.com/instamart/search?query=${q}`,
  'zomato.com': q => `https://www.zomato.com/search?q=${q}`,
  'dominos.co.in': () => 'https://www.dominos.co.in/menu',
  'pizzahut.co.in': () => 'https://www.pizzahut.co.in/order/deals/',
  'blinkit.com': q => `https://blinkit.com/s/?q=${q}`,
  'zeptonow.com': q => `https://www.zeptonow.com/search?query=${q}`,
  'bigbasket.com': q => `https://www.bigbasket.com/ps/?q=${q}`,
  'jiomart.com': q => `https://www.jiomart.com/search/${q}`,
  'apollopharmacy.in': q => `https://www.apollopharmacy.in/search-medicines/${q}`,
  '1mg.com': q => `https://www.1mg.com/search/all?name=${q}`,
  'pharmeasy.in': q => `https://pharmeasy.in/search/all?name=${q}`,
  'netmeds.com': q => `https://www.netmeds.com/catalogsearch/result/${q}/all`,
  'amazon.in': q => `https://www.amazon.in/s?k=${q}`,
  'flipkart.com': q => `https://www.flipkart.com/search?q=${q}`,
  'mdcomputers.in': q => `https://mdcomputers.in/index.php?route=product/search&search=${q}`,
  'primeabgb.com': q => `https://www.primeabgb.com/?s=${q}&post_type=product`,
  'vedantcomputers.com': q => `https://www.vedantcomputers.com/index.php?route=product/search&search=${q}`,
  'doordash.com': q => `https://www.doordash.com/search/store/${q}/`,
  'ubereats.com': q => `https://www.ubereats.com/search?q=${q}`,
  'dominos.com': () => 'https://www.dominos.com/en/pages/order/menu',
  'instacart.com': q => `https://www.instacart.com/store/s?k=${q}`,
  'walmart.com': q => `https://www.walmart.com/search?q=${q}`,
  'target.com': q => `https://www.target.com/s?searchTerm=${q}`,
  'cvs.com': q => `https://www.cvs.com/search?searchTerm=${q}`,
  'walgreens.com': q => `https://www.walgreens.com/search/results.jsp?Ntt=${q}`,
  'amazon.com': q => `https://www.amazon.com/s?k=${q}`,
  'newegg.com': q => `https://www.newegg.com/p/pl?d=${q}`,
  'bestbuy.com': q => `https://www.bestbuy.com/site/searchpage.jsp?st=${q}`
};

const FOOD_PROS = ['Freshly prepared by the restaurant on order', 'Live order tracking to your doorstep'];
const FOOD_CONS = ['Perishable — cancellation/refund only before the restaurant accepts the order'];
const QC_PROS = ['Instant doorstep delivery from a nearby dark store', 'Cold-chain / freshness checked before dispatch'];
const RX_PROS = ['Genuine product sourced from a licensed pharmacy', 'Sealed, batch- and expiry-tracked packaging'];

const CATALOG: CatalogEntry[] = [
  // ===========================================================================
  // FOOD DELIVERY
  // ===========================================================================
  {
    id: 'pizza',
    vertical: 'food_delivery',
    aliases: ['pizza', 'pizzas', 'margherita', 'pepperoni', 'farmhouse pizza', 'dominos', 'domino s', 'pizza hut'],
    blockers: ['pizza cutter', 'cutter', 'pizza oven', 'oven', 'pizza stone', 'stone', 'pizza pan', 'pan', 'peel', 'paddle', 'press', 'maker'],
    searchTerm: 'pizza',
    taxRate: 0.05,
    specs: { cuisine: 'Italian / Fast Food', serves: '1-2 (medium)' },
    pros: FOOD_PROS,
    cons: FOOD_CONS,
    offers: [
      { domain: 'dominos.co.in', merchantName: "Domino's Pizza India", brand: "Domino's", title: "Domino's Classic Margherita Pizza (Regular)", price: 149, fee: 39, currency: INR, region: IN, eta: '30 mins' },
      { domain: 'dominos.co.in', merchantName: "Domino's Pizza India", brand: "Domino's", title: "Domino's Margherita Pizza (Medium, Hand Tossed)", price: 249, fee: 39, currency: INR, region: IN, eta: '30 mins' },
      { domain: 'dominos.co.in', merchantName: "Domino's Pizza India", brand: "Domino's", title: "Domino's Farmhouse Veg Pizza (Medium, Hand Tossed)", price: 459, fee: 39, currency: INR, region: IN, eta: '30 mins' },
      { domain: 'dominos.co.in', merchantName: "Domino's Pizza India", brand: "Domino's", title: "Domino's Chicken Pepperoni Pizza (Medium)", price: 499, fee: 39, currency: INR, region: IN, eta: '30 mins' },
      { domain: 'pizzahut.co.in', merchantName: 'Pizza Hut India', brand: 'Pizza Hut', title: 'Pizza Hut Margherita Pan Pizza (Medium)', price: 269, fee: 45, currency: INR, region: IN, eta: '35 mins' },
      { domain: 'pizzahut.co.in', merchantName: 'Pizza Hut India', brand: 'Pizza Hut', title: 'Pizza Hut Chicken Pepperoni Pan Pizza (Medium)', price: 529, fee: 45, currency: INR, region: IN, eta: '35 mins' },
      { domain: 'swiggy.com', merchantName: 'Swiggy Food Delivery', brand: 'La Pino\'z', title: "La Pino'z Margherita Pizza (Medium) via Swiggy", price: 219, fee: 42, currency: INR, region: IN, eta: '30-35 mins', q: 'margherita pizza' },
      { domain: 'swiggy.com', merchantName: 'Swiggy Food Delivery', brand: 'La Pino\'z', title: "La Pino'z Chicken Pepperoni Pizza (Medium) via Swiggy", price: 429, fee: 42, currency: INR, region: IN, eta: '30-35 mins', q: 'pepperoni pizza' },
      { domain: 'zomato.com', merchantName: 'Zomato Food Delivery', brand: 'Oven Story', title: 'Oven Story Margherita Pizza (Medium) via Zomato', price: 229, fee: 40, currency: INR, region: IN, eta: '30 mins', q: 'margherita pizza' },
      { domain: 'zomato.com', merchantName: 'Zomato Food Delivery', brand: 'Oven Story', title: 'Oven Story Farmhouse Veg Pizza (Medium) via Zomato', price: 399, fee: 40, currency: INR, region: IN, eta: '30 mins', q: 'farmhouse pizza' },
      { domain: 'dominos.com', merchantName: "Domino's Pizza US", brand: "Domino's", title: "Domino's Hand Tossed Cheese Pizza (Large 14\") - Margherita style", price: 13.99, fee: 5.49, currency: USD, region: US, eta: '30 mins' },
      { domain: 'dominos.com', merchantName: "Domino's Pizza US", brand: "Domino's", title: "Domino's Pepperoni Pizza (Large 14\")", price: 15.99, fee: 5.49, currency: USD, region: US, eta: '30 mins' },
      { domain: 'doordash.com', merchantName: 'DoorDash Food Delivery', brand: 'Local Pizzeria', title: 'NY Style Pepperoni Pizza (Large 16") via DoorDash', price: 18.99, fee: 4.99, currency: USD, region: US, eta: '35 mins', q: 'pepperoni pizza' },
      { domain: 'ubereats.com', merchantName: 'Uber Eats Restaurant Delivery', brand: 'Local Pizzeria', title: 'Margherita Pizza (Medium 12") via Uber Eats', price: 14.49, fee: 4.49, currency: USD, region: US, eta: '30-40 mins', q: 'margherita pizza' }
    ]
  },
  {
    id: 'naan',
    vertical: 'food_delivery',
    aliases: ['naan', 'nan bread', 'butter naan', 'garlic naan', 'tandoori naan', 'plain naan', 'cheese naan', 'kulcha', 'tandoori roti', 'roti'],
    blockers: ['naan maker', 'maker', 'naan tawa', 'tawa', 'pan'],
    searchTerm: 'naan',
    taxRate: 0.05,
    specs: { cuisine: 'North Indian Tandoor', serves: '1 piece' },
    pros: [...FOOD_PROS, 'Baked fresh in a clay tandoor'],
    cons: [...FOOD_CONS, 'Small orders may attract a small-cart fee — combine with a curry to save'],
    offers: [
      { domain: 'swiggy.com', merchantName: 'Swiggy Food Delivery', brand: 'Punjabi Dhaba', title: 'Butter Naan (1 pc) - Punjabi Dhaba via Swiggy', price: 55, fee: 45, currency: INR, region: IN, eta: '25-30 mins', q: 'butter naan' },
      { domain: 'swiggy.com', merchantName: 'Swiggy Food Delivery', brand: 'Punjabi Dhaba', title: 'Garlic Naan (1 pc) - Punjabi Dhaba via Swiggy', price: 69, fee: 45, currency: INR, region: IN, eta: '25-30 mins', q: 'garlic naan' },
      { domain: 'swiggy.com', merchantName: 'Swiggy Food Delivery', brand: 'Punjabi Dhaba', title: 'Plain Tandoori Naan (1 pc) - Punjabi Dhaba via Swiggy', price: 45, fee: 45, currency: INR, region: IN, eta: '25-30 mins', q: 'naan' },
      { domain: 'swiggy.com', merchantName: 'Swiggy Food Delivery', brand: 'Punjabi Dhaba', title: 'Tandoori Roti (1 pc) - Punjabi Dhaba via Swiggy', price: 25, fee: 45, currency: INR, region: IN, eta: '25-30 mins', q: 'tandoori roti' },
      { domain: 'zomato.com', merchantName: 'Zomato Food Delivery', brand: 'Moti Mahal Delux', title: 'Butter Naan (1 pc) - Moti Mahal Delux via Zomato', price: 65, fee: 40, currency: INR, region: IN, eta: '30 mins', q: 'butter naan' },
      { domain: 'zomato.com', merchantName: 'Zomato Food Delivery', brand: 'Moti Mahal Delux', title: 'Garlic Naan (1 pc) - Moti Mahal Delux via Zomato', price: 79, fee: 40, currency: INR, region: IN, eta: '30 mins', q: 'garlic naan' },
      { domain: 'zomato.com', merchantName: 'Zomato Food Delivery', brand: 'Moti Mahal Delux', title: 'Cheese Naan (1 pc) - Moti Mahal Delux via Zomato', price: 99, fee: 40, currency: INR, region: IN, eta: '30 mins', q: 'cheese naan' },
      { domain: 'zomato.com', merchantName: 'Zomato Food Delivery', brand: 'Moti Mahal Delux', title: 'Tandoori Roti (1 pc) - Moti Mahal Delux via Zomato', price: 30, fee: 40, currency: INR, region: IN, eta: '30 mins', q: 'tandoori roti' },
      { domain: 'blinkit.com', merchantName: 'Blinkit (10-Min Delivery)', brand: 'iD Fresh', title: 'iD Fresh Ready-to-Cook Butter Naan (Pack of 5, heat & eat)', price: 120, fee: 15, currency: INR, region: IN, eta: '10 mins', q: 'naan' },
      { domain: 'zeptonow.com', merchantName: 'Zepto Instant Delivery', brand: 'Kitchens@', title: 'Kitchens@ Garlic Naan Ready-to-Eat (Pack of 4, heat & eat)', price: 110, fee: 15, currency: INR, region: IN, eta: '10 mins', q: 'garlic naan' },
      { domain: 'doordash.com', merchantName: 'DoorDash Food Delivery', brand: 'Taj Indian Kitchen', title: 'Butter Naan (1 pc) - Taj Indian Kitchen via DoorDash', price: 3.99, fee: 3.99, currency: USD, region: US, eta: '35 mins', q: 'butter naan' },
      { domain: 'doordash.com', merchantName: 'DoorDash Food Delivery', brand: 'Taj Indian Kitchen', title: 'Garlic Naan (1 pc) - Taj Indian Kitchen via DoorDash', price: 4.49, fee: 3.99, currency: USD, region: US, eta: '35 mins', q: 'garlic naan' },
      { domain: 'ubereats.com', merchantName: 'Uber Eats Restaurant Delivery', brand: 'Bombay Grill', title: 'Garlic Naan (1 pc) - Bombay Grill via Uber Eats', price: 4.99, fee: 3.49, currency: USD, region: US, eta: '30-40 mins', q: 'garlic naan' }
    ]
  },
  {
    id: 'burger',
    vertical: 'food_delivery',
    aliases: ['burger', 'burgers', 'whopper', 'mcaloo', 'mcchicken', 'cheeseburger', 'zinger'],
    blockers: ['burger press', 'press', 'burger box', 'box'],
    searchTerm: 'burger',
    taxRate: 0.05,
    specs: { cuisine: 'Fast Food', serves: '1' },
    pros: FOOD_PROS,
    cons: FOOD_CONS,
    offers: [
      { domain: 'swiggy.com', merchantName: 'Swiggy Food Delivery', brand: "McDonald's", title: "McDonald's McAloo Tikki Burger via Swiggy", price: 59, fee: 40, currency: INR, region: IN, eta: '25 mins', q: 'mcdonalds' },
      { domain: 'swiggy.com', merchantName: 'Swiggy Food Delivery', brand: "McDonald's", title: "McDonald's McChicken Burger via Swiggy", price: 149, fee: 40, currency: INR, region: IN, eta: '25 mins', q: 'mcdonalds' },
      { domain: 'zomato.com', merchantName: 'Zomato Food Delivery', brand: 'Burger King', title: 'Burger King Veg Whopper Burger via Zomato', price: 179, fee: 40, currency: INR, region: IN, eta: '30 mins', q: 'burger king' },
      { domain: 'zomato.com', merchantName: 'Zomato Food Delivery', brand: 'Burger King', title: 'Burger King Crispy Veg Burger via Zomato', price: 69, fee: 40, currency: INR, region: IN, eta: '30 mins', q: 'burger king' },
      { domain: 'swiggy.com', merchantName: 'Swiggy Food Delivery', brand: 'KFC', title: 'KFC Classic Zinger Chicken Burger via Swiggy', price: 199, fee: 40, currency: INR, region: IN, eta: '30 mins', q: 'kfc' },
      { domain: 'doordash.com', merchantName: 'DoorDash Food Delivery', brand: 'Five Guys', title: 'Five Guys Cheeseburger via DoorDash', price: 11.49, fee: 3.99, currency: USD, region: US, eta: '30 mins', q: 'cheeseburger' },
      { domain: 'ubereats.com', merchantName: 'Uber Eats Restaurant Delivery', brand: 'Burger King', title: 'Burger King Whopper Burger via Uber Eats', price: 7.49, fee: 3.49, currency: USD, region: US, eta: '25-35 mins', q: 'whopper' }
    ]
  },
  {
    id: 'butter_chicken',
    vertical: 'food_delivery',
    aliases: ['butter chicken', 'murgh makhani', 'paneer butter masala', 'dal makhani'],
    searchTerm: 'butter chicken',
    taxRate: 0.05,
    specs: { cuisine: 'North Indian', serves: '1-2 (half portion)' },
    pros: FOOD_PROS,
    cons: FOOD_CONS,
    offers: [
      { domain: 'zomato.com', merchantName: 'Zomato Food Delivery', brand: 'Moti Mahal Delux', title: 'Butter Chicken (Half) - Moti Mahal Delux via Zomato', price: 349, fee: 40, currency: INR, region: IN, eta: '30 mins', q: 'butter chicken' },
      { domain: 'swiggy.com', merchantName: 'Swiggy Food Delivery', brand: 'Punjabi Dhaba', title: 'Butter Chicken (Half) - Punjabi Dhaba via Swiggy', price: 299, fee: 45, currency: INR, region: IN, eta: '25-30 mins', q: 'butter chicken' },
      { domain: 'swiggy.com', merchantName: 'Swiggy Food Delivery', brand: 'Punjabi Dhaba', title: 'Paneer Butter Masala (Half) - Punjabi Dhaba via Swiggy', price: 249, fee: 45, currency: INR, region: IN, eta: '25-30 mins', q: 'paneer butter masala' },
      { domain: 'zomato.com', merchantName: 'Zomato Food Delivery', brand: 'Moti Mahal Delux', title: 'Dal Makhani (Half) - Moti Mahal Delux via Zomato', price: 259, fee: 40, currency: INR, region: IN, eta: '30 mins', q: 'dal makhani' },
      { domain: 'doordash.com', merchantName: 'DoorDash Food Delivery', brand: 'Taj Indian Kitchen', title: 'Butter Chicken (Chicken Tikka Masala style) - Taj Indian Kitchen via DoorDash', price: 17.99, fee: 3.99, currency: USD, region: US, eta: '35 mins', q: 'butter chicken' }
    ]
  },

  // ===========================================================================
  // QUICK-COMMERCE GROCERIES (10-minute delivery)
  // ===========================================================================
  {
    id: 'milk',
    vertical: 'quick_commerce',
    aliases: ['milk', 'toned milk', 'full cream milk', 'amul taaza', 'amul milk'],
    blockers: ['milkshake', 'milk shake', 'chocolate milk powder', 'milk powder', 'milk frother', 'frother', 'milk bottle', 'bottle'],
    searchTerm: 'amul taaza milk',
    specs: { type: 'Daily Fresh Dairy', pack: '1 Litre' },
    pros: QC_PROS,
    offers: [
      { domain: 'blinkit.com', merchantName: 'Blinkit (10-Min Delivery)', brand: 'Amul', title: 'Amul Taaza Homogenised Toned Milk (1 L Tetra Pack)', price: 74, fee: 15, currency: INR, region: IN, eta: '10 mins' },
      { domain: 'zeptonow.com', merchantName: 'Zepto Instant Delivery', brand: 'Amul', title: 'Amul Taaza Toned Fresh Milk (1 L Tetra Pack)', price: 74, fee: 15, currency: INR, region: IN, eta: '8 mins' },
      { domain: 'swiggy.com', merchantName: 'Swiggy Instamart', brand: 'Amul', title: 'Amul Taaza Homogenised Toned Milk (1 L)', price: 74, fee: 16, currency: INR, region: IN, eta: '12 mins' },
      { domain: 'bigbasket.com', merchantName: 'BigBasket (bbnow)', brand: 'Amul', title: 'Amul Taaza Toned Milk (1 L Tetra Pack)', price: 72, fee: 15, currency: INR, region: IN, eta: '15 mins' },
      { domain: 'jiomart.com', merchantName: 'JioMart Quick', brand: 'Amul', title: 'Amul Taaza Homogenised Toned Milk (1 L Tetra Pack)', price: 70, fee: 25, currency: INR, region: IN, eta: 'Same Day' },
      { domain: 'instacart.com', merchantName: 'Instacart', brand: 'Horizon', title: 'Horizon Organic 2% Reduced Fat Milk (Half Gallon)', price: 5.79, fee: 3.99, currency: USD, region: US, eta: '1 hour' },
      { domain: 'walmart.com', merchantName: 'Walmart US', brand: 'Great Value', title: 'Great Value Whole Vitamin D Milk (1 Gallon)', price: 3.48, fee: 0, currency: USD, region: US, eta: 'Same Day' }
    ]
  },
  {
    id: 'eggs',
    vertical: 'quick_commerce',
    aliases: ['egg', 'eggs', 'anda', 'brown eggs', 'farm eggs'],
    blockers: ['egg curry', 'egg biryani', 'egg roll', 'eggless', 'egg boiler', 'boiler', 'egg tray', 'tray', 'egg beater', 'beater'],
    searchTerm: 'eggs',
    specs: { type: 'Farm Fresh Eggs', pack: '12 pcs' },
    pros: QC_PROS,
    offers: [
      { domain: 'blinkit.com', merchantName: 'Blinkit (10-Min Delivery)', brand: 'Licious', title: 'Licious Farm Fresh White Eggs (Pack of 12)', price: 99, fee: 15, currency: INR, region: IN, eta: '10 mins' },
      { domain: 'zeptonow.com', merchantName: 'Zepto Instant Delivery', brand: 'Eggoz', title: 'Eggoz Farm Fresh Brown Eggs (Pack of 12)', price: 129, fee: 15, currency: INR, region: IN, eta: '8 mins' },
      { domain: 'swiggy.com', merchantName: 'Swiggy Instamart', brand: 'Fresho', title: 'Fresho Farm Eggs - Regular White (Pack of 12)', price: 95, fee: 16, currency: INR, region: IN, eta: '12 mins' },
      { domain: 'bigbasket.com', merchantName: 'BigBasket (bbnow)', brand: 'Fresho', title: 'Fresho Farm Eggs - Regular White (Pack of 12)', price: 92, fee: 15, currency: INR, region: IN, eta: '15 mins' },
      { domain: 'instacart.com', merchantName: 'Instacart', brand: 'Vital Farms', title: 'Vital Farms Pasture-Raised Large Brown Eggs (12 ct)', price: 6.99, fee: 3.99, currency: USD, region: US, eta: '1 hour' },
      { domain: 'walmart.com', merchantName: 'Walmart US', brand: 'Great Value', title: 'Great Value Large White Eggs (12 ct)', price: 2.98, fee: 0, currency: USD, region: US, eta: 'Same Day' }
    ]
  },
  {
    id: 'bread',
    vertical: 'quick_commerce',
    aliases: ['bread', 'brown bread', 'white bread', 'multigrain bread', 'sandwich bread', 'pav'],
    blockers: ['garlic bread', 'bread pakora', 'naan bread', 'nan bread', 'bread knife', 'knife', 'bread toaster', 'toaster'],
    searchTerm: 'bread',
    specs: { type: 'Fresh Bakery', pack: '400 g loaf' },
    pros: QC_PROS,
    offers: [
      { domain: 'blinkit.com', merchantName: 'Blinkit (10-Min Delivery)', brand: 'Harvest Gold', title: 'Harvest Gold White Sandwich Bread (400 g)', price: 45, fee: 15, currency: INR, region: IN, eta: '10 mins' },
      { domain: 'blinkit.com', merchantName: 'Blinkit (10-Min Delivery)', brand: 'Harvest Gold', title: 'Harvest Gold Brown Bread (400 g)', price: 55, fee: 15, currency: INR, region: IN, eta: '10 mins' },
      { domain: 'zeptonow.com', merchantName: 'Zepto Instant Delivery', brand: 'Britannia', title: 'Britannia 100% Whole Wheat Brown Bread (450 g)', price: 60, fee: 15, currency: INR, region: IN, eta: '8 mins' },
      { domain: 'swiggy.com', merchantName: 'Swiggy Instamart', brand: 'Modern', title: 'Modern Multigrain Bread (400 g)', price: 55, fee: 16, currency: INR, region: IN, eta: '12 mins' },
      { domain: 'bigbasket.com', merchantName: 'BigBasket (bbnow)', brand: 'Britannia', title: 'Britannia White Sandwich Bread (400 g)', price: 43, fee: 15, currency: INR, region: IN, eta: '15 mins' },
      { domain: 'walmart.com', merchantName: 'Walmart US', brand: 'Great Value', title: 'Great Value White Sandwich Bread (20 oz Loaf)', price: 1.42, fee: 0, currency: USD, region: US, eta: 'Same Day' }
    ]
  },
  {
    id: 'butter',
    vertical: 'quick_commerce',
    aliases: ['butter', 'amul butter', 'salted butter', 'unsalted butter'],
    blockers: ['butter naan', 'butter chicken', 'peanut butter', 'butter masala', 'butter paneer', 'paneer butter', 'butter milk', 'buttermilk', 'butter scotch', 'butterscotch', 'cocoa butter', 'shea butter', 'butter paper', 'paper', 'butter dish', 'dish'],
    searchTerm: 'amul butter',
    specs: { type: 'Dairy', pack: '100 g' },
    pros: QC_PROS,
    offers: [
      { domain: 'blinkit.com', merchantName: 'Blinkit (10-Min Delivery)', brand: 'Amul', title: 'Amul Pasteurised Salted Butter (100 g)', price: 62, fee: 15, currency: INR, region: IN, eta: '10 mins' },
      { domain: 'zeptonow.com', merchantName: 'Zepto Instant Delivery', brand: 'Amul', title: 'Amul Pasteurised Salted Butter (100 g)', price: 62, fee: 15, currency: INR, region: IN, eta: '8 mins' },
      { domain: 'swiggy.com', merchantName: 'Swiggy Instamart', brand: 'Amul', title: 'Amul Pasteurised Salted Butter (100 g)', price: 62, fee: 16, currency: INR, region: IN, eta: '12 mins' },
      { domain: 'bigbasket.com', merchantName: 'BigBasket (bbnow)', brand: 'Amul', title: 'Amul Pasteurised Salted Butter (100 g)', price: 60, fee: 15, currency: INR, region: IN, eta: '15 mins' },
      { domain: 'walmart.com', merchantName: 'Walmart US', brand: 'Land O Lakes', title: "Land O'Lakes Salted Butter Sticks (16 oz)", price: 5.47, fee: 0, currency: USD, region: US, eta: 'Same Day' }
    ]
  },
  {
    id: 'curd_paneer',
    vertical: 'quick_commerce',
    aliases: ['curd', 'dahi', 'yogurt', 'yoghurt', 'paneer'],
    blockers: ['paneer tikka', 'paneer butter masala', 'kadai paneer', 'paneer biryani', 'shahi paneer', 'chilli paneer', 'palak paneer'],
    searchTerm: 'amul',
    specs: { type: 'Dairy' },
    pros: QC_PROS,
    offers: [
      { domain: 'blinkit.com', merchantName: 'Blinkit (10-Min Delivery)', brand: 'Amul', title: 'Amul Masti Dahi / Curd (400 g Cup)', price: 35, fee: 15, currency: INR, region: IN, eta: '10 mins', q: 'amul curd' },
      { domain: 'zeptonow.com', merchantName: 'Zepto Instant Delivery', brand: 'Mother Dairy', title: 'Mother Dairy Classic Dahi / Curd (400 g Cup)', price: 40, fee: 15, currency: INR, region: IN, eta: '8 mins', q: 'curd' },
      { domain: 'blinkit.com', merchantName: 'Blinkit (10-Min Delivery)', brand: 'Amul', title: 'Amul Fresh Malai Paneer (200 g)', price: 95, fee: 15, currency: INR, region: IN, eta: '10 mins', q: 'amul paneer' },
      { domain: 'swiggy.com', merchantName: 'Swiggy Instamart', brand: 'Mother Dairy', title: 'Mother Dairy Fresh Paneer (200 g)', price: 90, fee: 16, currency: INR, region: IN, eta: '12 mins', q: 'paneer' },
      { domain: 'bigbasket.com', merchantName: 'BigBasket (bbnow)', brand: 'Amul', title: 'Amul Fresh Malai Paneer (200 g)', price: 92, fee: 15, currency: INR, region: IN, eta: '15 mins', q: 'amul paneer' },
      { domain: 'walmart.com', merchantName: 'Walmart US', brand: 'Chobani', title: 'Chobani Plain Greek Yogurt (32 oz)', price: 5.98, fee: 0, currency: USD, region: US, eta: 'Same Day', q: 'greek yogurt' }
    ]
  },

  // ===========================================================================
  // PHARMACY & FIRST AID
  // ===========================================================================
  {
    id: 'bandage',
    vertical: 'pharmacy',
    aliases: ['bandage', 'bandages', 'band aid', 'band aids', 'bandaid', 'bandaids', 'plaster', 'plasters', 'adhesive bandage', 'crepe bandage', 'elastic bandage', 'gauze', 'first aid', 'hansaplast'],
    blockers: ['bandage dress', 'dress', 'bandage scissors', 'scissors'],
    searchTerm: 'bandage',
    specs: { type: 'First Aid / Wound Care' },
    pros: RX_PROS,
    offers: [
      { domain: 'apollopharmacy.in', merchantName: 'Apollo Pharmacy', brand: 'Hansaplast', title: 'Hansaplast Washproof Bandage Strips for Minor Cuts & Wounds (Pack of 20)', price: 50, fee: 25, currency: INR, region: IN, eta: '2-4 hours', q: 'hansaplast' },
      { domain: '1mg.com', merchantName: 'Tata 1mg', brand: 'Hansaplast', title: 'Hansaplast Washproof Bandage Strips for Minor Cuts & Wounds (Pack of 100)', price: 199, fee: 49, currency: INR, region: IN, eta: 'Next Day', q: 'hansaplast washproof' },
      { domain: 'blinkit.com', merchantName: 'Blinkit (10-Min Delivery)', brand: 'Hansaplast', title: 'Hansaplast Washproof Bandage Strips for Minor Cuts & Wounds (Pack of 20)', price: 55, fee: 15, currency: INR, region: IN, eta: '10 mins', q: 'hansaplast' },
      { domain: 'pharmeasy.in', merchantName: 'PharmEasy', brand: 'Band-Aid', title: "Johnson's Band-Aid Washproof Adhesive Bandage Strips for Cuts (Pack of 20)", price: 48, fee: 49, currency: INR, region: IN, eta: 'Next Day', q: 'band aid' },
      { domain: 'netmeds.com', merchantName: 'Netmeds', brand: 'Band-Aid', title: "Johnson's Band-Aid Washproof Adhesive Bandage Strips for Cuts (Pack of 20)", price: 46, fee: 49, currency: INR, region: IN, eta: '1-2 Days', q: 'band aid' },
      { domain: 'zeptonow.com', merchantName: 'Zepto Instant Delivery', brand: 'Band-Aid', title: "Johnson's Band-Aid Washproof Adhesive Bandage Strips for Cuts (Pack of 10)", price: 30, fee: 15, currency: INR, region: IN, eta: '8 mins', q: 'band aid' },
      { domain: 'apollopharmacy.in', merchantName: 'Apollo Pharmacy', brand: 'Dynaplast', title: 'Dynaplast Crepe Elastic Bandage for Sprains (10 cm x 4 m)', price: 165, fee: 25, currency: INR, region: IN, eta: '2-4 hours', q: 'crepe bandage' },
      { domain: '1mg.com', merchantName: 'Tata 1mg', brand: 'Hansaplast', title: 'Hansaplast Crepe Elastic Bandage for Sprains (10 cm x 4 m)', price: 189, fee: 49, currency: INR, region: IN, eta: 'Next Day', q: 'crepe bandage' },
      { domain: 'amazon.in', merchantName: 'Amazon India (Official)', brand: 'Dynaplast', title: 'Dynaplast Crepe Elastic Bandage for Sprains (10 cm x 4 m)', price: 149, fee: 40, currency: INR, region: IN, eta: '1-2 Days', q: 'crepe bandage' },
      { domain: 'blinkit.com', merchantName: 'Blinkit (10-Min Delivery)', brand: 'Hansaplast', title: 'Hansaplast Crepe Elastic Bandage for Sprains (8 cm x 4 m)', price: 175, fee: 15, currency: INR, region: IN, eta: '10 mins', q: 'crepe bandage' },
      { domain: 'amazon.in', merchantName: 'Amazon India (Official)', brand: 'Generic', title: 'Sterile Gauze Roll Bandage for Wounds (10 cm x 3 m, Pack of 2) - First Aid', price: 99, fee: 40, currency: INR, region: IN, eta: '1-2 Days', q: 'gauze bandage' },
      { domain: 'cvs.com', merchantName: 'CVS Pharmacy', brand: 'Band-Aid', title: 'Band-Aid Brand Flexible Fabric Adhesive Bandages for Cuts (30 ct)', price: 5.49, fee: 0, currency: USD, region: US, eta: 'Same Day Pickup', q: 'band aid' },
      { domain: 'walgreens.com', merchantName: 'Walgreens', brand: 'Band-Aid', title: 'Band-Aid Brand Flexible Fabric Adhesive Bandages for Cuts (30 ct)', price: 5.29, fee: 0, currency: USD, region: US, eta: 'Same Day Pickup', q: 'band aid' },
      { domain: 'walmart.com', merchantName: 'Walmart US', brand: 'Equate', title: 'Equate Elastic Crepe Bandage for Sprains (3 in x 5 ft)', price: 3.97, fee: 0, currency: USD, region: US, eta: 'Same Day', q: 'elastic bandage' }
    ]
  },
  {
    id: 'paracetamol',
    vertical: 'pharmacy',
    aliases: ['paracetamol', 'dolo', 'dolo 650', 'crocin', 'calpol', 'fever tablet', 'fever medicine', 'acetaminophen', 'tylenol'],
    blockers: ['syrup', 'paracetamol syrup', 'suspension'],
    searchTerm: 'paracetamol',
    specs: { type: 'OTC Medicine (Analgesic / Antipyretic)' },
    pros: RX_PROS,
    cons: ['OTC medicine — follow the dosage on the pack; consult a doctor if fever lasts more than 3 days'],
    offers: [
      { domain: 'apollopharmacy.in', merchantName: 'Apollo Pharmacy', brand: 'Dolo', title: 'Dolo 650 Paracetamol Tablet (Strip of 15)', price: 34, fee: 25, currency: INR, region: IN, eta: '2-4 hours', q: 'dolo 650' },
      { domain: '1mg.com', merchantName: 'Tata 1mg', brand: 'Dolo', title: 'Dolo 650 Paracetamol Tablet (Strip of 15)', price: 32, fee: 49, currency: INR, region: IN, eta: 'Next Day', q: 'dolo 650' },
      { domain: 'pharmeasy.in', merchantName: 'PharmEasy', brand: 'Crocin', title: 'Crocin Advance 500 mg Paracetamol Tablet (Strip of 15)', price: 22, fee: 49, currency: INR, region: IN, eta: 'Next Day', q: 'crocin advance' },
      { domain: 'netmeds.com', merchantName: 'Netmeds', brand: 'Crocin', title: 'Crocin Advance 500 mg Paracetamol Tablet (Strip of 15)', price: 21, fee: 49, currency: INR, region: IN, eta: '1-2 Days', q: 'crocin advance' },
      { domain: 'blinkit.com', merchantName: 'Blinkit (10-Min Delivery)', brand: 'Dolo', title: 'Dolo 650 Paracetamol Tablet (Strip of 15)', price: 34, fee: 15, currency: INR, region: IN, eta: '10 mins', q: 'dolo 650' },
      { domain: 'cvs.com', merchantName: 'CVS Pharmacy', brand: 'Tylenol', title: 'Tylenol Extra Strength Acetaminophen (Paracetamol) 500 mg Caplets (24 ct)', price: 8.99, fee: 0, currency: USD, region: US, eta: 'Same Day Pickup', q: 'tylenol' },
      { domain: 'walmart.com', merchantName: 'Walmart US', brand: 'Equate', title: 'Equate Extra Strength Acetaminophen (Paracetamol) 500 mg Caplets (100 ct)', price: 4.88, fee: 0, currency: USD, region: US, eta: 'Same Day', q: 'acetaminophen' }
    ]
  },

  // ===========================================================================
  // PC COMPONENTS — MEMORY
  // ===========================================================================
  {
    id: 'desktop_ram',
    vertical: 'pc_components',
    aliases: ['ddr5', 'ddr4', 'ddr5 ram', 'ddr4 ram', 'ram stick', 'ram sticks', 'ram kit', 'desktop ram', 'memory kit', 'dimm', 'ram module', 'ram upgrade', 'ram'],
    blockers: ['laptop', 'notebook', 'macbook', 'phone', 'mobile', 'smartphone', 'tablet', 'ipad', 'sodimm', 'so dimm', 'mac mini', 'gpu', 'graphics card', 'mount', 'ram mount', '1500', 'truck', 'parts', 'cooler', 'ram cooler', 'heatsink', 'ram heatsink', 'ddr5 ram heatsink'],
    searchTerm: 'ddr5 ram',
    warrantyMonths: 120,
    specs: { form_factor: 'Desktop DIMM (288-pin)' },
    pros: ['Manufacturer limited lifetime / 10-year warranty', 'XMP / EXPO profile for one-click rated speed'],
    cons: ['Check motherboard QVL and DDR generation (DDR4 and DDR5 are not interchangeable)'],
    offers: [
      { domain: 'mdcomputers.in', merchantName: 'MD Computers', brand: 'Kingston', title: 'Kingston Fury Beast 16GB DDR5 5600MHz CL36 Desktop RAM (1x16GB)', price: 5899, fee: 0, currency: INR, region: IN, eta: '2-4 Days', q: 'kingston fury beast ddr5 16gb' },
      { domain: 'amazon.in', merchantName: 'Amazon India (Official)', brand: 'Crucial', title: 'Crucial 16GB DDR5 5600MHz CL46 Desktop RAM (1x16GB)', price: 5499, fee: 0, currency: INR, region: IN, eta: '1-2 Days', q: 'crucial ddr5 16gb' },
      { domain: 'primeabgb.com', merchantName: 'PrimeABGB', brand: 'Corsair', title: 'Corsair Vengeance 16GB DDR5 5200MHz CL40 Desktop RAM (1x16GB)', price: 5999, fee: 0, currency: INR, region: IN, eta: '2-4 Days', q: 'corsair vengeance ddr5 16gb' },
      { domain: 'amazon.in', merchantName: 'Amazon India (Official)', brand: 'Corsair', title: 'Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz CL36 Desktop RAM', price: 12999, fee: 0, currency: INR, region: IN, eta: '1-2 Days', q: 'corsair vengeance rgb ddr5 32gb 6000' },
      { domain: 'mdcomputers.in', merchantName: 'MD Computers', brand: 'Corsair', title: 'Corsair Vengeance 32GB (2x16GB) DDR5 6000MHz CL30 Desktop RAM', price: 12499, fee: 0, currency: INR, region: IN, eta: '2-4 Days', q: 'corsair vengeance ddr5 32gb 6000' },
      { domain: 'vedantcomputers.com', merchantName: 'Vedant Computers', brand: 'G.Skill', title: 'G.Skill Trident Z5 RGB 32GB (2x16GB) DDR5 6000MHz CL30 Desktop RAM', price: 13499, fee: 0, currency: INR, region: IN, eta: '2-4 Days', q: 'trident z5 ddr5 32gb' },
      { domain: 'flipkart.com', merchantName: 'Flipkart Official', brand: 'Kingston', title: 'Kingston Fury Beast 32GB (2x16GB) DDR5 6000MHz CL36 Desktop RAM', price: 11999, fee: 0, currency: INR, region: IN, eta: '2-3 Days', q: 'kingston fury beast ddr5 32gb' },
      { domain: 'primeabgb.com', merchantName: 'PrimeABGB', brand: 'XPG', title: 'XPG Lancer RGB 32GB (2x16GB) DDR5 6000MHz CL30 Desktop RAM', price: 11799, fee: 0, currency: INR, region: IN, eta: '2-4 Days', q: 'xpg lancer ddr5 32gb' },
      { domain: 'mdcomputers.in', merchantName: 'MD Computers', brand: 'G.Skill', title: 'G.Skill Trident Z5 RGB 64GB (2x32GB) DDR5 6000MHz CL30 Desktop RAM', price: 25999, fee: 0, currency: INR, region: IN, eta: '2-4 Days', q: 'trident z5 ddr5 64gb' },
      { domain: 'amazon.in', merchantName: 'Amazon India (Official)', brand: 'Corsair', title: 'Corsair Vengeance LPX 16GB (2x8GB) DDR4 3200MHz CL16 Desktop RAM', price: 3299, fee: 0, currency: INR, region: IN, eta: '1-2 Days', q: 'corsair vengeance lpx ddr4 16gb' },
      { domain: 'mdcomputers.in', merchantName: 'MD Computers', brand: 'Kingston', title: 'Kingston Fury Beast 32GB (2x16GB) DDR4 3200MHz CL16 Desktop RAM', price: 6299, fee: 0, currency: INR, region: IN, eta: '2-4 Days', q: 'kingston fury beast ddr4 32gb' },
      { domain: 'newegg.com', merchantName: 'Newegg', brand: 'Corsair', title: 'Corsair Vengeance 32GB (2x16GB) DDR5 6000MHz CL30 Desktop RAM', price: 109.99, fee: 0, currency: USD, region: US, eta: '2-3 Days', q: 'corsair vengeance ddr5 32gb 6000' },
      { domain: 'amazon.com', merchantName: 'Amazon US', brand: 'G.Skill', title: 'G.Skill Flare X5 32GB (2x16GB) DDR5 6000MHz CL36 Desktop RAM', price: 99.99, fee: 0, currency: USD, region: US, eta: '1-2 Days', q: 'gskill flare x5 ddr5 32gb' },
      { domain: 'bestbuy.com', merchantName: 'Best Buy Official', brand: 'Crucial', title: 'Crucial 16GB DDR5 5600MHz CL46 Desktop RAM (1x16GB)', price: 49.99, fee: 0, currency: USD, region: US, eta: '1-2 Days', q: 'crucial ddr5 16gb' }
    ]
  },
  {
    id: 'laptop_ram',
    vertical: 'pc_components',
    aliases: ['sodimm', 'so dimm', 'laptop ram', 'ram for laptop', 'ram for my laptop', 'laptop memory', 'notebook ram', 'laptop ram upgrade'],
    blockers: ['mount', 'ram mount', '1500', 'truck', 'parts', 'cooler', 'ram cooler', 'heatsink', 'ram heatsink', 'ddr5 ram heatsink'],
    searchTerm: 'ddr5 sodimm laptop ram',
    warrantyMonths: 120,
    specs: { form_factor: 'Laptop SO-DIMM (262-pin)' },
    pros: ['Manufacturer limited lifetime warranty', 'Plug-and-play JEDEC speeds for laptops'],
    cons: ['Only for laptops with a free/removable SO-DIMM slot (soldered RAM cannot be upgraded)'],
    offers: [
      { domain: 'amazon.in', merchantName: 'Amazon India (Official)', brand: 'Crucial', title: 'Crucial 16GB DDR5 5600MHz SO-DIMM Laptop RAM', price: 5299, fee: 0, currency: INR, region: IN, eta: '1-2 Days', q: 'crucial ddr5 sodimm 16gb' },
      { domain: 'mdcomputers.in', merchantName: 'MD Computers', brand: 'Kingston', title: 'Kingston Fury Impact 16GB DDR5 5600MHz SO-DIMM Laptop RAM', price: 5699, fee: 0, currency: INR, region: IN, eta: '2-4 Days', q: 'kingston fury impact ddr5 16gb' },
      { domain: 'flipkart.com', merchantName: 'Flipkart Official', brand: 'Crucial', title: 'Crucial 32GB (2x16GB) DDR5 5600MHz SO-DIMM Laptop RAM Kit', price: 10499, fee: 0, currency: INR, region: IN, eta: '2-3 Days', q: 'crucial ddr5 sodimm 32gb' },
      { domain: 'amazon.in', merchantName: 'Amazon India (Official)', brand: 'Crucial', title: 'Crucial 8GB DDR4 3200MHz SO-DIMM Laptop RAM', price: 1899, fee: 0, currency: INR, region: IN, eta: '1-2 Days', q: 'crucial ddr4 sodimm 8gb' },
      { domain: 'primeabgb.com', merchantName: 'PrimeABGB', brand: 'Kingston', title: 'Kingston Fury Impact 16GB DDR4 3200MHz SO-DIMM Laptop RAM', price: 3499, fee: 0, currency: INR, region: IN, eta: '2-4 Days', q: 'kingston fury impact ddr4 16gb' },
      { domain: 'amazon.com', merchantName: 'Amazon US', brand: 'Crucial', title: 'Crucial 32GB (2x16GB) DDR5 5600MHz SO-DIMM Laptop RAM Kit', price: 89.99, fee: 0, currency: USD, region: US, eta: '1-2 Days', q: 'crucial ddr5 sodimm 32gb' }
    ]
  }
];

export class ARBEverydayCatalog {
  /** Normalizes free text into space-delimited lowercase tokens, padded for whole-phrase matching. */
  private static normalize(text: string): string {
    return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
  }

  private static containsPhrase(normalizedText: string, phrase: string): boolean {
    const p = this.normalize(phrase).trim();
    return normalizedText.includes(` ${p} `);
  }

  /**
   * Finds the best-matching catalog entry for a query (longest alias wins), or null.
   */
  public static matchEntry(query: string): CatalogEntry | null {
    const normalized = this.normalize(query);
    let best: { entry: CatalogEntry; score: number } | null = null;

    for (const entry of CATALOG) {
      if (entry.blockers?.some(b => this.containsPhrase(normalized, b))) continue;
      let score = 0;
      for (const alias of entry.aliases) {
        if (this.containsPhrase(normalized, alias)) {
          score = Math.max(score, alias.length);
        }
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { entry, score };
      }
    }
    if (!best) {
      const hasMemBrand = /\b(?:corsair|crucial|kingston|g\.?skill|xpg|teamgroup|patriot)\b/i.test(normalized);
      const hasMemCap = /\b(?:4|8|16|24|32|64|128)\s*gb\b/i.test(normalized);
      if (hasMemBrand && hasMemCap) {
        const isLaptop = /laptop|notebook|sodimm|so-dimm/i.test(normalized);
        const targetId = isLaptop ? 'laptop_ram' : 'desktop_ram';
        const entry = CATALOG.find(e => e.id === targetId);
        if (entry) return entry;
      }
    }
    return best?.entry ?? null;
  }

  /**
   * Extracts substantive noun tokens from the query that are NOT part of any of the entry's aliases.
   * If a user asks for "pizza oven", "oven" is not part of pizza aliases. The user wants an oven,
   * not the pizza itself.
   */
  public static getNonAliasTokens(query: string, entry: CatalogEntry): string[] {
    const tokens = ARBQueryMatcher.extractCoreTokens(query);
    const aliasWords = new Set<string>();
    for (const alias of entry.aliases) {
      for (const w of alias.toLowerCase().split(/\s+/)) {
        if (w) aliasWords.add(w);
      }
    }
    const knownBrands = new Set([
      'amul', 'licious', 'eggoz', 'fresho', 'harvest', 'gold', 'britannia', 'modern',
      'mother', 'dairy', 'chobani', 'vital', 'farms', 'great', 'value', 'dynaplast',
      'hansaplast', 'dolo', 'crocin', 'calpol', 'tylenol', 'equate', 'kingston',
      'crucial', 'corsair', 'gskill', 'xpg', 'vedant', 'mdcomputers', 'primeabgb',
      'dominos', 'pizzahut', 'swiggy', 'zomato', 'blinkit', 'zepto'
    ]);
    const commonQualifiers = new Set([
      'pack', 'pcs', 'piece', 'pieces', 'gm', 'gms', 'kg', 'ml', 'ltr', 'large', 'medium', 'small',
      'regular', 'fresh', 'raw', 'organic', 'pure', 'farm', 'white', 'brown', 'veg', 'non-veg', 'nonveg',
      'min', 'mins', 'minute', 'minutes', 'sec', 'secs', 'second', 'seconds', 'hr', 'hrs', 'hour', 'hours', 'day', 'days'
    ]);

    return tokens.filter(t => {
      if (aliasWords.has(t)) return false;
      if (entry.aliases.some(a => a.includes(t))) return false;
      if (knownBrands.has(t)) return false;
      if (commonQualifiers.has(t)) return false;
      return true;
    });
  }

  /**
   * Counts how many query keywords appear in a piece of offer text.
   * Tolerant of apostrophes ("dominos" ~ "Domino's") and simple plurals ("pizzas" ~ "Pizza").
   */
  public static keywordHits(tokens: string[], text: string): number {
    const hay = text.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ');
    return tokens.filter(raw => {
      const t = raw.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
      if (!t) return false;
      if (hay.includes(t)) return true;
      if (t.length > 3 && t.endsWith('es') && hay.includes(t.slice(0, -2))) return true;
      if (t.length > 3 && t.endsWith('s') && hay.includes(t.slice(0, -1))) return true;
      return false;
    }).length;
  }

  /**
   * True when the query resolves to a catalog entry (via its aliases) and the listing is one of
   * that entry's offers. Lets alias/synonym queries ("tylenol", "anda", "plaster", "burgers")
   * pass keyword-overlap relevance checks, which would otherwise reject them.
   */
  public static isOfferForQuery(query: string, listingTitle: string): boolean {
    const entry = this.matchEntry(query);
    if (!entry) return false;
    const nonAliasNouns = this.getNonAliasTokens(query, entry);
    if (nonAliasNouns.length > 0) {
      const titleLower = listingTitle.toLowerCase();
      const hasAll = nonAliasNouns.every(noun => this.keywordHits([noun], titleLower) > 0);
      if (!hasAll) return false;
    }
    const title = listingTitle.trim().toLowerCase();
    return entry.offers.some(o => o.title.toLowerCase() === title);
  }

  /** Returns the everyday vertical for a query, if it maps to one. */
  public static detectVertical(query: string): EverydayVertical | null {
    return this.matchEntry(query)?.vertical ?? null;
  }

  /** Maps a target currency to the shopper's market region (null = no restriction). */
  public static regionForCurrency(currency: string): MarketRegion | null {
    const c = currency.toUpperCase();
    if (c === 'INR') return 'IN';
    if (c === 'USD') return 'US';
    return null;
  }

  /**
   * Resolves the query into concrete offers:
   *  1. pick the best entry,
   *  2. keep offers in the shopper's region (local delivery cannot cross borders),
   *  3. keep only the offers that match the most query keywords
   *     (e.g. "garlic naan" drops butter naan, "corsair ddr5" drops Kingston).
   */
  public static resolve(query: string, targetCurrency: string): ResolvedCatalogOffer[] {
    const entry = this.matchEntry(query);
    if (!entry) return [];

    const nonAliasNouns = this.getNonAliasTokens(query, entry);
    if (nonAliasNouns.length > 0) {
      const qualifying = entry.offers.filter(o =>
        nonAliasNouns.every(noun => this.keywordHits([noun], o.title.toLowerCase()) > 0)
      );
      if (qualifying.length === 0) return [];
    }

    const region = this.regionForCurrency(targetCurrency);
    let offers = region ? entry.offers.filter(o => o.region === region) : entry.offers;
    if (offers.length === 0) offers = entry.offers;

    const tokens = ARBQueryMatcher.extractCoreTokens(query);
    if (tokens.length > 0) {
      const scored = offers.map(o => ({ o, hits: this.keywordHits(tokens, `${o.title} ${o.brand}`) }));
      const maxHits = Math.max(...scored.map(s => s.hits));
      if (maxHits > 0) {
        offers = scored.filter(s => s.hits === maxHits).map(s => s.o);
      }
    }

    return offers.map(o => {
      const build = URL_BUILDERS[o.domain === 'swiggy.com' && entry.vertical === 'quick_commerce' ? 'swiggy.com/instamart' : o.domain];
      const q = encodeURIComponent(o.q || entry.searchTerm);
      const url = build ? build(q) : `https://www.${o.domain}/search?q=${q}`;
      const rawTax = entry.taxRate ? o.price * entry.taxRate : 0;
      const tax = o.currency === 'INR' ? Math.round(rawTax) : Math.round(rawTax * 100) / 100;
      return { ...o, entry, url, tax };
    });
  }
}

ARBQueryMatcher.catalogVouches = (query, title) => ARBEverydayCatalog.isOfferForQuery(query, title);
