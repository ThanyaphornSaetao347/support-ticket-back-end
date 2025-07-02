import { MasterRole } from "src/master_role/entities/master_role.entity";
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

@Entity('users_allow_role')
export class UserAllowRole {
    @PrimaryColumn()
    user_id: number;

    @PrimaryColumn()
    role_id: number;

    @ManyToOne(() => MasterRole, masterRole => masterRole.userRole)
    @JoinColumn({ name: 'role_id'})
    role: MasterRole;
}
