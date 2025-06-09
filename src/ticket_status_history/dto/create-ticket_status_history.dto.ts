import { IsNotEmpty } from "class-validator";

export class CreateTicketStatusHistoryDto {
    @IsNotEmpty()
    ticket_id: number;

    @IsNotEmpty()
    status_id: number;

    @IsNotEmpty()
    create_date: Date;

    @IsNotEmpty()
    create_by: number;
}
