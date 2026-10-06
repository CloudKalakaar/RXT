// RXT Productions - Catalogue Management Module
const DEFAULT_CATALOGUE = [
  {
    id: 'cat_trad_01',
    name: 'Traditional Photo & Video (Full Package)',
    category: 'Traditional',
    description: 'Traditional Photography & High-definition Video coverage with full ceremony capture.',
    price: 35000
  },
  {
    id: 'cat_trad_02',
    name: 'Traditional Photography (Stills Only)',
    category: 'Traditional',
    description: 'Traditional photographer for stage, family & guest portraits.',
    price: 18000
  },
  {
    id: 'cat_candid_01',
    name: 'Candid Photography & Cinematic Film',
    category: 'Candid',
    description: 'Senior candid photographer + cinematic highlights teaser & 4K wedding film.',
    price: 45000
  },
  {
    id: 'cat_candid_02',
    name: 'Candid Photography (Stills Only)',
    category: 'Candid',
    description: 'Artistic candid coverage focusing on raw emotions, moments & details.',
    price: 25000
  },
  {
    id: 'cat_drone_01',
    name: '4K Drone Aerial Coverage',
    category: 'Cinematic',
    description: 'Licensed pilot with 4K drone capturing grand venue aerials and processions.',
    price: 15000
  },
  {
    id: 'cat_album_01',
    name: 'Premium Leatherette Photobook Album',
    category: 'Printing',
    description: '40 Pages ultra HD glossy/matte feather-touch photobook with case.',
    price: 12000
  }
];

class CatalogueManager {
  constructor(initialData = null) {
    this.items = initialData && initialData.length > 0 ? initialData : JSON.parse(JSON.stringify(DEFAULT_CATALOGUE));
  }

  getAll() {
    return this.items;
  }

  getById(id) {
    return this.items.find(item => item.id === id);
  }

  addItem({ name, category, description, price }) {
    const newItem = {
      id: 'cat_' + Date.now(),
      name: (name || 'Custom Service').trim(),
      category: (category || 'Traditional').trim(),
      description: (description || '').trim(),
      price: Math.max(0, Number(price) || 0)
    };
    this.items.push(newItem);
    return newItem;
  }

  updateItem(id, updates) {
    const idx = this.items.findIndex(item => item.id === id);
    if (idx !== -1) {
      this.items[idx] = {
        ...this.items[idx],
        ...updates,
        price: updates.price !== undefined ? Math.max(0, Number(updates.price) || 0) : this.items[idx].price
      };
      return this.items[idx];
    }
    return null;
  }

  deleteItem(id) {
    const idx = this.items.findIndex(item => item.id === id);
    if (idx !== -1) {
      const removed = this.items.splice(idx, 1);
      return removed[0];
    }
    return null;
  }

  resetToDefaults() {
    this.items = JSON.parse(JSON.stringify(DEFAULT_CATALOGUE));
    return this.items;
  }
}

window.CatalogueManager = CatalogueManager;
window.DEFAULT_CATALOGUE = DEFAULT_CATALOGUE;
