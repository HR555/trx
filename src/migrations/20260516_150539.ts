import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`categories\` ADD \`odoo_id\` numeric;`)
  await db.run(sql`CREATE UNIQUE INDEX \`categories_odoo_id_idx\` ON \`categories\` (\`odoo_id\`);`)
  await db.run(sql`ALTER TABLE \`products\` ADD \`odoo_id\` numeric;`)
  await db.run(sql`CREATE UNIQUE INDEX \`products_odoo_id_idx\` ON \`products\` (\`odoo_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`categories_odoo_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`categories\` DROP COLUMN \`odoo_id\`;`)
  await db.run(sql`DROP INDEX \`products_odoo_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`products\` DROP COLUMN \`odoo_id\`;`)
}
