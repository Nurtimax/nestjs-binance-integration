import { ApiProperty } from '@nestjs/swagger';

export class FundingHistoryQueryDto {
  @ApiProperty({ required: false })
  startTime?: number;

  @ApiProperty({ required: false })
  endTime?: number;

  @ApiProperty({ type: 'number' })
  page: number;

  @ApiProperty({ type: 'number' })
  size: number;
}
