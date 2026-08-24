const CATEGORY_MAP = {
  milk: 'Dairy', cheese: 'Dairy', yogurt: 'Dairy', butter: 'Dairy', curd: 'Dairy', paneer: 'Dairy',
  apple: 'Produce', banana: 'Produce', tomato: 'Produce', onion: 'Produce', potato: 'Produce',
  mango: 'Produce', lettuce: 'Produce', spinach: 'Produce', carrot: 'Produce', orange: 'Produce',
  bread: 'Bakery', bun: 'Bakery', bagel: 'Bakery',
  chips: 'Snacks', cookies: 'Snacks', chocolate: 'Snacks', biscuits: 'Snacks',
  juice: 'Beverages', soda: 'Beverages', water: 'Beverages', cola: 'Beverages',
  chicken: 'Meat', fish: 'Meat', mutton: 'Meat', egg: 'Meat', eggs: 'Meat',
  rice: 'Pantry', pasta: 'Pantry', oil: 'Pantry', sugar: 'Pantry', salt: 'Pantry', flour: 'Pantry', atta: 'Pantry',
  toothpaste: 'Personal Care', soap: 'Personal Care', shampoo: 'Personal Care'
};

const SUBSTITUTES = {
  milk: 'almond milk or oat milk', sugar: 'honey or stevia', butter: 'margarine',
  bread: 'gluten-free bread', rice: 'quinoa', chicken: 'tofu or paneer'
};

const SEASONAL_BY_MONTH = {
  0: ['oranges', 'strawberries'], 1: ['oranges', 'spinach'], 2: ['peas', 'mangoes (early)'],
  3: ['mangoes', 'watermelon'], 4: ['mangoes', 'litchi'], 5: ['watermelon', 'muskmelon'],
  6: ['corn', 'jamun'], 7: ['corn', 'plums'], 8: ['pomegranate', 'guava'],
  9: ['apples', 'pumpkin'], 10: ['oranges', 'sweet potato'], 11: ['carrots', 'peas']
};

const MOCK_CATALOG = [
  { name: 'Colgate Total Toothpaste', brand: 'Colgate', price: 85, category: 'Personal Care' },
  { name: 'Sensodyne Toothpaste', brand: 'Sensodyne', price: 145, category: 'Personal Care' },
  { name: 'Organic Fuji Apples (1kg)', brand: 'Farm Fresh', price: 220, category: 'Produce' },
  { name: 'Organic Gala Apples (1kg)', brand: "Nature's Best", price: 260, category: 'Produce' },
  { name: 'Amul Full Cream Milk (1L)', brand: 'Amul', price: 66, category: 'Dairy' },
  { name: 'Almond Breeze Almond Milk (1L)', brand: 'Blue Diamond', price: 320, category: 'Dairy' },
  { name: 'Britannia Brown Bread', brand: 'Britannia', price: 55, category: 'Bakery' },
  { name: 'Lays Classic Chips', brand: 'Lays', price: 20, category: 'Snacks' },
  { name: 'Tropicana Orange Juice (1L)', brand: 'Tropicana', price: 130, category: 'Beverages' },
  { name: 'Basmati Rice (5kg)', brand: 'India Gate', price: 480, category: 'Pantry' }
];