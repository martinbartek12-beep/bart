// ===================== HOME / MARQUEE KARUSEL =====================
var track = document.getElementById('carousel-track');

// The 5-Panel Cap's thumbnail color cycles every time the marquee completes
// one full rotation: 1st pass = Black, 2nd pass = Chilli Red, 3rd pass = Olive Green, then repeats.
var CAP_COLOR_CYCLE = ['Black', 'Chilli Red', 'Olive Green'];
var CAP_THUMBS = {
  'Black': 'images/five-panel-cap-black-thumb.jpg',
  'Chilli Red': 'images/five-panel-cap-red-thumb.jpg',
  'Olive Green': 'images/five-panel-cap-olive-thumb.jpg'
};
var currentCapColorIndex = 0;

function buildCard(p) {
  var card = document.createElement('div');
  card.className = 'carousel-card';

  var img = document.createElement('img');
  if (p.id === 'five-panel-cap') {
    img.className = 'cap-carousel-img';
    img.src = CAP_THUMBS[CAP_COLOR_CYCLE[currentCapColorIndex]];
  } else {
    img.src = p.images[0];
  }
  img.alt = p.name;
  card.appendChild(img);

  var nameEl = document.createElement('div');
  nameEl.className = 'carousel-name';
  nameEl.textContent = p.name;
  card.appendChild(nameEl);

  card.addEventListener('click', function () {
    var presetColor = p.id === 'five-panel-cap' ? CAP_COLOR_CYCLE[currentCapColorIndex] : undefined;
    openDetail(p.id, 'home', presetColor);
  });

  return card;
}

function renderCarousel() {
  track.innerHTML = '';
  // cards twice in a row → the auto-scroll can rewind by exactly one copy for a seamless loop
  PRODUCTS.forEach(function (p) { track.appendChild(buildCard(p)); });
  PRODUCTS.forEach(function (p) { track.appendChild(buildCard(p)); });
}
renderCarousel();

// --- dragging the marquee ---------------------------------------------------
// The scrolling itself is the CSS animation above, which the browser runs on the
// GPU and keeps perfectly smooth. Dragging is layered on top: while a finger (or
// mouse, or trackpad) is moving the carousel, the animation is turned off and
// the transform is set directly; afterwards the animation restarts with a
// negative delay so it continues from wherever the drag ended rather than
// snapping back to the start.

var carouselWrap = document.querySelector('.carousel-wrap');
var MARQUEE_DURATION = 40;   // must match the animation duration in styles.css

var dragging = false;
var dragStartX = 0;
var dragStartOffset = 0;
var dragOffset = 0;
var resumeTimer = null;

// One full loop is half the track, because every product is rendered twice.
function loopWidth() {
  return track.scrollWidth / 2;
}

// Where the marquee currently sits, in pixels, read straight off the transform
// the browser has applied.
function currentOffset() {
  var t = getComputedStyle(track).transform;
  if (!t || t === 'none') return 0;
  var m = t.match(/matrix.*\((.+)\)/);
  if (!m) return 0;
  var parts = m[1].split(', ');
  // translateX is the 5th value in matrix(), the 13th in matrix3d()
  var x = parts.length === 6 ? parseFloat(parts[4]) : parseFloat(parts[12]);
  return -x || 0;
}

function startDrag(clientX) {
  if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null; }
  dragStartOffset = currentOffset();
  dragOffset = dragStartOffset;
  dragStartX = clientX;
  dragging = true;
  track.classList.add('dragging');
  track.style.transform = 'translateX(' + -dragOffset + 'px)';
}

function moveDrag(clientX) {
  if (!dragging) return;
  var loop = loopWidth();
  // Dragging left (negative delta) advances the marquee, matching its direction.
  dragOffset = dragStartOffset + (dragStartX - clientX);
  // Keep it inside one loop so the transform never runs off the rendered cards.
  if (loop > 0) dragOffset = ((dragOffset % loop) + loop) % loop;
  track.style.transform = 'translateX(' + -dragOffset + 'px)';
}

