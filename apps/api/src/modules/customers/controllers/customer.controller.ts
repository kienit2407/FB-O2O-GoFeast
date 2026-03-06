import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomerProfilesService } from '../services/customer-profile.service';
import { UpdateCurrentLocationDto } from '../dtos/update-current-location.dto';
import { CreateSavedAddressDto, UpdateSavedAddressDto } from '../dtos/customer-addres.dto';

@Controller('customers/me')
@UseGuards(AuthGuard('jwt')) // TODO: đổi đúng guard customer của bạn
export class CustomerMeController {
    constructor(private readonly profiles: CustomerProfilesService) { }
    private getUserId(req: any) {
        const userId = req.user?.sub ?? req.user?.id;
        if (!userId) throw new BadRequestException('Missing user id in token');
        return userId.toString();
    }
    @Patch('/location')
    updateMyLocation(@Req() req: Request, @Body() dto: UpdateCurrentLocationDto) {
        const userId = this.getUserId(req);
        if (!userId) throw new BadRequestException('Missing user id in token');
        return this.profiles.updateCurrentLocation(userId.toString(), dto);
    }
    @Post('/addresses/:id/use')
    useSaved(@Req() req: Request, @Param('id') id: string) {
        const userId = this.getUserId(req);
        if (!userId) throw new BadRequestException('Missing user id in token');
        return this.profiles.useSavedAddressAsCurrent(userId.toString(), id);
    }
    @Get('/addresses')
    listAddresses(@Req() req: any) {
        return this.profiles.listSavedAddresses(this.getUserId(req));
    }

    @Post('/addresses')
    createAddress(@Req() req: any, @Body() dto: CreateSavedAddressDto) {
        return this.profiles.createSavedAddress(this.getUserId(req), dto);
    }

    @Patch('/addresses/:id')
    updateAddress(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateSavedAddressDto) {
        return this.profiles.updateSavedAddress(this.getUserId(req), id, dto);
    }

    @Delete('/addresses/:id')
    deleteAddress(@Req() req: any, @Param('id') id: string) {
        return this.profiles.deleteSavedAddress(this.getUserId(req), id);
    }
}
