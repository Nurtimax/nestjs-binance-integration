import { ApiProperty } from '@nestjs/swagger';

export class getUsdtReceivedDto {
  @ApiProperty({ required: false })
  days: string;
}