function endDrag() {
  if (!dragging) return;
  dragging = false;
  track.classList.remove('dragging');
  resumeFrom(dragOffset);
}

// Restart the animation partway through, so it carries on from `offset`
// instead of jumping back to zero.
function resumeFrom(offset) {
  var loop = loopWidth();
  if (loop <= 0) return;
  var progress = (((offset % loop) + loop) % loop) / loop;
  track.style.transform = '';
  track.style.animationDelay = -(progress * MARQUEE_DURATION) + 's';
}

// --- pointer (covers touch, mouse and pen) ---
carouselWrap.addEventListener('pointerdown', function (e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  startDrag(e.clientX);
});

carouselWrap.addEventListener('pointermove', function (e) {
  if (!dragging) return;
  e.preventDefault();   // don't let the browser text-select mid-drag
  moveDrag(e.clientX);
});

window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

// A drag shouldn't also count as a click on the card underneath.
carouselWrap.addEventListener('click', function (e) {
  if (Math.abs(dragOffset - dragStartOffset) > 5) {
    e.stopPropagation();
    e.preventDefault();
  }
}, true);

// --- trackpad / wheel ---
// Two-finger horizontal swipes arrive as wheel events with deltaX.
carouselWrap.addEventListener('wheel', function (e) {
  if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;  // vertical: let the page scroll
  e.preventDefault();

  if (resumeTimer) clearTimeout(resumeTimer);
  var loop = loopWidth();
  if (!track.classList.contains('dragging')) {
    dragOffset = currentOffset();
    track.classList.add('dragging');
  }
  dragOffset += e.deltaX;
  if (loop > 0) dragOffset = ((dragOffset % loop) + loop) % loop;
  track.style.transform = 'translateX(' + -dragOffset + 'px)';

  // Wheel events have no "end", so resume once they stop arriving.
  resumeTimer = setTimeout(function () {
    track.classList.remove('dragging');
    resumeFrom(dragOffset);
  }, 250);
}, { passive: false });

// --- pause on hover, so cards are easier to click ---
carouselWrap.addEventListener('mouseenter', function () {
  if (!dragging) track.classList.add('paused');
});
carouselWrap.addEventListener('mouseleave', function () {
  track.classList.remove('paused');
});

// The cap thumbnail cycles once per full rotation of the marquee.
track.addEventListener('animationiteration', function () {
  currentCapColorIndex = (currentCapColorIndex + 1) % CAP_COLOR_CYCLE.length;
  var newSrc = CAP_THUMBS[CAP_COLOR_CYCLE[currentCapColorIndex]];
  document.querySelectorAll('.cap-carousel-img').forEach(function (img) { img.src = newSrc; });
});

// ===================== SHOP VIEW (grid) =====================
var shopGrid = document.getElementById('shop-grid');

function renderShop() {
  shopGrid.innerHTML = '';
  PRODUCTS.forEach(function (p) {
    var card = document.createElement('div');
    card.className = 'shop-card';

    var img = document.createElement('img');
    // Below the fold on most screens, so let the browser defer it.
    img.loading = 'lazy';
    img.src = p.id === 'five-panel-cap' ? 'images/five-panel-cap-black-thumb.jpg' : p.images[0];
    img.alt = p.name;
    card.appendChild(img);

    var info = document.createElement('div');
    info.className = 'shop-card-info';

    var nameEl = document.createElement('div');
    nameEl.className = 'shop-card-name';
    nameEl.textContent = p.name;
    info.appendChild(nameEl);

    var priceEl = document.createElement('div');
    priceEl.className = 'shop-card-price';
    priceEl.textContent = p.price;
    info.appendChild(priceEl);

    card.appendChild(info);

    card.addEventListener('click', function () { openDetail(p.id, 'shop'); });

    shopGrid.appendChild(card);
  });
}
renderShop();

