import { MigrationInterface, QueryRunner } from "typeorm";

export class SetDefualtStatusIdOfNoti1757928806126 implements MigrationInterface {
    name = 'SetDefualtStatusIdOfNoti1757928806126'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users_allow_role" DROP CONSTRAINT "FK_668beb57a0e0ab6a979380af563"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_668beb57a0e0ab6a979380af56"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2bf802bfb1c8689ac24d181e4c"`);
        await queryRunner.query(`ALTER TABLE "ticket_notification" DROP CONSTRAINT "FK_4cb92ebbaa5722242954c09162e"`);

        // ✅ อัปเดตค่า NULL ก่อน
        await queryRunner.query(`UPDATE "ticket_notification" SET "status_id" = 1 WHERE "status_id" IS NULL`);

        // ✅ ค่อยบังคับ NOT NULL
        await queryRunner.query(`ALTER TABLE "ticket_notification" ALTER COLUMN "status_id" SET NOT NULL`);

        await queryRunner.query(`CREATE INDEX "IDX_668beb57a0e0ab6a979380af56" ON "users_allow_role" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2bf802bfb1c8689ac24d181e4c" ON "users_allow_role" ("role_id") `);
        await queryRunner.query(`ALTER TABLE "users_allow_role" ADD CONSTRAINT "FK_668beb57a0e0ab6a979380af563" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_notification" ADD CONSTRAINT "FK_4cb92ebbaa5722242954c09162e" FOREIGN KEY ("status_id") REFERENCES "ticket_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_notification" DROP CONSTRAINT "FK_4cb92ebbaa5722242954c09162e"`);
        await queryRunner.query(`ALTER TABLE "users_allow_role" DROP CONSTRAINT "FK_668beb57a0e0ab6a979380af563"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2bf802bfb1c8689ac24d181e4c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_668beb57a0e0ab6a979380af56"`);
        await queryRunner.query(`ALTER TABLE "ticket_notification" ALTER COLUMN "status_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_notification" ADD CONSTRAINT "FK_4cb92ebbaa5722242954c09162e" FOREIGN KEY ("status_id") REFERENCES "ticket_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE INDEX "IDX_2bf802bfb1c8689ac24d181e4c" ON "users_allow_role" ("role_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_668beb57a0e0ab6a979380af56" ON "users_allow_role" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "users_allow_role" ADD CONSTRAINT "FK_668beb57a0e0ab6a979380af563" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
