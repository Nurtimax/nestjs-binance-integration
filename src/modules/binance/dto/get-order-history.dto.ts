import { ApiProperty } from '@nestjs/swagger';

export class GetOrderHistoryQueryDto {
  @ApiProperty({ required: false })
  symbol?: string; // Например: 'BTCUSDT'

  @ApiProperty({ required: false })
  orderId?: number; // ID конкретного ордера

  @ApiProperty({ required: false })
  startTime?: number;

  @ApiProperty({ required: false })
  endTime?: number;

  @ApiProperty({ required: false })
  limit?: number; // Max 1000

  @ApiProperty({ required: false })
  recvWindow?: number;
}
