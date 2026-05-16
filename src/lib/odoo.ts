import { getPayload } from 'payload'
import config from '@/payload.config'

const CATEGORIES_URL = 'https://ac65edvr7mja7sxl5pcw7moeou0zqrwt.lambda-url.us-east-1.on.aws/'
const PRODUCTS_URL = 'https://ajubnnlxicx53an4oebbbs75sq0nuork.lambda-url.us-east-1.on.aws'

export async function syncCategories() {
  const payload = await getPayload({ config })
  const response = await fetch(CATEGORIES_URL)
  const odooCategories = await response.json()

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
      slug: odooCat.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
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

  let totalSynced = 0

  for (const cat of categories.docs) {
    if (!cat.odooId) continue

    const response = await fetch(`${PRODUCTS_URL}?categoryId=${cat.odooId}&instock=true`)
    const odooProducts = await response.json()

    for (const odooProd of odooProducts) {
      const existing = await payload.find({
        collection: 'products',
        where: {
          odooId: {
            equals: odooProd.id,
          },
        },
      })

      const data = {
        name: odooProd.name,
        odooId: odooProd.id,
        sku: odooProd.id.toString(),
        price: odooProd.list_price,
        stock: odooProd.qty_available,
        categories: [cat.id],
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
