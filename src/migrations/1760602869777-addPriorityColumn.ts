import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPriorityColumn1760602869777 implements MigrationInterface {
    name = 'AddPriorityColumn1760602869777'

    public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ticket" ADD "priority" integer DEFAULT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ticket"
      DROP COLUMN "priority"
    `);
  }
}