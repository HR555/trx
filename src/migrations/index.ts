import * as migration_20250929_111647 from './20250929_111647';
import * as migration_20260516_074424 from './20260516_074424';
import * as migration_20260516_150539 from './20260516_150539';
import * as migration_20260517_104802_add_store_warehouse_stock from './20260517_104802_add_store_warehouse_stock';

export const migrations = [
  {
    up: migration_20250929_111647.up,
    down: migration_20250929_111647.down,
    name: '20250929_111647',
  },
  {
    up: migration_20260516_074424.up,
    down: migration_20260516_074424.down,
    name: '20260516_074424',
  },
  {
    up: migration_20260516_150539.up,
    down: migration_20260516_150539.down,
    name: '20260516_150539',
  },
  {
    up: migration_20260517_104802_add_store_warehouse_stock.up,
    down: migration_20260517_104802_add_store_warehouse_stock.down,
    name: '20260517_104802_add_store_warehouse_stock'
  },
];
