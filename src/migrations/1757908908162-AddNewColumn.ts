import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumn1757908908162 implements MigrationInterface {
    name = 'AddNewColumn1757908908162'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users_allow_role" DROP CONSTRAINT "FK_668beb57a0e0ab6a979380af563"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_668beb57a0e0ab6a979380af56"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2bf802bfb1c8689ac24d181e4c"`);
        await queryRunner.query(`ALTER TABLE "project" ADD "status" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "customer" ADD "status" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`CREATE INDEX "IDX_668beb57a0e0ab6a979380af56" ON "users_allow_role" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2bf802bfb1c8689ac24d181e4c" ON "users_allow_role" ("role_id") `);
        await queryRunner.query(`ALTER TABLE "users_allow_role" ADD CONSTRAINT "FK_668beb57a0e0ab6a979380af563" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users_allow_role" DROP CONSTRAINT "FK_668beb57a0e0ab6a979380af563"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2bf802bfb1c8689ac24d181e4c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_668beb57a0e0ab6a979380af56"`);
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE INDEX "IDX_2bf802bfb1c8689ac24d181e4c" ON "users_allow_role" ("role_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_668beb57a0e0ab6a979380af56" ON "users_allow_role" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "users_allow_role" ADD CONSTRAINT "FK_668beb57a0e0ab6a979380af563" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
