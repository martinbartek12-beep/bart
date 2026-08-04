// ===================== CREATE CHECKOUT SESSION =====================
//
// POST { items: [{ sku, qty }] }  ->  { url }
//
// Deliberately written against the Stripe REST API with plain fetch, so the
// project stays dependency-free — no stripe npm package, no package.json, no
// build step. Needs Node 18+ for global fetch (Netlify's default runtime is
// newer than that; if you pin an older one this will break).
//
// Environment variables (Netlify -> Site settings -> Environment variables):
//   STRIPE_SECRET_KEY   required, sk_test_... while testing, sk_live_... later
//   SITE_URL            required, e.g. https://havefungoods.netlify.app
//   STRIPE_SHIPPING_RATE_EU / _ASIA / _LOCAL   optional, shr_... IDs
//
// NEVER put the secret key in any file in this repo. It goes in Netlify's env
// vars only. If it ever leaks, roll it in the Stripe dashboard immediately.

var { PRICES, describeSku } = require('./prices');

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

function json(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  var secretKey = process.env.STRIPE_SECRET_KEY;
  var siteUrl = process.env.SITE_URL;
  if (!secretKey || !siteUrl) {
    // Log the detail, return something vague — config problems are not the
    // customer's business and the message would end up on screen.
    console.error('Missing STRIPE_SECRET_KEY or SITE_URL');
    return json(500, { error: 'Checkout is not configured yet' });
  }

  var payload;
  try {
    payload = JSON.parse(event.body || '{}');
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
    // the parcel can see "L" without decoding a SKU.
    var parts = describeSku(sku);
    metadata['item_' + (i + 1)] =
      parts.productId +
      (parts.color ? ' / ' + parts.color : '') +
      (parts.size ? ' / size ' + parts.size : '') +
      ' x' + qty;
  }

  var params = {
    mode: 'payment',
    success_url: siteUrl + '/?checkout=success',
    cancel_url: siteUrl + '/?checkout=cancelled',
    line_items: lineItems,
    metadata: metadata,
    // Stripe collects the address; without this you get paid but have nowhere
    // to ship to.
    shipping_address_collection: {
      allowed_countries: ['SK', 'CZ', 'AT', 'PL', 'HU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE']
    }
  };

  // Shipping rates are optional so the function still works before they exist.
  // Until they are set, the customer pays no postage — see the note in the
  // handover about the tiered rate the client wanted.
  var rateIds = [
    process.env.STRIPE_SHIPPING_RATE_LOCAL,
    process.env.STRIPE_SHIPPING_RATE_EU,
    process.env.STRIPE_SHIPPING_RATE_ASIA
  ].filter(Boolean);

  if (rateIds.length) {
    params.shipping_options = rateIds.map(function (id) {
      return { shipping_rate: id };
    });
  }

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
};
