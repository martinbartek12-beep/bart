// ===================== SKU -> STRIPE PRICE ID =====================
//
// This file is the price authority. The browser only ever sends a SKU and a
// quantity; whatever it claims a thing costs is ignored. If a SKU is not listed
// here, checkout refuses it.
//
// SKU format is built by cartSku() in cart.js:
//   productId::colorLabel::sizeLabel      ("-" when the product has no colors)
//
// HOW TO FILL THIS IN
// -------------------
// You currently have Payment Links, not price IDs. Each Payment Link is backed
// by a price, but the link URL is not the price ID. To get them:
//
//   Stripe Dashboard -> Product catalogue -> open the product -> the price row
//   shows an ID starting with "price_". Copy that.
//
// Sizes are a problem worth deciding on before you fill this in: right now all
// three tee sizes share one price. If you want per-size stock tracking in Stripe,
// each size needs its own price (and its own row below). If you don't, point the
// size variants at the same price ID — the size still reaches you, because it is
// stored on the line item metadata in create-checkout-session.js.
//
// Sold-out variants are deliberately absent: M is sold out on all three tees.

var PRICES = {
  // --- Blue T-shirt (35,00 €) ---
  'blue-t-shirt::-::L': 'price_REPLACE_ME',
  'blue-t-shirt::-::XL': 'price_REPLACE_ME',

  // --- 500-chicken fingies tee (35,00 €) ---
  '500-chicken-fingies::-::L': 'price_REPLACE_ME',

  // --- chicken a dip tee (35,00 €) ---
  'chicken-a-dip-tee::-::L': 'price_REPLACE_ME',

  // --- Camo hoodie green/yellow (75,00 €) ---
  'camo-hoodie-green-yellow::-::ONE SIZE': 'price_REPLACE_ME',

  // --- reversible beanie (28,00 €) ---
  'reversible-beanie::-::ONE SIZE': 'price_REPLACE_ME',

  // --- 5-Panel Cap (30,00 €), one price per colour ---
  'five-panel-cap::Black::ONE SIZE': 'price_REPLACE_ME',
  'five-panel-cap::Olive Green::ONE SIZE': 'price_REPLACE_ME',
  'five-panel-cap::Chilli Red::ONE SIZE': 'price_REPLACE_ME'
};

// Split a SKU back into readable parts, so the order in Stripe shows the size
// instead of you having to decode "blue-t-shirt::-::L" by eye.
function describeSku(sku) {
  var parts = sku.split('::');
  return {
    productId: parts[0] || '',
    color: parts[1] && parts[1] !== '-' ? parts[1] : '',
    size: parts[2] && parts[2] !== '-' ? parts[2] : ''
  };
}

module.exports = { PRICES: PRICES, describeSku: describeSku };
