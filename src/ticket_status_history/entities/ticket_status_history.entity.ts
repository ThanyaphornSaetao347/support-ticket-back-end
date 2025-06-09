import { Ticket } from "src/ticket/entities/ticket.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'ticket_status_history'})
export class TicketStatusHistory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    ticket_id: number;

    @Column()
    status_id: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP'})
    create_date: Date;

    @Column()
    create_by: number;

    @ManyToOne(() => Ticket, ticket => ticket.history)
    @JoinColumn({ name : 'ticket_id' })
    ticket: Ticket;
}

