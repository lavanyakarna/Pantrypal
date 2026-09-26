/* ============================================================
   data.js — categories, keywords, catalog, units, i18n strings
   ============================================================ */

/* Category metadata. `accent` maps to a CSS variable so the UI can
   colour-code by MEANING instead of by nth-child position. */
const CATEGORIES = {
  produce:   { label: 'Produce',       icon: '🥬', accent: 'produce'   },
  dairy:     { label: 'Dairy & Eggs',  icon: '🥛', accent: 'dairy'     },
  bakery:    { label: 'Bakery',        icon: '🥖', accent: 'bakery'    },
  meat:      { label: 'Meat & Fish',   icon: '🍗', accent: 'meat'      },
  pantry:    { label: 'Pantry',        icon: '🫙', accent: 'pantry'    },
  frozen:    { label: 'Frozen',        icon: '🧊', accent: 'frozen'    },
  snacks:    { label: 'Snacks',        icon: '🍪', accent: 'snacks'    },
  beverages: { label: 'Beverages',     icon: '🧃', accent: 'beverages' },
  personal:  { label: 'Personal Care', icon: '🧴', accent: 'personal'  },
  household: { label: 'Household',     icon: '🧽', accent: 'household' },
  other:     { label: 'Other',         icon: '🛒', accent: 'other'     }
};

const DEFAULT_CATEGORY = 'other';

/* Keyword -> category id. Matched on word boundaries, longest key
   first, so "chocolate milk" lands in snacks and not dairy by luck. */
const KEYWORDS = {
  // produce
  apple: 'produce', banana: 'produce', tomato: 'produce', onion: 'produce',
  potato: 'produce', mango: 'produce', lettuce: 'produce', spinach: 'produce',
  carrot: 'produce', orange: 'produce', lemon: 'produce', garlic: 'produce',
  ginger: 'produce', cucumber: 'produce', capsicum: 'produce', chilli: 'produce',
  coriander: 'produce', mushroom: 'produce', grapes: 'produce', watermelon: 'produce',
  peas: 'produce', cabbage: 'produce', cauliflower: 'produce', beans: 'produce',
  chili: 'produce', cilantro: 'produce', mint: 'produce', 'green chili': 'produce',
  // dairy & eggs
  milk: 'dairy', cheese: 'dairy', yogurt: 'dairy', curd: 'dairy', butter: 'dairy',
  paneer: 'dairy', cream: 'dairy', ghee: 'dairy', egg: 'dairy',
  'condensed milk': 'dairy', 'greek yogurt': 'dairy',
  // bakery
  bread: 'bakery', bun: 'bakery', bagel: 'bakery', croissant: 'bakery',
  cake: 'bakery', pav: 'bakery', rusk: 'bakery', muffin: 'bakery',
  // meat & fish
  chicken: 'meat', fish: 'meat', mutton: 'meat', prawn: 'meat',
  bacon: 'meat', sausage: 'meat', salmon: 'meat', keema: 'meat',
  // pantry
  rice: 'pantry', pasta: 'pantry', oil: 'pantry', sugar: 'pantry', salt: 'pantry',
  flour: 'pantry', atta: 'pantry', dal: 'pantry', lentils: 'pantry', maida: 'pantry',
  besan: 'pantry', turmeric: 'pantry', masala: 'pantry', noodles: 'pantry',
  honey: 'pantry', jam: 'pantry', 'peanut butter': 'pantry', vinegar: 'pantry',
  ketchup: 'pantry', oats: 'pantry', poha: 'pantry', suji: 'pantry',
  'ginger garlic paste': 'pantry', 'biryani masala': 'pantry',
  // frozen
  'ice cream': 'frozen', 'frozen peas': 'frozen', nuggets: 'frozen', fries: 'frozen',
  // snacks
  chips: 'snacks', cookies: 'snacks', chocolate: 'snacks', biscuits: 'snacks',
  namkeen: 'snacks', popcorn: 'snacks', nuts: 'snacks', almonds: 'snacks',
  // beverages
  juice: 'beverages', soda: 'beverages', water: 'beverages', cola: 'beverages',
  tea: 'beverages', coffee: 'beverages', 'green tea': 'beverages',
  // personal care
  toothpaste: 'personal', soap: 'personal', shampoo: 'personal', conditioner: 'personal',
  deodorant: 'personal', razor: 'personal', sanitizer: 'personal', lotion: 'personal',
  toothbrush: 'personal',
  // household
  detergent: 'household', dishwash: 'household', 'toilet paper': 'household',
  tissues: 'household', garbage: 'household', bleach: 'household',
  mop: 'household', 'floor cleaner': 'household'
};

/* Offline fallback only — the AI layer gives real reasoning at runtime. */
const SUBSTITUTES = {
  milk: 'almond milk or oat milk',
  sugar: 'honey or jaggery',
  butter: 'ghee or olive oil',
  bread: 'gluten-free bread',
  rice: 'quinoa or millet',
  chicken: 'tofu or paneer',
  cream: 'cashew cream',
  egg: 'flax egg or curd'
};

const SEASONAL_BY_MONTH = {
  0:  ['oranges', 'strawberries'], 1:  ['oranges', 'spinach'],
  2:  ['peas', 'early mangoes'],   3:  ['mangoes', 'watermelon'],
  4:  ['mangoes', 'litchi'],       5:  ['watermelon', 'muskmelon'],
  6:  ['corn', 'jamun'],           7:  ['corn', 'plums'],
  8:  ['pomegranate', 'guava'],    9:  ['apples', 'pumpkin'],
  10: ['oranges', 'sweet potato'], 11: ['carrots', 'peas']
};

/* Spoken units, normalised to one canonical short form. */
const UNIT_ALIASES = {
  kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  g: 'g', gram: 'g', grams: 'g', gm: 'g',
  l: 'L', litre: 'L', litres: 'L', liter: 'L', liters: 'L',
  ml: 'ml',
  packet: 'pack', packets: 'pack', pack: 'pack', packs: 'pack',
  bottle: 'bottle', bottles: 'bottle',
  dozen: 'dozen', piece: 'pc', pieces: 'pc', pcs: 'pc',
  loaf: 'loaf', loaves: 'loaf', can: 'can', cans: 'can',
  box: 'box', boxes: 'box', bunch: 'bunch', tin: 'tin', jar: 'jar'
};

