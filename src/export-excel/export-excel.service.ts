import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { InjectRepository } from '@nestjs/typeorm';
import { Response } from 'express';
import { Ticket } from '../ticket/entities/ticket.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ExportExcelService {
    constructor(
        @InjectRepository(Ticket)
        private ticketRepo: Repository<Ticket>,
    ) { }

    async exportTickets(res: Response, filter: any) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Helpdesk Tickets');

        worksheet.columns = [
            { header: 'Ticket No', key: 'ticket_no', width: 15 },
            { header: 'Project', key: 'project_name', width: 25 },
            { header: 'Category', key: 'category_name', width: 25 }, // ✅ แก้เป็น category_name
            { header: 'Status', key: 'status_name', width: 15 },
            { header: 'Reporter', key: 'reporter', width: 30 },
            { header: 'Supporter', key: 'supporter', width: 30 },
            { header: 'Create Date', key: 'create_date', width: 20 },
            { header: 'Due Date', key: 'due_date', width: 20 },
            { header: 'Lead Time', key: 'lead_time', width: 10 },
            { header: 'Rating', key: 'rating', width: 10 },
        ];

        let query = this.ticketRepo
            .createQueryBuilder('t')
            .leftJoin('project', 'p', 'p.id = t.project_id')
            .leftJoin('ticket_categories', 'tc', 'tc.id = t.categories_id')
            .leftJoin(
                'ticket_categories_language',
                'tcl',
                'tcl.category_id = tc.id and tcl.language_id = :lang',
                { lang: 'th' },
            )
            .leftJoin('ticket_status', 'ts', 'ts.id = t.status_id')
            .leftJoin(
                'ticket_status_language',
                'tsl',
                'tsl.status_id = ts.id and tsl.language_id = :lang',
                { lang: 'th' },
            )
            .leftJoin('users', 'u', 'u.id = t.create_by') // reporter
            .leftJoin('ticket_assigned', 'ta', 'ta.ticket_id = t.id') // supporter
            .leftJoin('users', 'su', 'su.id = ta.user_id') // supporter user
            .leftJoin('ticket_satisfaction', 'sa', 'sa.ticket_id = t.id') // rating
            .select([
                't.ticket_no as ticket_no',
                'p.name as project_name',
                'tcl.name as category_name',
                'tsl.name as status_name',
                "CONCAT(u.firstname, ' ', u.lastname) as reporter",
                "CONCAT(su.firstname, ' ', su.lastname) as supporter",
                "TO_CHAR(t.create_date, 'YYYY-MM-DD') as create_date",
                "TO_CHAR(t.due_date, 'YYYY-MM-DD') as due_date",
                't.lead_time as lead_time',
                'sa.rating as rating',
            ]);

        // ✅ เพิ่ม filter ถ้ามี
        if (filter?.status) {
            query = query.andWhere('t.status_id = :status', { status: filter.status });
        }
        if (filter?.projectId) {
            query = query.andWhere('t.project_id = :projectId', { projectId: filter.projectId });
        }
        if (filter?.startDate && filter?.endDate) {
            query = query.andWhere('t.create_date BETWEEN :start AND :end', {
                start: filter.startDate,
                end: filter.endDate,
            });
        }

        const tickets = await query.getRawMany();

        tickets.forEach((t) => {
            worksheet.addRow({
                ticket_no: t.ticket_no,
                project_name: t.project_name,
                category_name: t.category_name,
                status_name: t.status_name,
                reporter: t.reporter,
                supporter: t.supporter,
                create_date: t.create_date,
                due_date: t.due_date,
                lead_time: t.lead_time,
                rating: t.rating,
            });
        });

        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1F4E78' },
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader('Content-Disposition', 'attachment; filename="tickets.xlsx"');

        await workbook.xlsx.write(res);
        res.end();
    }
}
