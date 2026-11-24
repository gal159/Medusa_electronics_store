import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261123165357 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "component_spec" drop constraint if exists "component_spec_category_check";`);

    this.addSql(`alter table if exists "component_spec" add column if not exists "attributes" jsonb null;`);
    this.addSql(`alter table if exists "component_spec" add constraint "component_spec_category_check" check("category" in ('mcu_board', 'sensor', 'display', 'actuator', 'power', 'communication', 'passive', 'accessory', 'led_controller'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "component_spec" drop constraint if exists "component_spec_category_check";`);

    this.addSql(`alter table if exists "component_spec" drop column if exists "attributes";`);

    this.addSql(`alter table if exists "component_spec" add constraint "component_spec_category_check" check("category" in ('mcu_board', 'sensor', 'display', 'actuator', 'power', 'communication', 'passive', 'accessory'));`);
  }

}
