import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import './styles.css'

export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  return (
    <div className="home">
      <div className="content">
        <div className="logo-container">
          <div className="logo-icon">TRX</div>
        </div>
        {!user && <h1>TRX Computers CMS</h1>}
        {user && <h1>Welcome back, {(user as any).name || user.email}</h1>}
        <p className="subtitle">
          Manage your e-commerce data, products, categories, and brands efficiently.
        </p>
        <div className="links">
          <a
            className="admin"
            href={payloadConfig.routes.admin}
          >
            Go to Admin Panel
          </a>
          <a
            className="frontend-link"
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Storefront
          </a>
        </div>
      </div>
    </div>
  )
}
