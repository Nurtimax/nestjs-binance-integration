import { ApiProperty } from '@nestjs/swagger';

export class DepositsQuery {
  @ApiProperty({ required: false })
  coin: string;

  @ApiProperty({ required: false })
  limit: string;

  @ApiProperty({ required: false })
  status: string;

  @ApiProperty({ required: false })
  days: string;
}
