import { ApiProperty } from '@nestjs/swagger';

export class WithdrawAnotherUserDto {
  @ApiProperty()
  coin: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  network: string;
}
