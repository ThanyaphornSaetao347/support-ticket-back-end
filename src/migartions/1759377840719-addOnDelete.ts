import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOnDelete1759377840719 implements MigrationInterface {
    name = 'AddOnDelete1759377840719'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users_allow_role" DROP CONSTRAINT "FK_668beb57a0e0ab6a979380af563"`);
        await queryRunner.query(`ALTER TABLE "users_allow_role" DROP CONSTRAINT "FK_2bf802bfb1c8689ac24d181e4ca"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_668beb57a0e0ab6a979380af56"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2bf802bfb1c8689ac24d181e4c"`);
        await queryRunner.query(`ALTER TABLE "ticket_notification" DROP COLUMN "ticket_no"`);
        await queryRunner.query(`ALTER TABLE "ticket_notification" ADD "ticket_no" integer NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_668beb57a0e0ab6a979380af56" ON "users_allow_role" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2bf802bfb1c8689ac24d181e4c" ON "users_allow_role" ("role_id") `);
        await queryRunner.query(`ALTER TABLE "users_allow_role" ADD CONSTRAINT "FK_668beb57a0e0ab6a979380af563" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users_allow_role" ADD CONSTRAINT "FK_2bf802bfb1c8689ac24d181e4ca" FOREIGN KEY ("role_id") REFERENCES "master_role"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_notification" ADD CONSTRAINT "FK_06c447fce026fd089416f461f28" FOREIGN KEY ("ticket_no") REFERENCES "ticket"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_notification" DROP CONSTRAINT "FK_06c447fce026fd089416f461f28"`);
        await queryRunner.query(`ALTER TABLE "users_allow_role" DROP CONSTRAINT "FK_2bf802bfb1c8689ac24d181e4ca"`);
        await queryRunner.query(`ALTER TABLE "users_allow_role" DROP CONSTRAINT "FK_668beb57a0e0ab6a979380af563"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2bf802bfb1c8689ac24d181e4c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_668beb57a0e0ab6a979380af56"`);
        await queryRunner.query(`ALTER TABLE "ticket_notification" DROP COLUMN "ticket_no"`);
        await queryRunner.query(`ALTER TABLE "ticket_notification" ADD "ticket_no" character varying NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_2bf802bfb1c8689ac24d181e4c" ON "users_allow_role" ("role_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_668beb57a0e0ab6a979380af56" ON "users_allow_role" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "users_allow_role" ADD CONSTRAINT "FK_2bf802bfb1c8689ac24d181e4ca" FOREIGN KEY ("role_id") REFERENCES "master_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users_allow_role" ADD CONSTRAINT "FK_668beb57a0e0ab6a979380af563" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
