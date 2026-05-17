import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`products\` ADD \`store_stock\` numeric DEFAULT 0;`)
  await db.run(sql`ALTER TABLE \`products\` ADD \`warehouse_stock\` numeric DEFAULT 0;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`products\` DROP COLUMN \`store_stock\`;`)
  await db.run(sql`ALTER TABLE \`products\` DROP COLUMN \`warehouse_stock\`;`)
}
