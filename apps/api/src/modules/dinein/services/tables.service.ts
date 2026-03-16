import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { MerchantsService } from 'src/modules/merchants/services/merchants.service';

import { CreateTableDto } from '../dtos/create-table.dto';
import { UpdateTableDto } from '../dtos/update-table.dto';
import { Table, TableDocument, TableStatus } from '../schemas/table.schema';
import {
    TableSession,
    TableSessionDocument,
    TableSessionStatus,
} from '../schemas/table-session.schema';
import { Merchant } from 'src/modules/merchants/schemas';

@Injectable()
export class TablesService {
    constructor(
        @InjectModel(Table.name)
        private readonly tableModel: Model<TableDocument>,
        @InjectModel(TableSession.name)
        private readonly tableSessionModel: Model<TableSessionDocument>,
        @InjectModel(Merchant.name) private readonly merchantModel: Model<Merchant>, // Gọi trực tiếp Model
        // private readonly merchantsService: MerchantsService,
    ) { }

    private getCustomerWebUrl() {
        return process.env.CUSTOMER_WEB_URL || 'http://localhost:3000';
    }

    // QR sẽ chứa link trung gian này
    private buildQrContent(tableId: string) {
        return `${this.getCustomerWebUrl()}/scan/table/${tableId}`;
    }

    // web/app có thể dùng thông tin resolve này để mở menu dine-in thật
    private buildMenuUrl(merchantId: string, tableId: string) {
        return `${this.getCustomerWebUrl()}/menu/${merchantId}?tableId=${tableId}&mode=dine_in`;
    }

    private async getMerchantByOwnerUserIdOrThrow(userId: string) {
        if (!Types.ObjectId.isValid(userId)) {
            throw new BadRequestException('Invalid userId');
        }

        const merchant = await this.merchantModel.findOne({
            owner_user_id: new Types.ObjectId(userId),
            deleted_at: null,
        });

        if (!merchant) {
            throw new BadRequestException('Merchant not found');
        }

        return merchant;
    }

    private async getOwnedTableOrThrow(userId: string, tableId: string) {
        const merchant = await this.getMerchantByOwnerUserIdOrThrow(userId);

        const table = await this.tableModel.findOne({
            _id: new Types.ObjectId(tableId),
            merchant_id: merchant._id,
            deleted_at: null,
        });

        if (!table) throw new NotFoundException('Table not found');

        return { merchant, table };
    }

    async createByMerchantUser(userId: string, dto: CreateTableDto) {
        const merchant = await this.getMerchantByOwnerUserIdOrThrow(userId);

        const tableNumber = (dto.table_number ?? '').trim();
        if (!tableNumber) {
            throw new BadRequestException('table_number is required');
        }

        const existed = await this.tableModel.findOne({
            merchant_id: merchant._id,
            table_number: tableNumber,
            deleted_at: null,
        });

        if (existed) {
            throw new BadRequestException('Table number already exists');
        }

        const created = new this.tableModel({
            merchant_id: merchant._id,
            table_number: tableNumber,
            name: dto.name?.trim() || null,
            capacity: Number(dto.capacity ?? 0),
            is_active: dto.is_active ?? true,
            status: TableStatus.AVAILABLE,
            current_session_id: null,
            deleted_at: null,
            qr_content: null,
        });

        await created.save();

        created.qr_content = this.buildQrContent(created._id.toString());
        await created.save();

        return created;
    }

    async listMine(userId: string) {
        const merchant = await this.getMerchantByOwnerUserIdOrThrow(userId);

        return this.tableModel
            .find({
                merchant_id: merchant._id,
                deleted_at: null,
            })
            .sort({ table_number: 1, created_at: -1 });
    }

    async getOneMine(userId: string, tableId: string) {
        const { table } = await this.getOwnedTableOrThrow(userId, tableId);
        return table;
    }

    async updateMine(userId: string, tableId: string, dto: UpdateTableDto) {
        const { merchant, table } = await this.getOwnedTableOrThrow(userId, tableId);

        if (dto.table_number !== undefined) {
            const tableNumber = dto.table_number.trim();
            if (!tableNumber) {
                throw new BadRequestException('table_number is invalid');
            }

            const existed = await this.tableModel.findOne({
                _id: { $ne: table._id },
                merchant_id: merchant._id,
                table_number: tableNumber,
                deleted_at: null,
            });

            if (existed) {
                throw new BadRequestException('Table number already exists');
            }

            table.table_number = tableNumber;
        }

        if (dto.name !== undefined) {
            table.name = dto.name?.trim() || null;
        }

        if (dto.capacity !== undefined) {
            table.capacity = Number(dto.capacity ?? 0);
        }

        if (dto.is_active !== undefined) {
            table.is_active = !!dto.is_active;
        }

        if (dto.status !== undefined) {
            table.status = dto.status;
        }

        // Vì QR dùng tableId nên đổi số bàn KHÔNG cần generate lại QR
        await table.save();
        return table;
    }

    async regenerateQr(userId: string, tableId: string) {
        const { table } = await this.getOwnedTableOrThrow(userId, tableId);

        table.qr_content = this.buildQrContent(table._id.toString());
        await table.save();

        return table;
    }

    async softDeleteMine(userId: string, tableId: string) {
        const { table } = await this.getOwnedTableOrThrow(userId, tableId);

        if (table.current_session_id) {
            const session = await this.tableSessionModel.findById(table.current_session_id);
            if (
                session &&
                (session.status === TableSessionStatus.ACTIVE ||
                    session.status === TableSessionStatus.CLOSING)
            ) {
                throw new BadRequestException('Table has active session, cannot delete');
            }
        }

        table.deleted_at = new Date();
        table.is_active = false;
        await table.save();

        return { success: true };
    }

    // API public để web/app resolve tableId -> merchant/menu
    async resolvePublicTable(tableId: string) {
        const table = await this.tableModel.findOne({
            _id: new Types.ObjectId(tableId),
            deleted_at: null,
            is_active: true,
        });

        if (!table) {
            throw new NotFoundException('Table not found');
        }

        return {
            table_id: table._id.toString(),
            table_number: table.table_number,
            name: table.name ?? null,
            merchant_id: table.merchant_id.toString(),
            status: table.status,
            is_active: table.is_active,
            qr_content: table.qr_content ?? null,
            menu_url: this.buildMenuUrl(table.merchant_id.toString(), table._id.toString()),
        };
    }
}