import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class UpdateDriverAvailabilityDto {
    @Transform(({ value }) => {
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    acceptFoodOrders: boolean;
}