/* Irregular plurals the simple "strip trailing s" rule would get wrong. */
const PLURAL_FIXES = {
  loaves: 'loaf', tomatoes: 'tomato', potatoes: 'potato', mangoes: 'mango',
  leaves: 'leaf', knives: 'knife', berries: 'berry', cherries: 'cherry',
  peas: 'peas', oats: 'oats', nuts: 'nuts', grapes: 'grapes',
  chips: 'chips', lentils: 'lentils', tissues: 'tissues', greens: 'greens'
};

/* Mock storefront — wide enough that price search returns real results. */
/* Photos: Openverse (CC-licensed). Every image below was visually
   inspected, and each product is NAMED AFTER what the photo shows. */
const OV = id => `https://api.openverse.org/v1/images/${id}/thumb/`;

const CATALOG = [
  { id: 'in01', name: 'Baingan Bharta Mix 400g',  brand: 'Local Farm',  price: 40,  category: 'produce',   photo: 'https://api.openverse.org/v1/images/66cac8b5-b89c-4e32-874c-efc5eaa50bd7/thumb/' },
  { id: 'in02', name: 'Okra (Bhindi) 500g',       brand: 'Local Farm',  price: 45,  category: 'produce',   photo: 'https://api.openverse.org/v1/images/9775893c-83b3-48b3-b2cc-5a0cde7e9d13/thumb/' },
  { id: 'in03', name: 'Fresh Ginger 250g',        brand: 'Local Farm',  price: 40,  category: 'produce',   photo: 'https://api.openverse.org/v1/images/7b6aa4e4-9f1c-458d-9853-4c1f0ab4188f/thumb/' },
  { id: 'in04', name: 'Garlic 250g',              brand: 'Local Farm',  price: 50,  category: 'produce',   photo: 'https://api.openverse.org/v1/images/320fda6f-52d6-4b5b-aaf6-e13835c69d11/thumb/' },
  { id: 'in05', name: 'Guava 1kg',                brand: 'Local Farm',  price: 80,  category: 'produce',   photo: 'https://api.openverse.org/v1/images/6c774634-3db2-4eb7-b592-e421cb34fb64/thumb/' },
  { id: 'in06', name: 'Pomegranate 1kg',          brand: 'Local Farm',  price: 180, category: 'produce',   photo: 'https://api.openverse.org/v1/images/f0d3aa6f-eeaf-4c6d-86d7-273ec9b87ad3/thumb/' },
  { id: 'in07', name: 'Papaya 1kg',               brand: 'Local Farm',  price: 60,  category: 'produce',   photo: 'https://api.openverse.org/v1/images/eb3617af-d4d6-4b7f-8f9b-e07e655a7743/thumb/' },
  { id: 'in08', name: 'Green Peas 500g',          brand: 'Local Farm',  price: 50,  category: 'produce',   photo: 'https://api.openverse.org/v1/images/02c0f9d9-347b-41d7-888d-4b17c4d4a7a1/thumb/' },
  { id: 'in09', name: 'Lemon 250g',               brand: 'Local Farm',  price: 30,  category: 'produce',   photo: 'https://api.openverse.org/v1/images/256447ab-f1c2-479a-a1ed-614b3ad7ff94/thumb/' },
  { id: 'in10', name: 'Watermelon 1pc',           brand: 'Local Farm',  price: 60,  category: 'produce',   photo: 'https://api.openverse.org/v1/images/caef2800-d7ca-446c-85ac-84a48550b40e/thumb/' },
  { id: 'in11', name: 'Red Onion 1kg',            brand: 'Local Farm',  price: 45,  category: 'produce',   photo: 'https://api.openverse.org/v1/images/2d5be889-5b32-4efd-9ba0-ffab61ed78e8/thumb/' },
  { id: 'in12', name: 'Potato 2kg',               brand: 'Local Farm',  price: 70,  category: 'produce',   photo: 'https://api.openverse.org/v1/images/13d88b01-a7f1-4dc3-968e-e35a5e508489/thumb/' },
  { id: 'in13', name: 'Tomato 1kg',               brand: 'Local Farm',  price: 40,  category: 'produce',   photo: 'https://api.openverse.org/v1/images/e3b6caf9-a081-4069-9476-cec252b3ef6e/thumb/' },
  { id: 'in14', name: 'Fresh Paneer 200g',        brand: 'Amul',        price: 95,  category: 'dairy',     photo: 'https://api.openverse.org/v1/images/5646f5d8-5bca-445e-9f43-8a0561823618/thumb/' },
  { id: 'in15', name: 'Pure Ghee 1L',             brand: 'Amul',        price: 650, category: 'dairy',     photo: 'https://api.openverse.org/v1/images/1e5d2c02-8ec4-48f0-9e18-7391123a2673/thumb/' },
  { id: 'in16', name: 'Farm Eggs 1 dozen',        brand: 'Eggoz',       price: 95,  category: 'dairy',     photo: 'https://api.openverse.org/v1/images/551f5fd7-849b-47d5-90df-c85f1ccbccc5/thumb/' },
  { id: 'in17', name: 'Whole Wheat Chapati 10pc', brand: 'Fresh Bake',  price: 50,  category: 'bakery',    photo: 'https://api.openverse.org/v1/images/549a3047-5a41-47a9-a7bd-a5d07c83b7b9/thumb/' },
  { id: 'in18', name: 'Whole Wheat Bread 400g',   brand: 'Britannia',   price: 55,  category: 'bakery',    photo: 'https://api.openverse.org/v1/images/67f1efc3-5b15-4ce1-ad58-5642213702e4/thumb/' },
  { id: 'in19', name: 'Chicken Curry Cut 1kg',    brand: 'Licious',     price: 320, category: 'meat',      photo: 'https://api.openverse.org/v1/images/9e3f380b-6fac-4224-b3fb-acbd9c74d445/thumb/' },
  { id: 'in20', name: 'Lijjat Papad 200g',        brand: 'Lijjat',      price: 75,  category: 'pantry',    photo: 'https://api.openverse.org/v1/images/3d1121f1-787f-40ba-b917-4c784d2c7beb/thumb/' },
  { id: 'in21', name: 'Idli Batter 1kg',          brand: 'MTR',         price: 85,  category: 'pantry',    photo: 'https://api.openverse.org/v1/images/7aa293af-e089-4c93-be6d-3cdea5298eef/thumb/' },
  { id: 'in22', name: 'Dosa Batter 1kg',          brand: 'MTR',         price: 90,  category: 'pantry',    photo: 'https://api.openverse.org/v1/images/4919a788-9567-4489-a251-841c254b44d6/thumb/' },
  { id: 'in23', name: 'Turmeric Powder 200g',     brand: 'Everest',     price: 68,  category: 'pantry',    photo: 'https://api.openverse.org/v1/images/c2d1dab8-c95c-427c-af2c-080f519bd609/thumb/' },
  { id: 'in24', name: 'Cumin Seeds (Jeera) 200g', brand: 'Everest',     price: 120, category: 'pantry',    photo: 'https://api.openverse.org/v1/images/483b20a5-ee5b-4a54-880f-acd6cc98bb0d/thumb/' },
  { id: 'in25', name: 'Mustard Seeds 200g',       brand: 'Everest',     price: 45,  category: 'pantry',    photo: 'https://api.openverse.org/v1/images/fe211c78-98ec-4e44-9f17-4bdbb80d3ad2/thumb/' },
  { id: 'in26', name: 'Basmati Rice 5kg',         brand: 'India Gate',  price: 480, category: 'pantry',    photo: 'https://api.openverse.org/v1/images/e0fa887a-3379-48c3-a96d-6fab396dabfd/thumb/' },
  { id: 'in27', name: 'Poha (Flattened Rice) 1kg',brand: 'Local',       price: 60,  category: 'pantry',    photo: 'https://api.openverse.org/v1/images/f6cd04a9-bc36-4f5d-8627-297fa40b5dec/thumb/' },
  { id: 'in28', name: 'Sugar 1kg',                brand: 'Madhur',      price: 52,  category: 'pantry',    photo: 'https://api.openverse.org/v1/images/c6da66a2-0de5-439c-b3fc-a6b23765d76a/thumb/' },
  { id: 'in29', name: 'Black Pepper 100g',        brand: 'Everest',     price: 150, category: 'pantry',    photo: 'https://api.openverse.org/v1/images/4fdceeee-418f-425f-967d-f441ef5a6259/thumb/' },
  { id: 'in30', name: 'Green Cardamom 50g',       brand: 'Everest',     price: 280, category: 'pantry',    photo: 'https://api.openverse.org/v1/images/c5779318-f07a-4d26-aaed-14d468d0395c/thumb/' },
  { id: 'in31', name: 'Kurkure Masala Munch 90g', brand: 'PepsiCo',     price: 20,  category: 'snacks',    photo: 'https://api.openverse.org/v1/images/6dae1ad1-393c-4bda-9814-f2491c5aba67/thumb/' },
  { id: 'in32', name: 'Parle Krackjack 200g',     brand: 'Parle',       price: 40,  category: 'snacks',    photo: 'https://api.openverse.org/v1/images/83827b10-39e7-4f31-bf9e-11c09639b446/thumb/' },
  { id: 'in33', name: 'Thums Up 750ml',           brand: 'Coca-Cola',   price: 45,  category: 'beverages', photo: 'https://api.openverse.org/v1/images/3680756d-094d-4429-bc1b-9872652de740/thumb/' },
  { id: 'in34', name: 'Limca Lime Soda 750ml',    brand: 'Coca-Cola',   price: 45,  category: 'beverages', photo: 'https://api.openverse.org/v1/images/9c1eb422-7201-435e-a629-082cf93abef6/thumb/' },
  { id: 'in35', name: 'Filter Coffee 200g',       brand: 'Bru',         price: 320, category: 'beverages', photo: 'https://api.openverse.org/v1/images/a5a9063c-cdbc-4af0-9533-62dc41d4b1c8/thumb/' },
  { id: 'in36', name: 'Bathing Soap 3x100g',      brand: 'Lifebuoy',    price: 120, category: 'personal',  photo: 'https://api.openverse.org/v1/images/648b8aa7-a911-4b08-8b68-260c55510076/thumb/' },
  { id: 'in37', name: 'Shampoo 340ml',            brand: 'Clinic Plus', price: 180, category: 'personal',  photo: 'https://api.openverse.org/v1/images/6aaea2f0-0356-4546-ba7b-3895a9b86f41/thumb/' },
  { id: 'in38', name: 'Washing Detergent 2kg',    brand: 'Surf Excel',  price: 340, category: 'household', photo: 'https://api.openverse.org/v1/images/eaae3606-6d20-448d-93fc-9c741969d27b/thumb/' }
];

