import { IsNumber, Max, Min } from 'class-validator';

export class UpdateCommissionRulesDto {
    @IsNumber()
    @Min(0)
    @Max(1)
    merchant_commission_rate: number;

    @IsNumber()
    @Min(0)
    @Max(1)
    driver_commission_rate: number;

    @IsNumber()
    @Min(0)
    platform_fee_fixed: number;
}