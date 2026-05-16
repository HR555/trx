# TRX Computers — Payload CMS Backend

The headless Content Management System powering the TRX Computers e-commerce storefront.

Built with **Payload CMS v3**, optimized for deployment on **Cloudflare Workers** using a **Cloudflare D1 SQLite** database and **R2** object storage for media.

## Collections Schema

The database is structured to support a fully-featured e-commerce catalog:
- **Categories**: Hierarchical taxonomy for products (supports parent categories and ordering).
- **Brands**: Manufacturers / Vendor definitions.
- **Products**: Core e-commerce items featuring price, stock, relations to Categories and Brands, custom specifications, and variant capabilities.
- **Media**: R2-backed bucket for uploading product imagery.
- **Users**: Admin authentication for the dashboard.

## Getting Started Locally

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Setup Environment**
   Create a `.env` file and generate a secure Payload secret:
   ```bash
   echo "PAYLOAD_SECRET=$(openssl rand -hex 32)" > .env
   ```

3. **Start Development Server**
   ```bash
   pnpm run dev
   ```
   *Note: This template is configured to run on port `3001` to avoid conflicting with the Next.js frontend.*

   Visit [http://localhost:3001/admin](http://localhost:3001/admin) to log in and manage data. The frontend is automatically permitted to access this API via explicit CORS configuration.

## Deployment to Cloudflare

This CMS relies on Cloudflare's D1 and R2 infrastructure.
1. Authenticate with Wrangler: `pnpm wrangler login`
2. Create your migration files if you altered the schema: `pnpm payload migrate:create`
3. Deploy the database migrations to Cloudflare: `pnpm run deploy:database`
4. Deploy the application to Cloudflare Workers: `pnpm run deploy:app`
