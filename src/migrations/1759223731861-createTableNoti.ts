import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTableNoti1759223731861 implements MigrationInterface {
    name = 'CreateTableNoti1759223731861'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users_allow_role" DROP CONSTRAINT "FK_668beb57a0e0ab6a979380af563"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_668beb57a0e0ab6a979380af56"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2bf802bfb1c8689ac24d181e4c"`);
        await queryRunner.query(`CREATE TABLE "ticket_notification" ("id" SERIAL NOT NULL, "ticket_no" integer NOT NULL, "user_id" integer NOT NULL, "status_id" integer NOT NULL DEFAULT '1', "notification_type" "public"."ticket_notification_notification_type_enum" NOT NULL, "title" character varying NOT NULL, "message" text, "is_read" boolean NOT NULL DEFAULT false, "read_at" TIMESTAMP, "email_sent" boolean NOT NULL DEFAULT false, "email_sent_at" TIMESTAMP, "create_date" TIMESTAMP NOT NULL DEFAULT now(), "update_date" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d9ab85d30ed976f2041328eae7a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_668beb57a0e0ab6a979380af56" ON "users_allow_role" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2bf802bfb1c8689ac24d181e4c" ON "users_allow_role" ("role_id") `);
        await queryRunner.query(`ALTER TABLE "users_allow_role" ADD CONSTRAINT "FK_668beb57a0e0ab6a979380af563" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_notification" ADD CONSTRAINT "FK_9360ebd65f766c667e8199cdea1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_notification" ADD CONSTRAINT "FK_06c447fce026fd089416f461f28" FOREIGN KEY ("ticket_no") REFERENCES "ticket"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_notification" ADD CONSTRAINT "FK_4cb92ebbaa5722242954c09162e" FOREIGN KEY ("status_id") REFERENCES "ticket_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_notification" DROP CONSTRAINT "FK_4cb92ebbaa5722242954c09162e"`);
        await queryRunner.query(`ALTER TABLE "ticket_notification" DROP CONSTRAINT "FK_06c447fce026fd089416f461f28"`);
        await queryRunner.query(`ALTER TABLE "ticket_notification" DROP CONSTRAINT "FK_9360ebd65f766c667e8199cdea1"`);
        await queryRunner.query(`ALTER TABLE "users_allow_role" DROP CONSTRAINT "FK_668beb57a0e0ab6a979380af563"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2bf802bfb1c8689ac24d181e4c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_668beb57a0e0ab6a979380af56"`);
        await queryRunner.query(`DROP TABLE "ticket_notification"`);
        await queryRunner.query(`CREATE INDEX "IDX_2bf802bfb1c8689ac24d181e4c" ON "users_allow_role" ("role_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_668beb57a0e0ab6a979380af56" ON "users_allow_role" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "users_allow_role" ADD CONSTRAINT "FK_668beb57a0e0ab6a979380af563" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
