(function exposeTemplates(root, factory) {
  const templates = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = templates;
  else root.invitationTemplates = templates;
})(typeof globalThis !== "undefined" ? globalThis : this, function buildTemplates() {
  return [
    { id: "ivory-garden", name: "Ivory Garden", category: "Wedding", price: 49, tier: "Essential", description: "Airy florals, classic serif type, and a graceful centered ceremony card.", accent: "#8a6846", canvas: "#f1ece4", paper: "#fffdf8", layout: "classic" },
    { id: "olive-press", name: "Olive Press", category: "Wedding", price: 49, tier: "Essential", description: "Mediterranean green, fine rules, and understated editorial typography.", accent: "#586747", canvas: "#dfe4d8", paper: "#fbfcf7", layout: "bordered" },
    { id: "blush-letter", name: "Blush Letter", category: "Engagement", price: 49, tier: "Essential", description: "A romantic letter-style invitation with blush paper and delicate details.", accent: "#a65f67", canvas: "#ead7d8", paper: "#fff8f7", layout: "letter" },
    { id: "baptism-light", name: "Baptism Light", category: "Baptism", price: 49, tier: "Essential", description: "Luminous white and powder blue with a calm, ceremonial composition.", accent: "#64849c", canvas: "#dce8ee", paper: "#ffffff", layout: "halo" },
    { id: "confetti-pop", name: "Confetti Pop", category: "Birthday", price: 49, tier: "Essential", description: "Bright, playful color blocks for joyful birthdays and family celebrations.", accent: "#e34665", canvas: "#ffd84d", paper: "#fffdf4", layout: "playful" },
    { id: "corporate-line", name: "Corporate Line", category: "Business", price: 49, tier: "Essential", description: "A crisp schedule-first design for launches, openings, and company events.", accent: "#236b68", canvas: "#dce8e5", paper: "#ffffff", layout: "agenda" },

    { id: "midnight-oud", name: "Midnight Oud", category: "Wedding", price: 69, tier: "Signature", description: "Charcoal, warm gold, and a formal evening mood with cinematic presence.", accent: "#d2a85e", canvas: "#111619", paper: "#191f22", layout: "cinematic" },
    { id: "terracotta-vows", name: "Terracotta Vows", category: "Wedding", price: 69, tier: "Signature", description: "Warm clay tones and architectural arches for modern destination weddings.", accent: "#a54f36", canvas: "#d8a28a", paper: "#fff8f0", layout: "arch" },
    { id: "coastal-blue", name: "Coastal Blue", category: "Wedding", price: 69, tier: "Signature", description: "Sea-glass blue, open spacing, and a relaxed Mediterranean rhythm.", accent: "#39778a", canvas: "#c8dfe3", paper: "#f8ffff", layout: "coastal" },
    { id: "little-star", name: "Little Star", category: "Baptism", price: 69, tier: "Signature", description: "A gentle celestial layout for baptisms, newborn welcomes, and first birthdays.", accent: "#b58b3b", canvas: "#dce5f2", paper: "#fffdf8", layout: "celestial" },
    { id: "modern-monogram", name: "Modern Monogram", category: "Celebration", price: 69, tier: "Signature", description: "Large initials, clean geometry, and a confident contemporary grid.", accent: "#c3483f", canvas: "#e8e2dc", paper: "#fffdf9", layout: "monogram" },
    { id: "cedar-evening", name: "Cedar Evening", category: "Engagement", price: 69, tier: "Signature", description: "Deep cedar green and candle gold for an intimate Lebanese evening.", accent: "#d5ad62", canvas: "#173a32", paper: "#f7f2e7", layout: "split" },
    { id: "disco-bloom", name: "Disco Bloom", category: "Birthday", price: 69, tier: "Signature", description: "Bold floral energy and graphic type for a polished party invitation.", accent: "#6d45a3", canvas: "#f08ca8", paper: "#fff7df", layout: "poster" },

    { id: "sage-majlis", name: "Sage Majlis", category: "Wedding", price: 89, tier: "Premium", description: "A bilingual-ready, hospitality-led layout with soft botanical framing.", accent: "#2f7b68", canvas: "#cfded5", paper: "#f7faf4", layout: "majlis" },
    { id: "cathedral-gold", name: "Cathedral Gold", category: "Baptism", price: 89, tier: "Premium", description: "Sacred symmetry, cream stone, and restrained gold for church ceremonies.", accent: "#9a7436", canvas: "#d8d0bf", paper: "#fffdf7", layout: "cathedral" },
    { id: "editorial-black", name: "Editorial Black", category: "Business", price: 89, tier: "Premium", description: "Fashion-editorial scale and sharp contrast for launches and private events.", accent: "#f0d957", canvas: "#0b0b0b", paper: "#f4f1e8", layout: "editorial" },
    { id: "wildflower-arch", name: "Wildflower Arch", category: "Celebration", price: 89, tier: "Premium", description: "Layered botanical color and an immersive arched invitation frame.", accent: "#a9465d", canvas: "#d7c6aa", paper: "#fffaf1", layout: "botanical" },
    { id: "moonlit-romance", name: "Moonlit Romance", category: "Engagement", price: 89, tier: "Premium", description: "A dramatic night-sky composition with silver details and soft ceremony light.", accent: "#aebde8", canvas: "#11172a", paper: "#1b2237", layout: "moonlit" },

    { id: "custom-atelier", name: "Custom Atelier", category: "Custom", price: 149, tier: "Bespoke", description: "A one-of-one art direction, cover, soundtrack, and layout prepared by Tony's studio.", accent: "#b78335", canvas: "#22282b", paper: "#f7f0e4", layout: "custom", custom: true }
  ];
});
