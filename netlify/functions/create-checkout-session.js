// ===================== CREATE CHECKOUT SESSION =====================
//
// Cloudflare Pages Function. The file path is the route: this file lives at
// functions/api/create-checkout-session.js, so it answers POSTs to
//   /api/create-checkout-session
//
// POST { zone, items: [{ sku, qty }] }  ->  { url }
//
// Written against the Stripe REST API with plain fetch, so the project stays
// dependency-free — no stripe npm package, no package.json, no build step.
//
// Environment variables (Cloudflare dashboard -> the project -> Settings ->
// Variables and Secrets). They must exist for BOTH Production and Preview, and
// a redeploy is needed after changing them:
//   STRIPE_SECRET_KEY   required, sk_test_... while testing, sk_live_... later
//   SITE_URL            required, e.g. https://bart.pages.dev — no trailing slash
//   STRIPE_SHIPPING_RATE_LOCAL / _EU / _ASIA   required, shr_... IDs
//
// NEVER put the secret key in this file or anywhere else in the repo. Mark it as
// a secret in the dashboard. If it ever leaks, roll it in Stripe immediately.


// ===================== SKU -> STRIPE PRICE ID =====================
//
// This map is the price authority. The browser only sends a SKU and a quantity;
// whatever it claims a thing costs is ignored. A SKU that is not listed here is
// refused. SKUs are built by cartSku() in cart.js as
//   productId::colorLabel::sizeLabel     ("-" when the product has no colours)
//
// These are SANDBOX (test) prices and only work with an sk_test_ key. Going live
// means creating the products again in live mode and swapping every ID here —
// test and live are separate worlds.
//
// The three tees share one price across sizes, so L and XL point at the same ID.
// The size still reaches the order via the session metadata below. Sold-out
// variants are deliberately absent: M is sold out on all three tees.
//
// (This lived in its own file on Netlify. It is inlined here because everything
// inside functions/ becomes a route on Cloudflare, and a stray prices.js would
// have been reachable over the web.)

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

  // --- 5-Panel Cap (45,00 €), one price per colour ---
  'five-panel-cap::Black::ONE SIZE': 'price_1U6UeTLiByPHkozDc672I9vT',
  'five-panel-cap::Olive Green::ONE SIZE': 'price_1U6UopLiByPHkozDTCiNaIpO',
  'five-panel-cap::Chilli Red::ONE SIZE': 'price_1U6UjfLiByPHkozDPVlTBd4d'
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

var MAX_QTY_PER_LINE = 10;
var MAX_LINES = 20;

// Stripe's API takes form-encoded bodies with bracketed nested keys, e.g.
// line_items[0][price]=price_123. This flattens a normal object into that shape.
function formEncode(obj, prefix, out) {
  out = out || [];
  Object.keys(obj).forEach(function (key) {
    var value = obj[key];
    if (value === undefined || value === null) return;
    var name = prefix ? prefix + '[' + key + ']' : key;
    if (typeof value === 'object') {
      formEncode(value, name, out);
    } else {
      out.push(encodeURIComponent(name) + '=' + encodeURIComponent(String(value)));
    }
  });
  return out;
}

