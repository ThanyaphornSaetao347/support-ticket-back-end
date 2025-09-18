import { MigrationInterface, QueryRunner } from "typeorm";

export class FixTicketCategoriesLanguageId1758077615838 implements MigrationInterface {
    name = 'FixTicketCategoriesLanguageId1758077615838'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users_allow_role" DROP CONSTRAINT "FK_668beb57a0e0ab6a979380af563"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_668beb57a0e0ab6a979380af56"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2bf802bfb1c8689ac24d181e4c"`);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "ticket_categories_language_id_seq" OWNED BY "ticket_categories_language"."id"`);
        await queryRunner.query(`ALTER TABLE "ticket_categories_language" ALTER COLUMN "id" SET DEFAULT nextval('"ticket_categories_language_id_seq"')`);
        await queryRunner.query(`CREATE INDEX "IDX_668beb57a0e0ab6a979380af56" ON "users_allow_role" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2bf802bfb1c8689ac24d181e4c" ON "users_allow_role" ("role_id") `);
        await queryRunner.query(`ALTER TABLE "users_allow_role" ADD CONSTRAINT "FK_668beb57a0e0ab6a979380af563" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users_allow_role" DROP CONSTRAINT "FK_668beb57a0e0ab6a979380af563"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP CONSTRAINT "FK_71f44b2f1b780e8ae0aec266939"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2bf802bfb1c8689ac24d181e4c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_668beb57a0e0ab6a979380af56"`);
        await queryRunner.query(`ALTER TABLE "ticket_categories_language" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`DROP SEQUENCE "ticket_categories_language_id_seq"`);
        await queryRunner.query(`CREATE INDEX "IDX_2bf802bfb1c8689ac24d181e4c" ON "users_allow_role" ("role_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_668beb57a0e0ab6a979380af56" ON "users_allow_role" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "users_allow_role" ADD CONSTRAINT "FK_668beb57a0e0ab6a979380af563" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
