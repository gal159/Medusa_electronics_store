import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261114133329 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "mcu_capabilities" drop constraint if exists "mcu_capabilities_spec_id_unique";`);
    this.addSql(`create table if not exists "component_spec" ("id" text not null, "category" text check ("category" in ('mcu_board', 'sensor', 'display', 'actuator', 'power', 'communication', 'passive', 'accessory')) not null, "supply_voltage_min_v" real null, "supply_voltage_max_v" real null, "logic_voltage_v" real null, "input_high_min_v" real null, "is_five_volt_tolerant" boolean not null default false, "current_typ_ma" real null, "current_max_ma" real null, "datasheet_url" text not null, "datasheet_note" text null, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "component_spec_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_component_spec_deleted_at" ON "component_spec" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "component_interface" ("id" text not null, "type" text check ("type" in ('i2c', 'spi', 'uart', 'analog_in', 'digital_io', 'pwm', 'onewire')) not null, "pin_count" integer not null default 1, "i2c_addresses" jsonb null, "i2c_address_selectable" boolean not null default false, "spec_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "component_interface_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_component_interface_spec_id" ON "component_interface" ("spec_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_component_interface_deleted_at" ON "component_interface" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "mcu_capabilities" ("id" text not null, "digital_pins" integer not null, "analog_inputs" integer not null, "analog_inputs_usable_with_wifi" integer null, "pwm_pins" integer not null, "i2c_buses" integer not null, "spi_buses" integer not null, "uarts" integer not null, "has_wifi" boolean not null default false, "io_voltage_v" real not null, "is_five_volt_tolerant" boolean not null default false, "spec_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mcu_capabilities_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mcu_capabilities_spec_id_unique" ON "mcu_capabilities" ("spec_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mcu_capabilities_deleted_at" ON "mcu_capabilities" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "power_rail" ("id" text not null, "label" text not null, "voltage_v" real not null, "max_current_ma" real null, "spec_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "power_rail_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_power_rail_spec_id" ON "power_rail" ("spec_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_power_rail_deleted_at" ON "power_rail" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "component_interface" add constraint "component_interface_spec_id_foreign" foreign key ("spec_id") references "component_spec" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "mcu_capabilities" add constraint "mcu_capabilities_spec_id_foreign" foreign key ("spec_id") references "component_spec" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "power_rail" add constraint "power_rail_spec_id_foreign" foreign key ("spec_id") references "component_spec" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "component_interface" drop constraint if exists "component_interface_spec_id_foreign";`);

    this.addSql(`alter table if exists "mcu_capabilities" drop constraint if exists "mcu_capabilities_spec_id_foreign";`);

    this.addSql(`alter table if exists "power_rail" drop constraint if exists "power_rail_spec_id_foreign";`);

    this.addSql(`drop table if exists "component_spec" cascade;`);

    this.addSql(`drop table if exists "component_interface" cascade;`);

    this.addSql(`drop table if exists "mcu_capabilities" cascade;`);

    this.addSql(`drop table if exists "power_rail" cascade;`);
  }

}
