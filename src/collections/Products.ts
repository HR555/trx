import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      required: true,
    },
    {
      name: 'brand',
      type: 'relationship',
      relationTo: 'brands',
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
    },
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'shortDescription',
      type: 'textarea',
    },
    {
      name: 'price',
      type: 'number',
      required: true,
    },
    {
      name: 'compareAtPrice',
      type: 'number',
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'LKR',
    },
    {
      name: 'images',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'isPrimary',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'specifications',
      type: 'array',
      fields: [
        {
          name: 'group',
          type: 'text',
          required: true,
        },
        {
          name: 'items',
          type: 'array',
          fields: [
            {
              name: 'label',
              type: 'text',
              required: true,
            },
            {
              name: 'value',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'variants',
      type: 'array',
      fields: [
        {
          name: 'name',
          type: 'text',
        },
        {
          name: 'sku',
          type: 'text',
        },
        {
          name: 'price',
          type: 'number',
        },
        {
          name: 'stock',
          type: 'number',
        },
      ],
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
    },
    {
      name: 'stock',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'sku',
      type: 'text',
      unique: true,
    },
    {
      name: 'isFeatured',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'isNewArrival',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'isOnSale',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
}