/* Languages offered in the picker. `lang` feeds BOTH speech
   recognition and text-to-speech, so replies match the input. */
const LANGUAGES = {
  en: { lang: 'en-US', label: 'English'  },
  hi: { lang: 'hi-IN', label: 'हिन्दी'   },
  es: { lang: 'es-ES', label: 'Español'  },
  fr: { lang: 'fr-FR', label: 'Français' }
};

/* Spoken + UI strings per language — closes the "multilingual is
   input-only" gap the README used to list as a limitation. */
const STRINGS = {
  en: {
    added: (i) => `Added ${i}.`,
    removed: (i) => `Removed ${i}.`,
    notOnList: (i) => `${i} isn't on your list.`,
    checkedOff: (i) => `Checked off ${i}.`,
    cleared: () => `List cleared.`,
    undone: () => `Undone.`,
    skipped: () => `Okay, skipped.`,
    noResults: () => `No matching products found.`,
    found: (n) => `Found ${n} matching ${n === 1 ? 'product' : 'products'}.`,
    notUnderstood: () => `Sorry, I didn't get that.`,
    listening: () => `Listening`,
    thinking: () => `Thinking`,
    empty: () => `Your list is empty.`
  },
  hi: {
    added: (i) => `${i} जोड़ दिया।`,
    removed: (i) => `${i} हटा दिया।`,
    notOnList: (i) => `${i} आपकी सूची में नहीं है।`,
    checkedOff: (i) => `${i} पूरा हुआ।`,
    cleared: () => `सूची खाली कर दी।`,
    undone: () => `वापस कर दिया।`,
    skipped: () => `ठीक है, छोड़ दिया।`,
    noResults: () => `कोई उत्पाद नहीं मिला।`,
    found: (n) => `${n} उत्पाद मिले।`,
    notUnderstood: () => `माफ़ कीजिए, समझ नहीं आया।`,
    listening: () => `सुन रहा हूँ`,
    thinking: () => `सोच रहा हूँ`,
    empty: () => `आपकी सूची खाली है।`
  },
  es: {
    added: (i) => `${i} añadido.`,
    removed: (i) => `${i} eliminado.`,
    notOnList: (i) => `${i} no está en tu lista.`,
    checkedOff: (i) => `${i} marcado.`,
    cleared: () => `Lista vaciada.`,
    undone: () => `Deshecho.`,
    skipped: () => `Vale, omitido.`,
    noResults: () => `No se encontraron productos.`,
    found: (n) => `${n} productos encontrados.`,
    notUnderstood: () => `Perdona, no te entendí.`,
    listening: () => `Escuchando`,
    thinking: () => `Pensando`,
    empty: () => `Tu lista está vacía.`
  },
  fr: {
    added: (i) => `${i} ajouté.`,
    removed: (i) => `${i} supprimé.`,
    notOnList: (i) => `${i} n'est pas sur votre liste.`,
    checkedOff: (i) => `${i} coché.`,
    cleared: () => `Liste vidée.`,
    undone: () => `Annulé.`,
    skipped: () => `D'accord, ignoré.`,
    noResults: () => `Aucun produit trouvé.`,
    found: (n) => `${n} produits trouvés.`,
    notUnderstood: () => `Désolé, je n'ai pas compris.`,
    listening: () => `J'écoute`,
    thinking: () => `Je réfléchis`,
    empty: () => `Votre liste est vide.`
  }
};

