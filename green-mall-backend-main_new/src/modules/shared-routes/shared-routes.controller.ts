import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SharedRoutesService } from './shared-routes.service';
import { CreateSharedRouteBodyDto } from './dto/create-shared-route-body.dto';

class CreateSharedRouteResponse {
  token!: string;
  expiresAt!: string;
}

@ApiTags('public/shared-routes')
@Controller('public/shared-routes')
export class SharedRoutesController {
  constructor(private readonly sharedRoutesService: SharedRoutesService) {}

  @Post()
  @ApiCreatedResponse({ type: CreateSharedRouteResponse })
  create(@Body() body: CreateSharedRouteBodyDto) {
    if (body.payload === undefined || body.payload === null) {
      throw new Error('payload is required');
    }
    return this.sharedRoutesService.create(body.payload, body.ttlMinutes);
  }

  @Get(':token')
  @ApiOkResponse()
  getByToken(@Param('token') token: string) {
    return this.sharedRoutesService.getByToken(token);
  }
}
