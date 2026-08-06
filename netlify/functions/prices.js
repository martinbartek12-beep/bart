// ===================== SKU -> STRIPE PRICE ID =====================
//
// This file is the price authority. The browser only ever sends a SKU and a
// quantity; whatever it claims a thing costs is ignored. If a SKU is not listed
// here, checkout refuses it.
//
// SKU format is built by cartSku() in cart.js:
//   productId::colorLabel::sizeLabel      ("-" when the product has no colors)
//
// WHERE THESE CAME FROM
// ---------------------
// Stripe Dashboard -> Product catalogue -> open a product -> the price row shows
// an ID starting with "price_". These are SANDBOX (test) prices and only work
// with an sk_test_ key. Going live means creating the products again in live
// mode and swapping every ID below — test and live are separate worlds.
//
// The three tees share one price per product across sizes, so L and XL point at
// the same ID. The size still reaches the order: create-checkout-session.js puts
// it in the session metadata. Split them into separate prices only if you want
// Stripe to track stock per size.
//
// Sold-out variants are deliberately absent: M is sold out on all three tees.

var PRICES = {
  // --- Blue T-shirt (35,00 €) ---
  'blue-t-shirt::-::L': 'price_1U1QRHLiByPHkozDtKuSjrUt',
  'blue-t-shirt::-::XL': 'price_1U1QRHLiByPHkozDtKuSjrUt',

  // --- 500-chicken fingies tee (35,00 €) ---
  '500-chicken-fingies::-::L': 'price_1U1QQjLiByPHkozDBhTAC3Ry',

  // --- chicken a dip tee (35,00 €) ---
  'chicken-a-dip-tee::-::L': 'price_1U1QQFLiByPHkozDVy0cRPHV',

  // --- Camo hoodie green/yellow (75,00 €) ---
  'camo-hoodie-green-yellow::-::ONE SIZE': 'price_1U1QPgLiByPHkozDygG3ORSO',

  // --- reversible beanie (28,00 €) ---
  'reversible-beanie::-::ONE SIZE': 'price_1U1QOpLiByPHkozD5RynmpCq',

  // --- 5-Panel Cap (30,00 €), one price per colour ---
  'five-panel-cap::Black::ONE SIZE': 'price_1U1QNgLiByPHkozDfOoZE8TU',
  'five-panel-cap::Olive Green::ONE SIZE': 'price_1U1QMDLiByPHkozD960Jpcy2',
  'five-panel-cap::Chilli Red::ONE SIZE': 'price_1U1QN5LiByPHkozD773knYYa'
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
