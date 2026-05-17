import { getPayload } from 'payload'
import config from '@/payload.config'

const CATEGORIES_URL = 'https://ac65edvr7mja7sxl5pcw7moeou0zqrwt.lambda-url.us-east-1.on.aws/'
const PRODUCTS_URL = 'https://ajubnnlxicx53an4oebbbs75sq0nuork.lambda-url.us-east-1.on.aws' // trx
// const PRODUCTS_URL = 'https://j4qngdae3aotate5echyul6zvq0ucmza.lambda-url.us-east-1.on.aws' // main
// 

const slugify = (text: string) => text.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')

export async function syncCategories() {
  const payload = await getPayload({ config })
  const response = await fetch(CATEGORIES_URL)
  const odooCategories = (await response.json()) as any[]

  for (const odooCat of odooCategories) {
    const existing = await payload.find({
      collection: 'categories',
      where: {
        odooId: {
          equals: odooCat.id,
        },
      },
    })

    const data = {
      name: odooCat.name,
      odooId: odooCat.id,
      order: odooCat.sequence,
      slug: slugify(odooCat.name),
    }

    if (existing.docs.length > 0) {
      await payload.update({
        collection: 'categories',
        id: existing.docs[0].id,
        data,
      })
    } else {
      await payload.create({
        collection: 'categories',
        data,
      })
    }
  }

  return { success: true, count: odooCategories.length }
}

export async function syncNewProducts() {
  const payload = await getPayload({ config })
  
  // 1. Get all categories from Payload that have an odooId
  const categories = await payload.find({
    collection: 'categories',
    limit: 100,
  })

  console.log(`[Sync Products] Found ${categories.docs.length} categories in Payload CMS`)

  let totalSynced = 0

  for (const cat of categories.docs) {
    if (!cat.odooId) {
      console.log(`[Sync Products] Skipping category ${cat.name} because it has no odooId`)
      continue
    }

    console.log(`[Sync Products] Querying Odoo for category: ${cat.name} (odooId: ${cat.odooId})`)

    // Fetch products belonging to target warehouses, including the pre-calculated store and warehouse stock splits
    const response = await fetch(`${PRODUCTS_URL}?categoryId=${cat.odooId}&instock=true`)

    let odooProducts: any[] = []
    try {
      odooProducts = (await response.json()) as any[]
      console.log(`[Sync Products] Category ${cat.name} returned ${odooProducts.length} products from Odoo`)
    } catch (e) {
      console.error(`Error parsing products for category ${cat.odooId}:`, e)
      continue
    }

    for (const odooProd of odooProducts) {
      const existing = await payload.find({
        collection: 'products',
        where: {
          or: [
            {
              odooId: {
                equals: odooProd.id,
              },
            },
            {
              sku: {
                equals: odooProd.id.toString(),
              },
            },
          ],
        },
      })

      const storeStock = odooProd.qty_store || 0
      const warehouseStock = odooProd.qty_warehouse || 0

      const data = {
        name: odooProd.name,
        odooId: odooProd.id,
        sku: odooProd.id.toString(),
        price: odooProd.list_price,
        stock: odooProd.qty_available,
        storeStock,
        warehouseStock,
        categories: [cat.id],
        slug: slugify(odooProd.name),
      }

      if (existing.docs.length > 0) {
        // We only update name/price/stock/category for existing products during full sync
        await payload.update({
          collection: 'products',
          id: existing.docs[0].id,
          data,
        })
      } else {
        await payload.create({
          collection: 'products',
          data,
        })
      }
      totalSynced++
    }
  }

  return { success: true, totalSynced }
}

export async function syncInventory() {
  const payload = await getPayload({ config })
  
  // To sync inventory efficiently (1 min job), we ideally want a "recent updates" endpoint from Odoo.
  // Since we don't have that, we have to iterate through categories again, 
  // or fetch all products in Payload and update them.
  // Given the current Lambda endpoints, we'll iterate through categories.
  
  return syncNewProducts() // For now, syncNewProducts handles updates as well.
}
