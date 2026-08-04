# havefungoods — project rules

Static e-shop. No framework, no build step, no bundler, no package.json.

## Hard rules

- **Vanilla JS only.** No React, no Vue, no jQuery, no npm dependencies in the
  frontend. Do not propose a build step. If a task seems to need one, say so and
  stop — do not introduce one.
- **Do not rewrite this into a framework.** This has been decided; it is not open.
- `styles.css` is hand-written CSS. No Tailwind, no preprocessor.
- Courier New site-wide is a deliberate design choice by the client, not a bug.
- Brutalist styling: pure black/white, hard 1px borders, no shadows, no
  transitions on hover. Do not "soften" it.

## File layout

```
index.html                markup only; one shared <header>/<footer> outside the views
styles.css                all styles
products.js               PRODUCTS array (display price + priceCents)
cart.js                   cart state + localStorage; no DOM
app.js                    carousel, shop grid, navigation, detail, cart UI, checkout
netlify/functions/        create-checkout-session.js + prices.js (SKU -> price ID)
netlify.toml              publish + functions config, no build command
images/                   product + journey photos (tracked in git; see .claudeignore)
```

Script order in `index.html` is load-bearing: `products.js` -> `cart.js` -> `app.js`.

The serverless function is deliberately written against the Stripe REST API with
plain `fetch` — no `stripe` npm package, no `package.json`. Keep it that way.

## How views work

Exactly one view is visible at a time. `showView(name)` in `app.js` sets
`document.body.className = 'view-' + name`; the matching rules live under
`VIEW SWITCHING` in `styles.css`. Do not go back to toggling inline
`style.display` on individual containers.

There is no URL routing yet — refresh always lands on home, and there are no
shareable product links. Hash routing is planned but not yet done.

## Cart

The cart is client-side only. A line is keyed by SKU: `productId::color::size`
(`-` when a product has no colours), built by `cartSku()`. Adding the same
variant twice bumps quantity rather than adding a second line.

`cart.js` holds state and never touches the DOM; `app.js` subscribes via
`onCartChange()`. Keep that split.

**The browser never sends prices.** Checkout posts only SKUs and quantities;
`prices.js` on the server resolves each SKU to a Stripe price ID. `priceCents`
in `products.js` is for showing subtotals and nothing else. Do not "simplify"
this by sending amounts from the client.

A stored cart is re-validated against `PRODUCTS` on load, so a variant that
sold out since the customer's last visit is dropped rather than reaching checkout.

## Known open work (do not "fix" silently — these are tracked)

1. **Stripe price IDs are not filled in.** `netlify/functions/prices.js` is all
   `price_REPLACE_ME`. Checkout returns "not configured yet" until they are set.
   This is the one thing blocking a working order.
2. **Payment Links are now unused.** `stripeLink` still sits in `products.js` as
   a fallback reference; delete it once Checkout Session is confirmed working.
3. Shipping rates do not exist yet. The function reads optional
   `STRIPE_SHIPPING_RATE_*` env vars; with none set, customers pay zero postage.
   The client wanted tiered rates (base + per extra item), which Stripe's flat
   shipping rates cannot express — this decision is still open.
4. Legal texts (Returns, terms, GDPR, seller identification) are missing and
   are the client's responsibility.
5. Nav items are `<a onclick>` with no href — not keyboard accessible.
   Planned fix: `<button>`. Now a single place in the shared header.
6. Images are full-size JPGs with no `loading="lazy"` and no `srcset`.
