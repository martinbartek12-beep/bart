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
                          views: home, shop, detail, info, journey, cart
styles.css                all styles
products.js               PRODUCTS array (display price + priceCents)
cart.js                   cart state + localStorage; no DOM
app.js                    carousel, shop grid, navigation, detail, cart UI, checkout
functions/api/            Cloudflare Pages Functions — file path IS the route
  create-checkout-session.js   also holds the SKU -> Stripe price ID map
_headers                  security headers
_routes.json              only /api/* invokes a Function; static stays free
images/                   product + journey photos (tracked in git; see .claudeignore)
```

Script order in `index.html` is load-bearing: `products.js` -> `cart.js` -> `app.js`.

The serverless function is deliberately written against the Stripe REST API with
plain `fetch` — no `stripe` npm package, no `package.json`. Keep it that way.

## Hosting

Cloudflare Pages, deployed from the `main` branch of GitHub. No build command;
build output directory is `/`. Moved off Netlify because its free plan bills for
bandwidth and pauses the site when credits run out — unacceptable for a shop.

Anything inside `functions/` becomes a public route, which is why the price map
is inlined into the function rather than sitting in its own file.

Environment variables live in the Cloudflare dashboard under Settings ->
Variables and Secrets, and must be set for **both Production and Preview**.
Changing one needs a redeploy to take effect:

| Variable | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` (mark as Secret) |
| `SITE_URL` | site URL, no trailing slash |
| `STRIPE_SHIPPING_RATE_LOCAL` | `shr_...` CZ/SK, 6 EUR |
| `STRIPE_SHIPPING_RATE_EU` | `shr_...` Europe, 16 EUR |
| `STRIPE_SHIPPING_RATE_ASIA` | `shr_...` Asia, 30 EUR |

Shipping amounts are duplicated in `SHIPPING_CENTS` in `app.js` for the cart
display. Change a rate in Stripe and you must change it there too, or the cart
quotes one number and the checkout charges another.

## How views work

Exactly one view is visible at a time. `showView(name)` in `app.js` sets
`document.body.className = 'view-' + name`; the matching rules live under
`VIEW SWITCHING` in `styles.css`. Do not go back to toggling inline
`style.display` on individual containers.

There is no URL routing yet — refresh always lands on home, and there are no
shareable product links. Hash routing is planned but not yet done.

## Pages

THANK YOU is not in the nav — it only appears when Stripe returns the customer
to `/?checkout=success`. It is also the only place `cartClear()` is called:
emptying the cart when CHECKOUT is pressed would wipe someone's basket the
moment they backed out on Stripe's page. `?checkout=cancelled` drops them back
into the cart with everything intact.

THE JOURNEY holds the brand story (founders, Seoul pop-ups, move to Prague).
INFO (formerly "About") is **hidden from the nav** — the shipping table moved to
the cart, which left only a "coming soon" line, and an empty tab looks worse than
none. The view and goInfo() still exist; uncomment the nav link in index.html to
bring it back once it has returns policy, contact and seller details.

## Cart

The cart is client-side only. A line is keyed by SKU: `productId::color::size`
(`-` when a product has no colours), built by `cartSku()`. Adding the same
variant twice bumps quantity rather than adding a second line.

`cart.js` holds state and never touches the DOM; `app.js` subscribes via
`onCartChange()`. Keep that split.

**The browser never sends prices.** Checkout posts only SKUs, quantities and a
shipping zone; the `PRICES` map inside the Function resolves each SKU to a Stripe
price ID. `priceCents` in `products.js` is for showing subtotals and nothing
else. Do not "simplify" this by sending amounts from the client.

A stored cart is re-validated against `PRODUCTS` on load, so a variant that
sold out since the customer's last visit is dropped rather than reaching checkout.

## Known open work (do not "fix" silently — these are tracked)

1. **Everything is still in Stripe test mode.** The `PRICES` map holds sandbox
   IDs and the key is `sk_test_`. Going live means recreating the products and
   the three shipping rates in live mode, swapping every ID, and switching the
   key — test and live share nothing.
2. **Legal texts are missing** — returns policy, terms, GDPR, and above all
   seller identification. Nothing on the site says who is selling. Legally
   required before taking real money. Client's responsibility; INFO is where
   they go, and unhiding that nav link is the last step.
3. **Flat shipping rates are a compromise.** The client wanted base + per extra
   item; Stripe flat rates cannot express that, so one price per zone was chosen
   (6 / 16 / 30 EUR). Multi-item orders lose money on postage. Revisit if the
   order mix turns out to skew large.
4. **US and Canada are excluded on purpose.** The US de minimis exemption ended
   in August 2025, so every parcel is dutiable and a refused delivery lands the
   cost on the seller. Not an oversight — do not "fix" the country list.
5. `stripeLink` still sits in `products.js` from the Payment Links era. Nothing
   reads it. Safe to delete.
6. Nav items are `<a onclick>` with no href — not keyboard accessible.
   Planned fix: `<button>`. Now a single place in the shared header.
7. No stock tracking. When Big Cartel is switched off, nothing stops a sold-out
   item being ordered. Sold-out sizes are hardcoded in `products.js`.
8. Images are lazy-loaded and resized to 1200px, but there is no `srcset`, so
   phones download desktop-sized files.
9. No hash routing, so no shareable product links and refresh always lands home.
