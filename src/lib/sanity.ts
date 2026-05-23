import { getPayload } from 'payload'
import config from '@/payload.config'

const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID || 'yqd1zell'
const SANITY_DATASET = process.env.SANITY_DATASET || 'production'
const SANITY_TOKEN = process.env.SANITY_TOKEN
const SANITY_API_VERSION = '2024-10-25'

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')

async function querySanity(query: string, params: Record<string, any> = {}) {
  const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`
  const headers: Record<string, string> = {}
  if (SANITY_TOKEN) {
    headers['Authorization'] = `Bearer ${SANITY_TOKEN}`
  }
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sanity query failed: ${res.statusText} (${res.status}). Body: ${text}`)
  }
  const data = (await res.json()) as { result: unknown }
  return data.result
}

// Convert Sanity Portable Text blocks to Lexical JSON format for Payload
function portableTextToLexical(blocks: any[]) {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return null
  const children = blocks
    .map((block) => {
      if (block._type === 'block') {
        const textChildren = (block.children || []).map((child: any) => ({
          type: 'text',
          text: child.text || '',
          version: 1,
        }))
        return {
          type: 'paragraph',
          version: 1,
          children: textChildren,
        }
      }
      return null
    })
    .filter(Boolean)

  if (children.length === 0) return null

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children,
    },
  }
}