// Cloudflare works with the standard Response object rather than Netlify's
// { statusCode, headers, body } shape.
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// onRequestPost only runs for POST, so no method check is needed. onRequest
// below catches everything else.
export async function onRequestPost(context) {
  var request = context.request;
  var env = context.env;

  var secretKey = env.STRIPE_SECRET_KEY;
  var siteUrl = env.SITE_URL;
  if (!secretKey || !siteUrl) {
    // Log the detail, return something vague — config problems are not the
    // customer's business and the message would end up on screen.
    console.error('Missing STRIPE_SECRET_KEY or SITE_URL');
    return json(500, { error: 'Checkout is not configured yet' });
  }

  var payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json(400, { error: 'Malformed request' });
  }

  var items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) return json(400, { error: 'Cart is empty' });
  if (items.length > MAX_LINES) return json(400, { error: 'Too many items' });

  // Validate everything before touching Stripe. The browser is not trusted:
  // it supplies a SKU and a quantity, and nothing else survives.
  var lineItems = [];
  var metadata = {};
  for (var i = 0; i < items.length; i++) {
    var sku = items[i] && items[i].sku;
    var qty = items[i] && items[i].qty;

    if (typeof sku !== 'string' || !Object.prototype.hasOwnProperty.call(PRICES, sku)) {
      return json(400, { error: 'This item is no longer available' });
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
      return json(400, { error: 'Invalid quantity' });
    }

    var priceId = PRICES[sku];
    if (!priceId || priceId.indexOf('price_REPLACE_ME') === 0) {
      console.error('Price ID not configured for SKU: ' + sku);
      return json(500, { error: 'Checkout is not configured yet' });
    }

    lineItems.push({ price: priceId, quantity: qty });

    // Carry the human-readable variant through to the order, so whoever packs
    // the parcel can see "L" without decoding a SKU. This is duplicated onto the
    // payment itself below — session metadata alone is easy to miss, because the
    // Payments screen doesn't show it.
    var parts = describeSku(sku);
    metadata['item_' + (i + 1)] =
      parts.productId +
      (parts.color ? ' / ' + parts.color : '') +
      (parts.size ? ' / size ' + parts.size : '') +
      ' x' + qty;
  }

  // Shipping zones. The customer picks a zone in the cart, so we can send Stripe
  // exactly one rate instead of offering all three and letting a Japanese order
  // pick the 6 EUR Czech rate. allowed_countries is narrowed to match, so the
  // chosen zone and the delivery address cannot disagree.
  var ZONES = {
    local: {
      rate: env.STRIPE_SHIPPING_RATE_LOCAL,
      countries: ['CZ', 'SK']
    },
    europe: {
      rate: env.STRIPE_SHIPPING_RATE_EU,
      countries: [
        'AT', 'BE', 'BG', 'HR', 'CY', 'DK', 'EE', 'FI', 'FR', 'DE',
        'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL',
        'PT', 'RO', 'SI', 'ES', 'SE'
      ]
    },
    asia: {
      rate: env.STRIPE_SHIPPING_RATE_ASIA,
      countries: ['KR', 'JP']
    }
  };

  var zoneKey = typeof payload.zone === 'string' ? payload.zone : '';
  var zone = Object.prototype.hasOwnProperty.call(ZONES, zoneKey) ? ZONES[zoneKey] : null;
  if (!zone) {
    return json(400, { error: 'Please choose a delivery region' });
  }
  if (!zone.rate) {
    console.error('Shipping rate not configured for zone: ' + zoneKey);
    return json(500, { error: 'Checkout is not configured yet' });
  }

  var params = {
    mode: 'payment',
    success_url: siteUrl + '/?checkout=success',
    cancel_url: siteUrl + '/?checkout=cancelled',
    line_items: lineItems,
    metadata: metadata,
    // Same lines copied onto the PaymentIntent, so the sizes show up on the
    // payment in the dashboard — that's the screen you actually open when
    // packing an order.
    payment_intent_data: {
      metadata: metadata,
      // Shows in the payment list, so an order is identifiable at a glance.
      description: 'havefungoods — ' + lineItems.reduce(function (n, l) { return n + l.quantity; }, 0) + ' item(s)'
    },
    // Stripe collects the address; without this you get paid but have nowhere
    // to ship to. Restricted to the chosen zone so the address matches the rate.
    shipping_address_collection: {
      allowed_countries: zone.countries
    },
    shipping_options: [{ shipping_rate: zone.rate }]
  };

  try {
    var res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + secretKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formEncode(params).join('&')
    });

    var body = await res.json();

    if (!res.ok) {
      console.error('Stripe error:', body && body.error);
      return json(502, { error: 'Could not start checkout' });
    }

    return json(200, { url: body.url });
  } catch (err) {
    console.error('Checkout request failed:', err);
    return json(502, { error: 'Could not reach the payment provider' });
  }
}
// Only onRequestPost is exported on purpose. Cloudflare answers other methods
// with a 405 by itself, and exporting a catch-all onRequest alongside it risks
// the catch-all winning and swallowing every checkout.