/* ============================================================
   IMAGERY — real photography (Unsplash CDN)
   ============================================================ */
const IMG = (id, w = 400) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${w}&fit=crop&q=70`;

/* Per-category hero photo, used as a fallback whenever a specific
   item has no photo of its own. */
const CATEGORY_PHOTOS = {
  produce:   IMG('1610348725531-843dff563e2c'),
  dairy:     IMG('1628088062854-d1870b4553da'),
  bakery:    IMG('1509440159596-0249088772ff'),
  meat:      IMG('1607623814075-e51df1bdc82f'),
  pantry:    IMG('1596040033229-a9821ebd058d'),
  frozen:    IMG('1570197788417-0e82375c9371'),
  snacks:    IMG('1621939514649-280e2ee25f60'),
  beverages: IMG('1544145945-f90425340c7e'),
  personal:  IMG('1556228720-195a672e8a03'),
  household: IMG('1585421514738-01798e348b17'),
  other:     IMG('1596040033229-a9821ebd058d')
};

/* Item-level photos, matched by keyword. Longest key wins. */
const ITEM_PHOTOS = {
  milk:          IMG('1550583724-b2692b85b150'),
  'almond milk': IMG('1563636619-e9143da7973b'),
  butter:        IMG('1608686207856-001b95cf60ca'),
  cheese:        IMG('1628088062854-d1870b4553da'),
  egg:           IMG('1486297678162-eb2a19b0a32d'),
  apple:         IMG('1568702846914-96b305d2aaeb'),
  banana:        IMG('1571771894821-ce9b6c11b08e'),
  tomato:        IMG('1592924357228-91a4daadcfea'),
  spinach:       IMG('1576045057995-568f588f82fb'),
  bread:         IMG('1509440159596-0249088772ff'),
  bun:           IMG('1568901346375-23c9450c58cd'),
  chicken:       IMG('1604503468506-a8da13d82791'),
  salmon:        IMG('1519708227418-c8fd9a32b7a2'),
  fish:          IMG('1519708227418-c8fd9a32b7a2'),
  rice:          IMG('1586201375761-83865001e31c'),
  atta:          IMG('1509440159596-0249088772ff'),
  flour:         IMG('1509440159596-0249088772ff'),
  oil:           IMG('1474979266404-7eaacbcd87c5'),
  dal:           IMG('1596797038530-2c107229654b'),
  chips:         IMG('1566478989037-eec170784d0b'),
  chocolate:     IMG('1511381939415-e44015466834'),
  juice:         IMG('1600271886742-f049cd451bba'),
  tea:           IMG('1564890369478-c89ca6d9cde9'),
  'ice cream':   IMG('1497034825429-c343d7c6a68f'),
  toothpaste:    IMG('1589985270826-4b7bb135bc9d'),
  soap:          IMG('1607613009820-a29f7bb81c04'),
  shampoo:       IMG('1556228578-8c89e6adf883'),
  detergent:     IMG('1582735689369-4fe89db7114c')
};

const SORTED_PHOTO_KEYS = Object.keys(ITEM_PHOTOS).sort((a, b) => b.length - a.length);

/* Resolve the best photo for a name, falling back to its category. */
function photoFor(name, categoryId) {
  const n = String(name || '').toLowerCase();
  for (const key of SORTED_PHOTO_KEYS) {
    if (n.includes(key)) return ITEM_PHOTOS[key];
  }
  return CATEGORY_PHOTOS[categoryId] || CATEGORY_PHOTOS.other;
}

/* Per-product photo, one unique image per catalog id. */
const PRODUCT_PHOTOS = {
  /* personal care — real brand packshots */
  p01: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/2022_Colgate_Toothpaste_for_Russia_market_assorted.jpg/500px-2022_Colgate_Toothpaste_for_Russia_market_assorted.jpg',
  p02: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Sensodyne_toothpaste_Iran.jpg/500px-Sensodyne_toothpaste_Iran.jpg',
  p03: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Sabonete_Dove.jpg/500px-Sabonete_Dove.jpg',
  p04: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Head_%26_Shoulders_shampoo_bottle.jpg/500px-Head_%26_Shoulders_shampoo_bottle.jpg',
  p27: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/2024_Szczoteczka_do_z%C4%99b%C3%B3w_Oral-B_Pro_3_3000_%281%29.jpg/500px-2024_Szczoteczka_do_z%C4%99b%C3%B3w_Oral-B_Pro_3_3000_%281%29.jpg',
  p28: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Warm_Vanilla_Sugar_shower_gel_and_lotion.jpg/500px-Warm_Vanilla_Sugar_shower_gel_and_lotion.jpg',
  p29: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Gillette_Mach3_razor_from_Indonesia%2C_2015-08-03.jpg/500px-Gillette_Mach3_razor_from_Indonesia%2C_2015-08-03.jpg',
  p30: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Hand_sanitizer_bottle.jpg/500px-Hand_sanitizer_bottle.jpg',

  /* produce */
  p05: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Fuji_apple.jpg/500px-Fuji_apple.jpg',
  p06: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Bunch_of_bananas_on_sale.jpg/500px-Bunch_of_bananas_on_sale.jpg',
  p07: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Bright_red_tomato_and_cross_section02.jpg/500px-Bright_red_tomato_and_cross_section02.jpg',
  p08: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Fresh_Spinach_leaves.jpg/500px-Fresh_Spinach_leaves.jpg',
  p31: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Red_Onion_on_White.JPG/500px-Red_Onion_on_White.JPG',
  p32: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Potato_tubers_in_pail.jpg/500px-Potato_tubers_in_pail.jpg',
  p33: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Alphonso_Mango_in_China.jpg/500px-Alphonso_Mango_in_China.jpg',
  p34: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Carrots_at_Ljubljana_Central_Market.JPG/500px-Carrots_at_Ljubljana_Central_Market.JPG',
  p35: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Lemon_-_whole_and_split.jpg/500px-Lemon_-_whole_and_split.jpg',
  p36: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Capsicum_annuum_fruits_IMGP0044.jpg/500px-Capsicum_annuum_fruits_IMGP0044.jpg',

  /* dairy & eggs */
  p09: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Abbotts_Glass_Milk_Bottles_1920s-1960s.jpg/500px-Abbotts_Glass_Milk_Bottles_1920s-1960s.jpg',
  p10: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/2023_Mas%C5%82o_w_maselniczce.jpg/500px-2023_Mas%C5%82o_w_maselniczce.jpg',
  p11: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Almond_Non-Dairy_Milk_%285082992066%29.jpg/500px-Almond_Non-Dairy_Milk_%285082992066%29.jpg',
  p12: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/6-Pack-Chicken-Eggs.jpg/500px-6-Pack-Chicken-Eggs.jpg',
  p37: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Panir_Paneer_Indian_cheese_fresh.jpg/500px-Panir_Paneer_Indian_cheese_fresh.jpg',
  p38: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Yoghurt_in_bowl.jpg/500px-Yoghurt_in_bowl.jpg',
  p39: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Processed_cheese_1.jpg/500px-Processed_cheese_1.jpg',
  p40: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Plain_Curd_Rice.jpg/500px-Plain_Curd_Rice.jpg',
  p41: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Butterschmalz-3.jpg/500px-Butterschmalz-3.jpg',

  /* bakery */
  p13: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Breadindia.jpg/500px-Breadindia.jpg',
  p14: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Fresh_burger_buns_%286211726607%29.jpg/500px-Fresh_burger_buns_%286211726607%29.jpg',
  p42: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Croissant%2C_cross_section.jpg/500px-Croissant%2C_cross_section.jpg',
  p43: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Choipaku_Rusk_variants.jpg/500px-Choipaku_Rusk_variants.jpg',

  /* meat & fish */
  p15: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Fresh_Raw_Chicken_and_Feet_Displayed.jpg/500px-Fresh_Raw_Chicken_and_Feet_Displayed.jpg',
  p16: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Liat_Portal_for_Foodie_Disorder_-_Salmon_Preparation_Before_Grilling.jpg/500px-Liat_Portal_for_Foodie_Disorder_-_Salmon_Preparation_Before_Grilling.jpg',
  p44: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Fresh_Raw_Chicken_Parts_on_Display.jpg/500px-Fresh_Raw_Chicken_Parts_on_Display.jpg',
  p45: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Raw_Mutton_Samosa.jpg/500px-Raw_Mutton_Samosa.jpg',
  p46: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Cooked_shrimp.jpg/500px-Cooked_shrimp.jpg',

  /* pantry */
  p17: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Cooked_cilantro_lime_dish_basmati_rice_India.jpg/500px-Cooked_cilantro_lime_dish_basmati_rice_India.jpg',
  p18: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Wheat-flour.jpg',
  p19: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Bottle_of_olive_oil.jpg/500px-Bottle_of_olive_oil.jpg',
  p20: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Musuro_Ko_Dal.jpg/500px-Musuro_Ko_Dal.jpg',
  p47: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/EdibleSalt.jpg/500px-EdibleSalt.jpg',
  p48: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Cube_sugar_bowl_at_Matching_Green%2C_Essex%2C_England.jpg/500px-Cube_sugar_bowl_at_Matching_Green%2C_Essex%2C_England.jpg',
  p49: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Spoonfuls_of_spice_%2846921544425%29.jpg/500px-Spoonfuls_of_spice_%2846921544425%29.jpg',
  p50: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Garam_Masala.JPG/500px-Garam_Masala.JPG',
  p51: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Instant_noodle_balls.jpg/500px-Instant_noodle_balls.jpg',
  p52: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Heinz_Tomato_Ketchup%2C_Canada_%28front%29%2C_2026-02-19.jpg/500px-Heinz_Tomato_Ketchup%2C_Canada_%28front%29%2C_2026-02-19.jpg',
  p53: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Steel_Cut_Oats_008_A.jpg',
  p54: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/All-Purpose_Flour_%284107895947%29.jpg/500px-All-Purpose_Flour_%284107895947%29.jpg',

  /* snacks */
  p21: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Potato-Chips.jpg/500px-Potato-Chips.jpg',
  p22: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Green_and_Black%27s_dark_chocolate_bar_2.jpg/500px-Green_and_Black%27s_dark_chocolate_bar_2.jpg',
  p55: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Parle_G_logo.jpg',
  p56: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Namkeen_in_plastic_cover_from_Uttarakhand_%2818%29.jpg/500px-Namkeen_in_plastic_cover_from_Uttarakhand_%2818%29.jpg',
  p57: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Almonds_-_in_shell%2C_shell_cracked_open%2C_shelled%2C_blanched.jpg/500px-Almonds_-_in_shell%2C_shell_cracked_open%2C_shelled%2C_blanched.jpg',
  p58: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Oreo-Two-Cookies.jpg/500px-Oreo-Two-Cookies.jpg',

  /* beverages */
  p23: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Close-up_of_a_glass_bottle_of_Ribbon_orange_juice%2C_2016.jpg/500px-Close-up_of_a_glass_bottle_of_Ribbon_orange_juice%2C_2016.jpg',
  p24: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Lipton-mug-tea.jpg/500px-Lipton-mug-tea.jpg',
  p59: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Nescafe-Tasse.jpg/500px-Nescafe-Tasse.jpg',
  p60: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/BORJOMI_GEORGIAN_MINERAL_WATER_plastic_bottle0%2C75_barcode4860019001414_codeCP3RUBY1_date23.10.2019L12_1.jpg/500px-BORJOMI_GEORGIAN_MINERAL_WATER_plastic_bottle0%2C75_barcode4860019001414_codeCP3RUBY1_date23.10.2019L12_1.jpg',
  p61: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/15-09-26-RalfR-WLC-0098_-_Coca-Cola_glass_bottle_%28Germany%29.jpg/500px-15-09-26-RalfR-WLC-0098_-_Coca-Cola_glass_bottle_%28Germany%29.jpg',
  p62: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Green_tea_box_with_leaf.jpg/500px-Green_tea_box_with_leaf.jpg',

  /* frozen */
  p25: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Ice_cream_with_garnish.jpg/500px-Ice_cream_with_garnish.jpg',
  p63: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Pisum_sativum_%28fruit%29_4.jpg/500px-Pisum_sativum_%28fruit%29_4.jpg',
  p64: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Homemade_French_Fries_in_Argentina.jpg/500px-Homemade_French_Fries_in_Argentina.jpg',
  p65: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Nugget_ayam.jpg/500px-Nugget_ayam.jpg',

  /* household */
  p26: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Laundry_detergent_1.jpg/500px-Laundry_detergent_1.jpg',
  p66: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Afwasmiddel_Una_Aldi.JPG/500px-Afwasmiddel_Una_Aldi.JPG',
  p67: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/HK_Sheung_Wan_%E6%97%A5%E6%9C%AC%E5%9F%8E_Japan_Home_Centre_%E8%97%8D%E5%A8%81%E5%AF%B6_Sara_Lee_SWIPE_blue_concentrate_cleaning_products_%E8%97%8D%E8%87%B3%E5%B0%8A_Campbell_April-2012.JPG/500px-HK_Sheung_Wan_%E6%97%A5%E6%9C%AC%E5%9F%8E_Japan_Home_Centre_%E8%97%8D%E5%A8%81%E5%AF%B6_Sara_Lee_SWIPE_blue_concentrate_cleaning_products_%E8%97%8D%E8%87%B3%E5%B0%8A_Campbell_April-2012.JPG',
  p68: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Toilet_paper_orientation_over.jpg/500px-Toilet_paper_orientation_over.jpg',
  p69: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/GB_-_Flickr_-_Horosho.Gromko..jpg/500px-GB_-_Flickr_-_Horosho.Gromko..jpg'
};

/* Attach a photo to every catalog product: exact one if we have it. */
CATALOG.forEach(p => { if (!p.photo) p.photo = photoFor(p.name, p.category); });

/* ============================================================
   CATEGORY NAMES + SHOPPING-MODE STRINGS
   ============================================================ */
const CATEGORY_LABELS = {
  hi: {
    produce: 'सब्ज़ी व फल', dairy: 'दूध व अंडे', bakery: 'बेकरी',
    meat: 'मांस व मछली', pantry: 'किराना', frozen: 'फ्रोज़न',
    snacks: 'नाश्ता', beverages: 'पेय', personal: 'साज-सज्जा',
    household: 'घरेलू', other: 'अन्य'
  }
};

const SHOP_TEXT = {
  en: { shop: 'Shop', title: 'Shopping mode', sub: 'Tick items as you put them in the trolley',
        progress: 'collected', remaining: 'still to get', total: 'Running total',
        complete: 'Complete trip', done: 'All done!', empty: 'Add items to your list first.',
        tripSaved: 'Trip saved to history.' },
  hi: { shop: 'खरीदारी', title: 'खरीदारी मोड', sub: 'सामान ट्रॉली में डालते ही टिक करें',
        progress: 'ले लिया', remaining: 'बाकी है', total: 'कुल राशि',
        complete: 'खरीदारी पूरी करें', done: 'सब हो गया!', empty: 'पहले सूची में सामान जोड़ें।',
        tripSaved: 'खरीदारी इतिहास में सेव हो गई।' },
  es: { shop: 'Comprar', title: 'Modo compra', sub: 'Marca los artículos al ponerlos en el carrito',
        progress: 'recogidos', remaining: 'faltan', total: 'Total',
        complete: 'Finalizar compra', done: '¡Listo!', empty: 'Añade artículos primero.',
        tripSaved: 'Compra guardada.' },
  fr: { shop: 'Courses', title: 'Mode courses', sub: 'Cochez les articles dans le chariot',
        progress: 'pris', remaining: 'restants', total: 'Total',
        complete: 'Terminer', done: 'Terminé !', empty: 'Ajoutez des articles d’abord.',
        tripSaved: 'Course enregistrée.' }
};

/* ---- bridge kept for backwards compatibility ---- */
const MOCK_CATALOG = CATALOG;
const CATEGORY_MAP = Object.keys(KEYWORDS).reduce((map, word) => {
  map[word] = CATEGORIES[KEYWORDS[word]].label;
  return map;
}, {});

/* ============================================================
   MULTILINGUAL — Hindi/Hinglish vocabulary + UI labels
   ============================================================ */

/* Hindi & Hinglish grocery words -> canonical English name.
   Canonical English keeps categories, photos and catalog search working. */
const HINDI_ITEMS = {
  'दूध': 'milk', 'doodh': 'milk', 'dudh': 'milk',
  'ब्रेड': 'bread', 'रोटी': 'bread', 'roti': 'bread',
  'अंडा': 'egg', 'अंडे': 'egg', 'anda': 'egg', 'ande': 'egg',
  'चावल': 'rice', 'chawal': 'rice',
  'चीनी': 'sugar', 'cheeni': 'sugar', 'shakkar': 'sugar',
  'नमक': 'salt', 'namak': 'salt',
  'तेल': 'oil', 'tel': 'oil',
  'आटा': 'atta', 'atta': 'atta',
  'दाल': 'dal', 'daal': 'dal',
  'प्याज': 'onion', 'प्याज़': 'onion', 'pyaaz': 'onion', 'pyaz': 'onion',
  'टमाटर': 'tomato', 'tamatar': 'tomato',
  'आलू': 'potato', 'aloo': 'potato',
  'दही': 'curd', 'dahi': 'curd',
  'पनीर': 'paneer', 'paneer': 'paneer',
  'मक्खन': 'butter', 'makkhan': 'butter',
  'घी': 'ghee', 'ghee': 'ghee',
  'चाय': 'tea', 'chai': 'tea',
  'चीज़': 'cheese',
  'सेब': 'apple', 'seb': 'apple',
  'केला': 'banana', 'kela': 'banana',
  'आम': 'mango', 'aam': 'mango',
  'मुर्गी': 'chicken', 'चिकन': 'chicken', 'murgi': 'chicken',
  'मछली': 'fish', 'machhli': 'fish',
  'साबुन': 'soap', 'sabun': 'soap',
  'शैम्पू': 'shampoo',
  'पानी': 'water', 'paani': 'water',
  'बिस्किट': 'biscuits', 'biscuit': 'biscuits',
  'मसाला': 'masala', 'हल्दी': 'turmeric', 'haldi': 'turmeric',
  'अदरक': 'ginger', 'adrak': 'ginger',
  'लहसुन': 'garlic', 'lehsun': 'garlic',
  'मिर्च': 'chili', 'mirch': 'chili',
  'धनिया': 'cilantro', 'dhaniya': 'cilantro',
  'पालक': 'spinach', 'palak': 'spinach',
  'गाजर': 'carrot', 'gajar': 'carrot',
  'नींबू': 'lemon', 'nimbu': 'lemon'
};

/* English canonical -> Hindi label, so the list reads back in Hindi. */
const HINDI_LABELS = {
  milk: 'दूध', bread: 'ब्रेड', egg: 'अंडा', rice: 'चावल', sugar: 'चीनी',
  salt: 'नमक', oil: 'तेल', atta: 'आटा', dal: 'दाल', onion: 'प्याज़',
  tomato: 'टमाटर', potato: 'आलू', curd: 'दही', paneer: 'पनीर',
  butter: 'मक्खन', ghee: 'घी', tea: 'चाय', cheese: 'चीज़', apple: 'सेब',
  banana: 'केला', mango: 'आम', chicken: 'चिकन', fish: 'मछली',
  soap: 'साबुन', shampoo: 'शैम्पू', water: 'पानी', biscuits: 'बिस्किट',
  turmeric: 'हल्दी', ginger: 'अदरक', garlic: 'लहसुन', chili: 'मिर्च',
  cilantro: 'धनिया', spinach: 'पालक', carrot: 'गाजर', lemon: 'नींबू'
};

/* Hindi/Hinglish action verbs. */
const HINDI_VERBS = {
  add:    ['जोड़ो','जोड़ें','डालो','डाल','चाहिए','लाओ','लेना','ऐड','jodo','dalo','chahiye','lao','add karo','chahie'],
  remove: ['हटाओ','हटा','निकालो','मिटाओ','नहीं चाहिए','hatao','nikalo','remove karo','mat'],
  search: ['ढूंढो','खोजो','दिखाओ','कितने का','dhundo','khojo','dikhao','search karo'],
  clear:  ['सब हटाओ','लिस्ट खाली','साफ करो','sab hatao','clear karo'],
  yes:    ['हाँ','हां','ठीक है','जी','haan','han','theek hai','ji','ha'],
  no:     ['नहीं','ना','मत','nahi','nahin','na','mat']
};

/* Interface labels per language. */
const UI_TEXT = {
  en: {
    myList: 'My List', discover: 'Discover', insights: 'Insights',
    trySaying: 'Try saying', voiceLang: 'Voice language', theme: 'Theme',
    aiSummary: 'AI Summary', undo: 'Undo', clear: 'Clear',
    items: 'Items', checkedOff: 'Checked off', categories: 'Categories', estTotal: 'Est. total',
    emptyTitle: 'Your list is empty',
    emptyText: 'Tap the microphone and say something like “add milk, bread and two eggs” — or type it below.',
    commandPlaceholder: 'Ask PantryPal — “add milk”, “cook biryani for 4”…',
    filterPlaceholder: 'Filter this catalog by name or brand…',
    tapToSpeak: 'Tap to speak', typeBelow: 'Type below',
    smartSuggestions: 'Smart suggestions', yourUsuals: 'Your usuals', history: 'Shopping history',
    allProducts: 'All products', addSelected: 'Add selected to list', cancel: 'Cancel',
    all: 'All'
  },
  hi: {
    myList: 'मेरी सूची', discover: 'खोजें', insights: 'जानकारी',
    trySaying: 'ऐसे बोलें', voiceLang: 'भाषा', theme: 'थीम',
    aiSummary: 'AI सारांश', undo: 'वापस', clear: 'खाली करें',
    items: 'चीज़ें', checkedOff: 'खरीद लिया', categories: 'श्रेणियाँ', estTotal: 'अनुमानित कुल',
    emptyTitle: 'आपकी सूची खाली है',
    emptyText: 'माइक दबाकर बोलें — जैसे “दूध, ब्रेड और दो अंडे जोड़ो” — या नीचे लिखें।',
    commandPlaceholder: 'बोलें या लिखें — “दूध जोड़ो”, “doodh add karo”…',
    filterPlaceholder: 'नाम या ब्रांड से खोजें…',
    tapToSpeak: 'बोलने के लिए दबाएँ', typeBelow: 'नीचे लिखें',
    smartSuggestions: 'सुझाव', yourUsuals: 'आपकी आदतें', history: 'खरीद इतिहास',
    allProducts: 'सभी उत्पाद', addSelected: 'चुनी हुई चीज़ें जोड़ें', cancel: 'रद्द करें',
    all: 'सभी'
  },
  es: {
    myList: 'Mi lista', discover: 'Descubrir', insights: 'Análisis',
    trySaying: 'Prueba a decir', voiceLang: 'Idioma de voz', theme: 'Tema',
    aiSummary: 'Resumen IA', undo: 'Deshacer', clear: 'Vaciar',
    items: 'Artículos', checkedOff: 'Comprados', categories: 'Categorías', estTotal: 'Total est.',
    emptyTitle: 'Tu lista está vacía',
    emptyText: 'Toca el micrófono y di algo como “añade leche y pan” — o escríbelo abajo.',
    commandPlaceholder: 'Di o escribe — “añade leche”…',
    filterPlaceholder: 'Filtra por nombre o marca…',
    tapToSpeak: 'Toca para hablar', typeBelow: 'Escribe abajo',
    smartSuggestions: 'Sugerencias', yourUsuals: 'Tus habituales', history: 'Historial',
    allProducts: 'Todos los productos', addSelected: 'Añadir a la lista', cancel: 'Cancelar',
    all: 'Todos'
  },
  fr: {
    myList: 'Ma liste', discover: 'Découvrir', insights: 'Analyses',
    trySaying: 'Essayez de dire', voiceLang: 'Langue vocale', theme: 'Thème',
    aiSummary: 'Résumé IA', undo: 'Annuler', clear: 'Vider',
    items: 'Articles', checkedOff: 'Achetés', categories: 'Catégories', estTotal: 'Total est.',
    emptyTitle: 'Votre liste est vide',
    emptyText: 'Touchez le micro et dites “ajoute du lait et du pain” — ou écrivez ci-dessous.',
    commandPlaceholder: 'Dites ou écrivez — “ajoute du lait”…',
    filterPlaceholder: 'Filtrer par nom ou marque…',
    tapToSpeak: 'Appuyez pour parler', typeBelow: 'Écrivez ci-dessous',
    smartSuggestions: 'Suggestions', yourUsuals: 'Vos habitudes', history: 'Historique',
    allProducts: 'Tous les produits', addSelected: 'Ajouter à la liste', cancel: 'Annuler',
    all: 'Tous'
  }
};

/* Example commands shown in the sidebar, per language. */
const HINTS = {
  en: [
    { say: 'add milk, bread and 2 eggs',                  show: '“add milk, bread and 2 eggs”' },
    { say: 'I want to cook chicken biryani for 4 people', show: '“cook biryani for 4 people”' },
    { say: 'find toothpaste under 100 rupees',            show: '“toothpaste under ₹100”' },
    { say: 'what can I use instead of butter',            show: '“instead of butter?”' }
  ],
  hi: [
    { say: 'दूध, ब्रेड और दो अंडे जोड़ो',            show: '“दूध, ब्रेड और दो अंडे जोड़ो”' },
    { say: 'मुझे चार लोगों के लिए बिरयानी बनानी है', show: '“चार लोगों की बिरयानी”' },
    { say: 'सौ रुपये से कम में साबुन दिखाओ',        show: '“₹100 से कम साबुन”' },
    { say: 'doodh aur chawal add karo',              show: '“doodh aur chawal add karo”' }
  ],
  es: [
    { say: 'añade leche, pan y 2 huevos',             show: '“añade leche, pan y 2 huevos”' },
    { say: 'quiero cocinar paella para 4 personas',   show: '“paella para 4”' },
    { say: 'busca pasta de dientes por menos de 100', show: '“pasta de dientes < 100”' },
    { say: 'qué puedo usar en lugar de mantequilla',  show: '“¿en vez de mantequilla?”' }
  ],
  fr: [
    { say: 'ajoute du lait, du pain et 2 œufs',          show: '“ajoute lait, pain, 2 œufs”' },
    { say: 'je veux cuisiner un curry pour 4 personnes', show: '“curry pour 4”' },
    { say: 'trouve du dentifrice à moins de 100',        show: '“dentifrice < 100”' },
    { say: 'que puis-je utiliser à la place du beurre',  show: '“à la place du beurre ?”' }
  ]
};

/* Devanagari digits -> Latin, so "२ अंडे" parses. */
function normalizeDigits(text) {
  return String(text).replace(/[०-९]/g, d => '०१२३४५६७८९'.indexOf(d));
}