// ===================== PAGE NAVIGATION =====================
// Views are switched via a class on <body> (see "VIEW SWITCHING" in styles.css),
// not by setting inline display on each container. One place to change, and the
// shared header/footer stay outside the view containers.

var lastView = 'home';

function showView(name) {
  document.body.className = 'view-' + name;
  window.scrollTo(0, 0);
}

function goHome()    { showView('home');    lastView = 'home'; }
function goShop()    { showView('shop');    lastView = 'shop'; }
function goJourney() { showView('journey'); lastView = 'journey'; }
// Kept even though the nav link is commented out in index.html — restoring the
// link is then a one-line change.
function goInfo()    { showView('info');    lastView = 'info'; }

function goBack() {
  if (lastView === 'shop') { goShop(); }
  else if (lastView === 'journey') { goJourney(); }
  else if (lastView === 'info') { goInfo(); }
  else { goHome(); }
}

// ===================== DETAIL PRODUKTU =====================
var detailMainImg = document.getElementById('detail-main-img');
var detailThumbs = document.getElementById('detail-thumbs');
var detailName = document.getElementById('detail-name');
var detailPrice = document.getElementById('detail-price');
var detailDescription = document.getElementById('detail-description');
var sizeOptions = document.getElementById('size-options');
var sizeBlock = document.getElementById('size-block');
var colorOptions = document.getElementById('color-options');
var colorBlock = document.getElementById('color-block');
var detailBuyBtn = document.getElementById('detail-buy-btn');

// The selection the customer is currently looking at. Before the cart existed,
// size was styled but never stored — that's why orders arrived without a size.
var currentProduct = null;
var selectedColorLabel = null;
var selectedSizeLabel = null;

function openDetail(productId, fromView, presetColorLabel) {
  var p = PRODUCTS.find(function (x) { return x.id === productId; });
  if (!p) return;

  lastView = fromView || 'home';

  currentProduct = p;
  selectedColorLabel = null;
  selectedSizeLabel = null;

  detailName.textContent = p.name;
  detailPrice.textContent = p.price;

  if (p.description) {
    detailDescription.style.display = 'block';
    detailDescription.textContent = p.description;
  } else {
    detailDescription.style.display = 'none';
  }

  // gallery (extracted so color swatches can swap it)
  function renderGallery(images) {
    detailMainImg.src = images[0];
    detailMainImg.alt = p.name;
    detailThumbs.innerHTML = '';
    if (images.length > 1) {
      detailThumbs.style.display = 'flex';
      images.forEach(function (src, i) {
        var t = document.createElement('img');
        t.loading = 'lazy';
        t.src = src;
        t.className = i === 0 ? 'active' : '';
        t.addEventListener('click', function () {
          detailMainImg.src = src;
          detailThumbs.querySelectorAll('img').forEach(function (el) { el.classList.remove('active'); });
          t.classList.add('active');
        });
        detailThumbs.appendChild(t);
      });
    } else {
      detailThumbs.style.display = 'none';
    }
  }

  // colors
  if (p.colors && p.colors.length > 0) {
    colorBlock.style.display = 'block';
    colorOptions.innerHTML = '';
    var presetIndex = 0;
    if (presetColorLabel) {
      var foundIdx = p.colors.findIndex(function (c) { return c.label === presetColorLabel; });
      if (foundIdx !== -1) presetIndex = foundIdx;
    }
    p.colors.forEach(function (c, i) {
      var btn = document.createElement('button');
      btn.className = 'color-swatch' + (i === presetIndex ? ' selected' : '');
      btn.title = c.label;

      var dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = c.hex;
      btn.appendChild(dot);

      var label = document.createElement('span');
      label.className = 'color-label';
      label.textContent = c.label;
      btn.appendChild(label);

      btn.addEventListener('click', function () {
        colorOptions.querySelectorAll('.color-swatch').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        selectedColorLabel = c.label;
        if (c.images && c.images.length > 0) {
          renderGallery(c.images);
        }
      });

      colorOptions.appendChild(btn);
    });
    // initial gallery = preset color's (if any), else product default
    var initialImages = (p.colors[presetIndex] && p.colors[presetIndex].images) ? p.colors[presetIndex].images : p.images;
    renderGallery(initialImages);
    selectedColorLabel = p.colors[presetIndex] ? p.colors[presetIndex].label : null;
  } else {
    colorBlock.style.display = 'none';
    renderGallery(p.images);
  }

  // sizes
  if (p.sizes && p.sizes.length > 0) {
    sizeBlock.style.display = 'block';
    sizeOptions.innerHTML = '';
    var firstAvailableSet = false;
    p.sizes.forEach(function (s) {
      var btn = document.createElement('button');
      btn.className = 'size-btn';
      btn.textContent = s.label;

      if (s.soldOut) {
        btn.classList.add('sold-out');
        btn.disabled = true;
      } else {
        if (!firstAvailableSet) {
          btn.classList.add('selected');
          selectedSizeLabel = s.label;
          firstAvailableSet = true;
        }
        btn.addEventListener('click', function () {
          sizeOptions.querySelectorAll('.size-btn').forEach(function (b) { b.classList.remove('selected'); });
          btn.classList.add('selected');
          selectedSizeLabel = s.label;
        });
      }

      sizeOptions.appendChild(btn);
    });
  } else {
    sizeBlock.style.display = 'none';
  }

  showView('detail');
}

