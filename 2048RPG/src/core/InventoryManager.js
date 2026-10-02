// InventoryManager.js: Manages Out-of-Combat Equipment Inventory, Merging, and Loadout

export const MAX_INVENTORY_CAPACITY = 24;

export class InventoryManager {
  constructor(maxCapacity = MAX_INVENTORY_CAPACITY) {
    this.maxCapacity = maxCapacity;
    this.items = []; // Array of { id: string, value: number, type: 'EQUIPMENT' }
    this.equippedItem = null; // { id: string, value: number, type: 'EQUIPMENT' } | null
  }

  // Check if n items can be added
  canAdd(count = 1) {
    return (this.items.length + count) <= this.maxCapacity;
  }

  // Add a single item
  addItem(value) {
    if (!this.canAdd(1)) return null;
    const item = {
      id: 'eq_' + Math.random().toString(36).substr(2, 9),
      value: Number(value),
      type: 'EQUIPMENT'
    };
    this.items.push(item);
    return item;
  }

  // Add multiple items (e.g. from 10-pull gacha)
  addItems(values = []) {
    const added = [];
    for (const val of values) {
      const it = this.addItem(val);
      if (it) added.push(it);
    }
    return added;
  }

  // Remove item by id
  removeItem(id) {
    const idx = this.items.findIndex(it => it.id === id);
    if (idx !== -1) {
      return this.items.splice(idx, 1)[0];
    }
    return null;
  }

  getItem(id) {
    return this.items.find(it => it.id === id) || null;
  }

  // Equip an item from inventory to Hero's active combat loadout
  equip(itemId) {
    const itemIndex = this.items.findIndex(it => it.id === itemId);
    if (itemIndex === -1) {
      return { success: false, reason: '道具不存在於背包中' };
    }

    const itemToEquip = this.items[itemIndex];

    if (this.equippedItem) {
      // Swap: push previously equipped item back to inventory
      const oldEquipped = this.equippedItem;
      this.items[itemIndex] = oldEquipped;
      this.equippedItem = itemToEquip;
    } else {
      // Remove from inventory and set as equipped
      this.items.splice(itemIndex, 1);
      this.equippedItem = itemToEquip;
    }

    return { success: true, equipped: this.equippedItem };
  }

  // Unequip current active equipment back to inventory
  unequip() {
    if (!this.equippedItem) {
      return { success: false, reason: '未佩戴任何裝備' };
    }
    if (!this.canAdd(1)) {
      return { success: false, reason: '裝備背包已滿，無法卸下！' };
    }

    this.items.push(this.equippedItem);
    const unequipped = this.equippedItem;
    this.equippedItem = null;
    return { success: true, unequipped };
  }

  // Get current active hero combat starting power
  getEquippedPower() {
    return this.equippedItem ? this.equippedItem.value : 2;
  }

  // Batch Auto-Merge: Greedily and recursively merges all matching pairs from lowest value up
  batchAutoMerge() {
    if (this.items.length < 2) {
      return {
        mergedCount: 0,
        beforeCount: this.items.length,
        afterCount: this.items.length,
        freedSlots: 0,
        highestCreated: 0
      };
    }

    const beforeCount = this.items.length;
    const counts = new Map();
    for (const item of this.items) {
      counts.set(item.value, (counts.get(item.value) || 0) + 1);
    }

    let totalMerges = 0;
    let highestCreated = 0;

    while (true) {
      const sortedValues = Array.from(counts.keys())
        .filter(v => counts.get(v) > 0)
        .sort((a, b) => a - b);

      let mergedAny = false;

      for (const val of sortedValues) {
        const count = counts.get(val);
        if (count >= 2) {
          const pairs = Math.floor(count / 2);
          const remainder = count % 2;
          const nextVal = val * 2;

          counts.set(val, remainder);
          counts.set(nextVal, (counts.get(nextVal) || 0) + pairs);

          totalMerges += pairs;
          if (nextVal > highestCreated) highestCreated = nextVal;
          mergedAny = true;
          break; // Restart scan from lowest value for proper cascading
        }
      }

      if (!mergedAny) break;
    }

    // Rebuild items array (sorted by value ascending)
    const newItems = [];
    const sortedValues = Array.from(counts.keys())
      .filter(v => counts.get(v) > 0)
      .sort((a, b) => a - b);

    for (const val of sortedValues) {
      const count = counts.get(val);
      for (let i = 0; i < count; i++) {
        newItems.push({
          id: 'eq_' + Math.random().toString(36).substr(2, 9),
          value: val,
          type: 'EQUIPMENT'
        });
      }
    }

    this.items = newItems;

    return {
      mergedCount: totalMerges,
      beforeCount,
      afterCount: this.items.length,
      freedSlots: beforeCount - this.items.length,
      highestCreated
    };
  }

  // Manual fusion of 2 items
  mergeItems(id1, id2) {
    if (id1 === id2) return { success: false, reason: '不能與自身合成' };
    const it1 = this.getItem(id1);
    const it2 = this.getItem(id2);
    if (!it1 || !it2) return { success: false, reason: '找不到指定裝備' };

    if (it1.value !== it2.value) {
      return { success: false, reason: '數值不同無法合成' };
    }

    const newVal = it1.value * 2;
    this.removeItem(id1);
    this.removeItem(id2);

    const newItem = {
      id: 'eq_' + Math.random().toString(36).substr(2, 9),
      value: newVal,
      type: 'EQUIPMENT'
    };
    this.items.push(newItem);

    return { success: true, newItem };
  }

  upgradeCapacity(additionalSlots = 4) {
    this.maxCapacity += additionalSlots;
    return this.maxCapacity;
  }

  setCapacity(newCapacity) {
    this.maxCapacity = Math.max(MAX_INVENTORY_CAPACITY, Number(newCapacity) || MAX_INVENTORY_CAPACITY);
    return this.maxCapacity;
  }

  serialize() {
    return {
      items: this.items,
      equippedItem: this.equippedItem,
      maxCapacity: this.maxCapacity
    };
  }

  deserialize(data) {
    if (!data) return;
    if (typeof data.maxCapacity === 'number') {
      this.maxCapacity = Math.max(MAX_INVENTORY_CAPACITY, data.maxCapacity);
    }
    if (Array.isArray(data.items)) {
      this.items = data.items.map(it => ({
        id: it.id || ('eq_' + Math.random().toString(36).substr(2, 9)),
        value: Number(it.value),
        type: 'EQUIPMENT'
      }));
    }
    if (data.equippedItem) {
      this.equippedItem = {
        id: data.equippedItem.id || ('eq_' + Math.random().toString(36).substr(2, 9)),
        value: Number(data.equippedItem.value),
        type: 'EQUIPMENT'
      };
    } else {
      this.equippedItem = null;
    }
  }
}
