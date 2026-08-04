// ===================== CART STATE =====================
// Pure state + persistence. No DOM in this file — the UI lives in app.js and
// re-renders through onCartChange(). Load order: products.js -> cart.js -> app.js.
//
// A cart line is identified by its SKU, which encodes the exact variant:
//   "five-panel-cap::Olive Green::ONE SIZE"
//   "blue-t-shirt::-::L"
// Adding the same variant twice bumps qty instead of creating a second line.
//
// IMPORTANT: priceCents here is for display only. The amount actually charged is
// resolved server-side from the SKU (see netlify/functions/). Never send a price
// from the browser to Stripe — anyone can edit it in devtools.

var CART_STORAGE_KEY = 'hfg_cart_v1';
var CART_MAX_QTY = 10;

var cart = [];
var cartListeners = [];

function cartSku(productId, colorLabel, sizeLabel) {
  return productId + '::' + (colorLabel || '-') + '::' + (sizeLabel || '-');
}

// localStorage throws in private mode on some browsers, and is blocked entirely
// on file:// in Chrome — so every access is guarded and failure is non-fatal.
// Worst case the cart is in-memory only and empties on reload.
function cartLoad() {
  try {
    var raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;
    var parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) cart = parsed.filter(cartLineIsValid);
  } catch (e) {
    cart = [];
  }
}

function cartSave() {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    /* ignore — cart still works for this page load */
  }
}

// A stored cart can outlive a catalogue change (product renamed, variant sold out,
// item removed entirely). Re-validate against PRODUCTS on load so a stale line
// can't reach checkout as a SKU the server no longer knows.
function cartLineIsValid(line) {
  if (!line || typeof line.sku !== 'string') return false;
  var p = PRODUCTS.find(function (x) { return x.id === line.productId; });
  if (!p) return false;
  var size = p.sizes && p.sizes.find(function (s) { return s.label === line.sizeLabel; });
  if (p.sizes && p.sizes.length && (!size || size.soldOut)) return false;
  if (p.colors && p.colors.length) {
    var col = p.colors.find(function (c) { return c.label === line.colorLabel; });
    if (!col) return false;
  }
  return typeof line.qty === 'number' && line.qty > 0;
}

function cartAdd(item) {
  var sku = cartSku(item.productId, item.colorLabel, item.sizeLabel);
  var existing = cart.find(function (l) { return l.sku === sku; });

  if (existing) {
    existing.qty = Math.min(existing.qty + (item.qty || 1), CART_MAX_QTY);
  } else {
    cart.push({
      sku: sku,
      productId: item.productId,
      name: item.name,
      colorLabel: item.colorLabel || null,
      sizeLabel: item.sizeLabel || null,
      priceCents: item.priceCents,
      image: item.image,
      qty: Math.min(item.qty || 1, CART_MAX_QTY)
    });
  }
  cartChanged();
}

function cartRemove(sku) {
  cart = cart.filter(function (l) { return l.sku !== sku; });
  cartChanged();
}

function cartSetQty(sku, qty) {
  var line = cart.find(function (l) { return l.sku === sku; });
  if (!line) return;
  if (qty < 1) { cartRemove(sku); return; }
  line.qty = Math.min(qty, CART_MAX_QTY);
  cartChanged();
}

function cartClear() {
  cart = [];
  cartChanged();
}

function cartCount() {
  return cart.reduce(function (n, l) { return n + l.qty; }, 0);
}

function cartSubtotalCents() {
  return cart.reduce(function (n, l) { return n + l.priceCents * l.qty; }, 0);
}

function onCartChange(fn) {
  cartListeners.push(fn);
}

function cartChanged() {
  cartSave();
  cartListeners.forEach(function (fn) { fn(); });
}

// 3500 -> "35,00 €"
function formatEur(cents) {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
}

cartLoad();