// ===================== CART UI =====================
var cartCountEl = document.getElementById('cart-count');
var cartLinesEl = document.getElementById('cart-lines');
var cartEmptyEl = document.getElementById('cart-empty');
var cartSummaryEl = document.getElementById('cart-summary');
var cartSubtotalEl = document.getElementById('cart-subtotal');
var checkoutBtn = document.getElementById('checkout-btn');
var checkoutError = document.getElementById('checkout-error');
var cartZoneSelect = document.getElementById('cart-zone-select');
var cartShippingEl = document.getElementById('cart-shipping');
var cartTotalEl = document.getElementById('cart-total');

// Display only — the amount actually charged comes from the Stripe shipping rate
// picked server-side for this zone. If you change a rate in Stripe, change it
// here too, or the cart will quote one number and the checkout another.
var SHIPPING_CENTS = {
  local: 600,
  europe: 1600,
  asia: 3000
};

function goCart() { showView('cart'); lastView = 'cart'; }

// ADD TO CART now genuinely adds. The variant the customer is looking at is read
// from selectedColorLabel / selectedSizeLabel, so size finally survives the click.
detailBuyBtn.addEventListener('click', function () {
  if (!currentProduct) return;

  cartAdd({
    productId: currentProduct.id,
    name: currentProduct.name,
    colorLabel: selectedColorLabel,
    sizeLabel: selectedSizeLabel,
    priceCents: currentProduct.priceCents,
    image: detailMainImg.src,
    qty: 1
  });

  // brief confirmation, then let them keep browsing rather than yanking them away
  detailBuyBtn.textContent = 'ADDED ✓';
  detailBuyBtn.disabled = true;
  setTimeout(function () {
    detailBuyBtn.textContent = 'ADD TO CART';
    detailBuyBtn.disabled = false;
  }, 1200);
});

function renderCartCount() {
  var n = cartCount();
  cartCountEl.textContent = n > 0 ? '(' + n + ')' : '';
}

