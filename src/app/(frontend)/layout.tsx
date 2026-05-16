import React from 'react'
import './styles.css'

export const metadata = {
  description: 'Content Management System for TRX Computers.',
  title: 'TRX Computers CMS',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