// Helper to get existing Media or upload it from a CDN URL
async function getOrUploadMedia(payload: any, url: string, alt: string, targetFilename: string) {
  // Check if media already exists in Payload
  const existingMedia = await payload.find({
    collection: 'media',
    where: {
      filename: {
        equals: targetFilename,
      },
    },
    limit: 1,
  })

  if (existingMedia.docs.length > 0) {
    console.log(`[Sanity Sync] Reusing existing media: ${targetFilename}`)
    return existingMedia.docs[0].id
  }

  console.log(`[Sanity Sync] Downloading image: ${url}`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to download image from Sanity CDN: ${res.statusText}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const contentType = res.headers.get('content-type') || 'image/jpeg'

  console.log(
    `[Sanity Sync] Uploading image to Payload: ${targetFilename} (${buffer.length} bytes)`,
  )
  const mediaDoc = await payload.create({
    collection: 'media',
    data: {
      alt: alt || 'Product Image',
    },
    file: {
      data: buffer,
      name: targetFilename,
      mimetype: contentType,
      size: buffer.length,
    },
  })

  return mediaDoc.id
}

export async function handleSanitySync(dryRun = true, categoryOdooId?: number) {
  const payload = await getPayload({ config })

  console.log(
    `[Sanity Sync] Starting sync. Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}${categoryOdooId ? ` | Category filter: ${categoryOdooId}` : ' | All categories'}`,
  )

  // 1. Get all categories from Payload that have an odooId
  const categories = await payload.find({
    collection: 'categories',
    limit: 100,
  })

  // Filter to specific category if requested
  const filteredCategories = categoryOdooId
    ? categories.docs.filter((cat) => cat.odooId === categoryOdooId)
    : categories.docs

  if (categoryOdooId && filteredCategories.length === 0) {
    return {
      error: `No category found with odooId: ${categoryOdooId}`,
      availableCategories: categories.docs
        .filter((c) => c.odooId)
        .map((c) => ({ name: c.name, odooId: c.odooId })),
    }
  }

  let totalSanityProductsChecked = 0
  let matchedInPayload = 0
  let notMatchedInPayload = 0
  let alreadyFullySynced = 0
  let needsSync = 0

  const toSyncList: any[] = []
  const notFoundList: any[] = []

  let productsUpdatedCount = 0
  let imagesUploadedCount = 0
  let brandsCreatedCount = 0

  // Cache brands to avoid excessive queries
  const brandCache: Record<string, string> = {}

  // Fetch all existing brands in Payload first to populate the cache
  const existingBrands = await payload.find({
    collection: 'brands',
    limit: 500,
  })
  for (const b of existingBrands.docs) {
    brandCache[slugify(b.name)] = b.id.toString()
  }

  for (const cat of filteredCategories) {
    if (!cat.odooId) {
      console.log(`[Sanity Sync] Skipping category ${cat.name} (no odooId)`)
      continue
    }

    console.log(
      `[Sanity Sync] Querying Sanity for category products: ${cat.name} (odooId: ${cat.odooId})`,
    )

    // Batch query Sanity for products under this category
    const sanityQuery = `*[_type == "product" && category->odoo_id == ${cat.odooId}] {
      name,
      id,
      odoo_id,
      payzy,
      description,
      specs,
      brand,
      keywords,
      tags,
      "images": image[]{
        alt,
        main_image,
        "url": asset->url,
        "originalFilename": asset->originalFilename
      }
    }`

    let sanityProducts: any[] = []
    try {
      sanityProducts = (await querySanity(sanityQuery)) as any[]
      totalSanityProductsChecked += sanityProducts.length
      console.log(
        `[Sanity Sync] Category ${cat.name} has ${sanityProducts.length} products in Sanity`,
      )
    } catch (e) {
      console.error(`[Sanity Sync] Error fetching category ${cat.name} from Sanity:`, e)
      continue
    }

    for (const sanityProd of sanityProducts) {
      if (!sanityProd.odoo_id) continue

      // Search matching product in Payload CMS by odooId
      const payloadProductRes = await payload.find({
        collection: 'products',
        where: {
          odooId: {
            equals: sanityProd.odoo_id,
          },
        },
        limit: 1,
      })

      if (payloadProductRes.docs.length === 0) {
        notMatchedInPayload++
        notFoundList.push({
          name: sanityProd.name,
          odooId: sanityProd.odoo_id,
          reason: 'Product not found in Payload CMS (requires Odoo sync first)',
        })
        continue
      }

      matchedInPayload++
      const payloadProd = payloadProductRes.docs[0]

      // Determine what is missing in Payload
      const missingImages = !payloadProd.images || payloadProd.images.length === 0
      const missingDescription = !payloadProd.description
      const missingBrand = !payloadProd.brand
      const missingSpecs = !payloadProd.specifications || payloadProd.specifications.length === 0
      const missingTags = !payloadProd.tags || payloadProd.tags.length === 0

      const needsUpdate =
        (sanityProd.images && sanityProd.images.length > 0 && missingImages) ||
        (sanityProd.description && sanityProd.description.length > 0 && missingDescription) ||
        (sanityProd.brand && missingBrand) ||
        (sanityProd.specs && sanityProd.specs.length > 0 && missingSpecs) ||
        (sanityProd.tags && sanityProd.tags.length > 0 && missingTags)

      if (!needsUpdate) {
        alreadyFullySynced++
        continue
      }

      needsSync++

      const missingFields: string[] = []
      if (missingImages && sanityProd.images && sanityProd.images.length > 0)
        missingFields.push('images')
      if (missingDescription && sanityProd.description && sanityProd.description.length > 0)
        missingFields.push('description')
      if (missingBrand && sanityProd.brand) missingFields.push('brand')
      if (missingSpecs && sanityProd.specs && sanityProd.specs.length > 0)
        missingFields.push('specifications')
      if (missingTags && sanityProd.tags && sanityProd.tags.length > 0) missingFields.push('tags')

      toSyncList.push({
        name: sanityProd.name,
        odooId: sanityProd.odoo_id,
        missingFields,
      })

      // If dryRun is false, execute the updates!
      if (!dryRun) {
        try {
          const updateData: Record<string, any> = {}

          // 1. Brand Sync
          if (missingBrand && sanityProd.brand) {
            const brandSlug = slugify(sanityProd.brand)
            let brandId = brandCache[brandSlug]

            if (!brandId) {
              console.log(`[Sanity Sync] Creating new brand in Payload: ${sanityProd.brand}`)
              const newBrand = await payload.create({
                collection: 'brands',
                data: {
                  name: sanityProd.brand,
                  slug: brandSlug,
                },
              })
              brandId = newBrand.id.toString()
              brandCache[brandSlug] = brandId
              brandsCreatedCount++
            }
            updateData.brand = brandId
          }

          // 2. Images Sync
          if (missingImages && sanityProd.images && sanityProd.images.length > 0) {
            const imagesData = []
            for (let i = 0; i < sanityProd.images.length; i++) {
              const img = sanityProd.images[i]
              if (!img.url) continue

              const fileExt = img.url.split('.').pop()?.split('?')[0] || 'jpg'
              // Construct SEO-friendly filename: e.g. "gigabyte-motherboard-1.png"
              const targetFilename = `${slugify(payloadProd.name || sanityProd.name)}-${i + 1}.${fileExt}`

              try {
                const mediaId = await getOrUploadMedia(
                  payload,
                  img.url,
                  img.alt || payloadProd.name,
                  targetFilename,
                )
                imagesData.push({
                  image: mediaId,
                  isPrimary: img.main_image || i === 0,
                })
                imagesUploadedCount++
              } catch (imgErr) {
                console.error(`[Sanity Sync] Failed to upload image ${img.url}:`, imgErr)
              }
            }

            if (imagesData.length > 0) {
              updateData.images = imagesData
            }
          }

          // 3. Description Sync
          if (missingDescription && sanityProd.description && sanityProd.description.length > 0) {
            const lexicalJson = portableTextToLexical(sanityProd.description)
            if (lexicalJson) {
              updateData.description = lexicalJson
            }
          }

          // 4. Specifications Sync
          if (missingSpecs && sanityProd.specs && sanityProd.specs.length > 0) {
            updateData.specifications = [
              {
                group: 'General',
                items: sanityProd.specs.map((s: any) => ({
                  label: s.spec,
                  value: s.desc,
                })),
              },
            ]
          }

          // 5. Tags Sync
          if (missingTags && sanityProd.tags && sanityProd.tags.length > 0) {
            updateData.tags = sanityProd.tags.map((t: string) => ({ tag: t }))
          }

          // Update the Payload product if we mapped any new data
          if (Object.keys(updateData).length > 0) {
            console.log(
              `[Sanity Sync] Updating product: ${payloadProd.name} (odooId: ${payloadProd.odooId})`,
            )
            await payload.update({
              collection: 'products',
              id: payloadProd.id,
              data: updateData,
            })
            productsUpdatedCount++
          }
        } catch (syncErr) {
          console.error(
            `[Sanity Sync] Failed to sync product ${sanityProd.name} (odooId: ${sanityProd.odoo_id}):`,
            syncErr,
          )
        }
      }
    }
  }

  return {
    dryRun,
    summary: {
      totalSanityProductsChecked,
      matchedInPayload,
      notMatchedInPayload,
      alreadyFullySynced,
      needsSync,
      productsUpdatedCount,
      imagesUploadedCount,
      brandsCreatedCount,
    },
    toSync: toSyncList,
    notFound: notFoundList,
  }
}