function renderCart() {
  cartLinesEl.innerHTML = '';

  if (cart.length === 0) {
    cartEmptyEl.style.display = 'block';
    cartSummaryEl.style.display = 'none';
    return;
  }
  cartEmptyEl.style.display = 'none';
  cartSummaryEl.style.display = 'block';

  cart.forEach(function (line) {
    var row = document.createElement('div');
    row.className = 'cart-line';

    var img = document.createElement('img');
    img.loading = 'lazy';
    img.src = line.image;
    img.alt = line.name;
    row.appendChild(img);

    var info = document.createElement('div');
    info.className = 'cart-line-info';

    var name = document.createElement('div');
    name.className = 'cart-line-name';
    name.textContent = line.name;
    info.appendChild(name);

    var variantBits = [];
    if (line.colorLabel && line.colorLabel !== '-') variantBits.push(line.colorLabel);
    if (line.sizeLabel && line.sizeLabel !== '-') variantBits.push('Size ' + line.sizeLabel);
    if (variantBits.length) {
      var variant = document.createElement('div');
      variant.className = 'cart-line-variant';
      variant.textContent = variantBits.join(' / ');
      info.appendChild(variant);
    }

    var unit = document.createElement('div');
    unit.className = 'cart-line-unit';
    unit.textContent = formatEur(line.priceCents);
    info.appendChild(unit);

    row.appendChild(info);

    var qtyWrap = document.createElement('div');
    qtyWrap.className = 'cart-qty';

    var minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', 'Decrease quantity of ' + line.name);
    minus.addEventListener('click', function () { cartSetQty(line.sku, line.qty - 1); });
    qtyWrap.appendChild(minus);

    var qty = document.createElement('span');
    qty.className = 'cart-qty-value';
    qty.textContent = line.qty;
    qtyWrap.appendChild(qty);

    var plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.disabled = line.qty >= CART_MAX_QTY;
    plus.setAttribute('aria-label', 'Increase quantity of ' + line.name);
    plus.addEventListener('click', function () { cartSetQty(line.sku, line.qty + 1); });
    qtyWrap.appendChild(plus);

    row.appendChild(qtyWrap);

    var lineTotal = document.createElement('div');
    lineTotal.className = 'cart-line-total';
    lineTotal.textContent = formatEur(line.priceCents * line.qty);
    row.appendChild(lineTotal);

    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'cart-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Remove ' + line.name + ' from cart');
    remove.addEventListener('click', function () { cartRemove(line.sku); });
    row.appendChild(remove);

    cartLinesEl.appendChild(row);
  });

  cartSubtotalEl.textContent = formatEur(cartSubtotalCents());
  renderTotals();
}

function renderTotals() {
  var shipping = SHIPPING_CENTS[cartZoneSelect.value] || 0;
  cartShippingEl.textContent = formatEur(shipping);
  cartTotalEl.textContent = formatEur(cartSubtotalCents() + shipping);
}

cartZoneSelect.addEventListener('change', renderTotals);

onCartChange(function () {
  renderCartCount();
  renderCart();
});

// ===================== CHECKOUT =====================
// The browser sends SKUs and quantities only. The serverless function maps each
// SKU to a Stripe price ID and builds the Checkout Session, so prices can't be
// tampered with client-side. Shipping is picked in Stripe Checkout, not here.
// Cloudflare Pages Functions route by file path: the handler lives at
// functions/api/create-checkout-session.js, so it answers here.
var CHECKOUT_ENDPOINT = '/api/create-checkout-session';

checkoutBtn.addEventListener('click', function () {
  if (cart.length === 0) return;

  checkoutError.style.display = 'none';
  checkoutBtn.disabled = true;
  checkoutBtn.textContent = 'REDIRECTING…';

  fetch(CHECKOUT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      zone: cartZoneSelect.value,
      items: cart.map(function (l) { return { sku: l.sku, qty: l.qty }; })
    })
  })
    .then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw new Error(body.error || 'Checkout failed');
        return body;
      });
    })
    .then(function (body) {
      if (!body.url) throw new Error('No checkout URL returned');
      window.location.href = body.url;
    })
    .catch(function (err) {
      checkoutError.textContent = err.message + ' — please try again, or contact us if it keeps happening.';
      checkoutError.style.display = 'block';
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = 'CHECKOUT';
    });
});

// ===================== INIT =====================
document.getElementById('year').textContent = new Date().getFullYear();
renderCartCount();
renderCart();
goHome();
