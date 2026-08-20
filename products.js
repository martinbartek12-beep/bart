// For each product, edit "images" (multiple angles), "description" and "stripeLink".
// For sizes: { label: 'M', soldOut: true } = sold out (not selectable, struck through).
//
// price      = display string, shown to the customer as-is (comma decimal, euro sign)
// priceCents = the same amount as an integer, used for cart subtotals ONLY.
//              It is never sent to Stripe — the real charge comes from the price ID
//              looked up server-side in netlify/functions/prices.js. If the two ever
//              disagree, Stripe wins and the customer sees a different total, so keep
//              them in sync.
var PRODUCTS = [
  {
    id: 'five-panel-cap',
    name: '5-Panel Cap',
    // Shown as a badge on the shop card and above the buy button. Under EU
    // consumer law a pre-order has to tell the customer when it will arrive,
    // so keep a concrete timeframe in here — never just "soon".
    badge: 'PRE-ORDER',
    note: 'PRE-ORDER: This item is currently available for pre-order. Please allow 2-3 weeks for production and delivery. Payment is taken now. Good things take time!',
    price: '45,00 €',
    priceCents: 4500,
    description: '5-panel cap with embroidered logo.',
    images: ['images/five-panel-cap-black-1.jpg', 'images/five-panel-cap-black-2.jpg'],
    sizes: [
      { label: 'ONE SIZE', soldOut: false }
    ],
    colors: [
      { label: 'Black', hex: '#1a1a1a', images: ['images/five-panel-cap-black-1.jpg', 'images/five-panel-cap-black-2.jpg'], stripeLink: 'https://buy.stripe.com/aFa14ofu97f356S7TsbMQ05' },
      { label: 'Olive Green', hex: '#6b6b3a', images: ['images/five-panel-cap-olive-1.jpg', 'images/five-panel-cap-olive-2.jpg'], stripeLink: 'https://buy.stripe.com/4gM5kE3Lr9nb42O1v4bMQ07' },
      { label: 'Chilli Red', hex: '#b3261e', images: ['images/five-panel-cap-red-1.jpg', 'images/five-panel-cap-red-2.jpg'], stripeLink: 'https://buy.stripe.com/eVqbJ20zfeHveHs7TsbMQ06' }
    ],
    stripeLink: 'https://buy.stripe.com/aFa14ofu97f356S7TsbMQ05'
  },
  {
    id: 'blue-t-shirt',
    name: 'Blue T-shirt',
    price: '35,00 €',
    priceCents: 3500,
    description: 'All cotton T-shirt with dotted HF hearts.',
    images: ['images/blue-t-shirt-1.jpg'],
    sizes: [
      { label: 'M', soldOut: true },
      { label: 'L', soldOut: false },
      { label: 'XL', soldOut: false }
    ],
    stripeLink: 'https://buy.stripe.com/aFaeVe0zfarfgPA8XwbMQ00'
  },
  {
    id: '500-chicken-fingies',
    name: '500-chicken fingies tee',
    price: '35,00 €',
    priceCents: 3500,
    description: 'All cotton T-shirt with digital print.',
    images: ['images/500-chicken-fingies-1.jpg'],
    sizes: [
      { label: 'M', soldOut: true },
      { label: 'L', soldOut: false }
    ],
    stripeLink: 'https://buy.stripe.com/4gMeVe81H9nb7f05LkbMQ01'
  },
  {
    id: 'chicken-a-dip-tee',
    name: 'chicken a dip tee',
    price: '35,00 €',
    priceCents: 3500,
    description: 'All cotton T-shirt with digital print.',
    images: ['images/chicken-a-dip-tee-1.jpg'],
    sizes: [
      { label: 'M', soldOut: true },
      { label: 'L', soldOut: false }
    ],
    stripeLink: 'https://buy.stripe.com/7sY3cweq5dDrfLwb5EbMQ02'
  },
  {
    id: 'camo-hoodie-green-yellow',
    name: 'Camo hoodie - green/yellow',
    price: '75,00 €',
    priceCents: 7500,
    description: 'Camo hoodie with silkscreen print and double zip. Model 183cm.',
    images: ['images/camo-hoodie-green-yellow-1.jpg', 'images/camo-hoodie-green-yellow-2.jpg'],
    sizes: [
      { label: 'ONE SIZE', soldOut: false }
    ],
    stripeLink: 'https://buy.stripe.com/aFaaEYfu99nb0QCb5EbMQ03'
  },
  {
    id: 'reversible-beanie',
    name: 'reversible beanie',
    price: '28,00 €',
    priceCents: 2800,
    description: 'feels like u have two beanies',
    images: [
      'images/reversible-beanie-1.jpg',
      'images/reversible-beanie-2.jpg',
      'images/reversible-beanie-3.jpg',
      'images/reversible-beanie-4.jpg'
    ],
    sizes: [
      { label: 'ONE SIZE', soldOut: false }
    ],
    stripeLink: 'https://buy.stripe.com/5kQ6oI6XDfLz6aWb5EbMQ04'
  }
];
