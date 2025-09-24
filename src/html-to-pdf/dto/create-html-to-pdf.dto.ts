import { IsString, IsOptional, IsObject } from 'class-validator';

export class HtmlToPdfDto {
  @IsString()
  reportNumber: string;

  @IsString()
  reportDate: string;

  @IsString()
  status: string;

  @IsString()
  reporter: string;

  @IsString()
  priority: string;

  @IsString()
  category: string;

  @IsString()
  project: string;

  @IsString()
  issueTitle: string;

  @IsString()
  issueDescription: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsString()
  assignee: string;

  @IsString()
  estimatedCloseDate: string;

  @IsString()
  deadline: string;

  @IsString()
  estimateTime: string;

  @IsString()
  leadTime: string;

  @IsString()
  changeRequest: string;

  @IsString()
  solutionDescription: string;

  @IsString()
  satisfactionRating: string;

  @IsOptional()
  @IsObject()
  additionalData?: any;
}