import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto } from '../dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel('User') private userModel: Model<UserDocument>) { }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    console.log('[UsersService.create] Creating user with data:', JSON.stringify(createUserDto, null, 2));
    try {
      // Try using model.create() instead of new Model().save()
      const savedUser = await this.userModel.create(createUserDto);
      console.log('[UsersService.create] User created via create() - _id:', savedUser._id, 'email:', savedUser.email);
      return savedUser;
    } catch (error) {
      console.error('[UsersService.create] Error creating user:', error.message);
      throw error;
    }
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ data: UserDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const data = await this.userModel.find().skip(skip).limit(limit).exec();
    const total = await this.userModel.countDocuments().exec();
    return { data, total };
  }

  async findOne(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    console.log('[UsersService.findById] Looking for id:', id);
    const result = await this.userModel.findById(id).exec();
    console.log('[UsersService.findById] Result:', result ? `found (email: ${result.email})` : 'not found');
    return result;
  }

  async update(id: string, updateUserDto: Partial<User>): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).exec();
  }

  async updateRegistrationProgress(
    id: string,
    step: number,
    data: Record<string, any>,
  ): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(
      id,
      {
        registration_data: data,
      },
      { new: true },
    ).exec();
  }



  async clearRegistrationProgress(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, {
      $unset: {
        registration_data: '',
      },
    }).exec();
  }

  async remove(id: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }
}
