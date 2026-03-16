import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
    BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
    TableSession,
    TableSessionDocument,
    TableSessionStatus,
} from '../schemas/table-session.schema';
import { DineInSessionTokenService } from '../services/dinein-session-token.service';

@Injectable()
export class DineInSessionGuard implements CanActivate {
    constructor(
        private readonly dineInTokenService: DineInSessionTokenService,
        @InjectModel(TableSession.name)
        private readonly tableSessionModel: Model<TableSessionDocument>,
    ) { }

    private extractToken(req: any): string {
        const raw =
            req.headers?.['x-dine-in-token'] ??
            req.headers?.['X-Dine-In-Token'] ??
            '';

        const token = Array.isArray(raw) ? raw[0] : String(raw || '').trim();

        if (!token) {
            throw new UnauthorizedException('Missing X-Dine-In-Token');
        }

        return token;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();

        const token = this.extractToken(req);
        const payload = await this.dineInTokenService.verify(token);

        if (!Types.ObjectId.isValid(payload.table_session_id)) {
            throw new BadRequestException('Invalid table_session_id in token');
        }

        const session = await this.tableSessionModel
            .findOne({
                _id: new Types.ObjectId(payload.table_session_id),
                merchant_id: new Types.ObjectId(payload.merchant_id),
                table_id: new Types.ObjectId(payload.table_id),
                status: TableSessionStatus.ACTIVE,
            })
            .lean();

        if (!session) {
            throw new UnauthorizedException('Dine-in session is not active');
        }

        req.dineIn = {
            token,
            merchantId: payload.merchant_id,
            tableId: payload.table_id,
            tableSessionId: payload.table_session_id,
            role: payload.role,
        };

        return true;
    }
}