import { ApiProperty } from '@nestjs/swagger';

export class WithdrawFeeDto {
  @ApiProperty()
  coin: string;

  @ApiProperty()
  network: string;
}
