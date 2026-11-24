import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261114194133 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "kit" ("id" text not null, "name" text not null, "customer_id" text null, "status" text check ("status" in ('draft', 'validated', 'ordered')) not null default 'draft', "last_validation" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "kit_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_kit_deleted_at" ON "kit" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "kit_item" ("id" text not null, "variant_id" text not null, "product_id" text not null, "quantity" integer not null default 1, "assigned_rail_label" text null, "kit_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "kit_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_kit_item_kit_id" ON "kit_item" ("kit_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_kit_item_deleted_at" ON "kit_item" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "kit_item" add constraint "kit_item_kit_id_foreign" foreign key ("kit_id") references "kit" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "kit_item" drop constraint if exists "kit_item_kit_id_foreign";`);

    this.addSql(`drop table if exists "kit" cascade;`);

    this.addSql(`drop table if exists "kit_item" cascade;`);
  }

}
