import { ApiProperty } from '@nestjs/swagger';

export class GetSuccessDepositQueryDto {
  @ApiProperty({ required: false })
  coin: string;

  @ApiProperty({ required: false })
  limit: string;
}
