import { Controller, Get, Query } from '@nestjs/common';
import { SearchListQueryDto, SearchOverviewQueryDto } from '../dtos/search-query.dto';
import { SearchService } from '../services/search.service';



@Controller('search')
export class SearchPublicController {
    constructor(private readonly searchService: SearchService) { }

    @Get('overview')
    overview(@Query() query: SearchOverviewQueryDto) {
        return this.searchService.searchOverview(query);
    }

    @Get('merchants')
    merchants(@Query() query: SearchListQueryDto) {
        return this.searchService.searchMerchants(query);
    }

    @Get('products')
    products(@Query() query: SearchListQueryDto) {
        return this.searchService.searchProducts(query);
    }
}