import { UserAllowRole } from "src/user_allow_role/entities/user_allow_role.entity";
import { Users } from "src/users/entities/user.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('master_role')
export class MasterRole {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true})
    role_name: string;

    @OneToMany(() => UserAllowRole, userRole => userRole.role)
    userRole: UserAllowRole[];

    @OneToMany(() => Users, user => user.role)
    userAllowRole: Users[];
}
