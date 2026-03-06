import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { AuthService, JwtAuthGuard } from 'src/modules/auth';
import { UpdatePhoneDto } from '../dto/update-phone.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService
    ,
  ) { }
  @Put('phone')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updatePhone(@Req() req: any, @Body() dto: UpdatePhoneDto) {
    const userId = req.user.userId;
    const data = await this.authService.updateCustomerPhone(userId, dto.phone);
    return { success: true, data };
  }
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Param('page') page: string = '1', @Param('limit') limit: string = '10') {
    return this.usersService.findAll(parseInt(page), parseInt(limit));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: Partial<CreateUserDto>) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
