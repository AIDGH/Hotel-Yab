import {
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SlugParamDto } from '../common/dto/slug-param.dto';
import { AccountLibraryService } from './account-library.service';

@Controller('account/library')
@ApiTags('Account Library')
@UseGuards(SessionAuthGuard)
export class AccountLibraryController {
  constructor(private readonly accountLibrary: AccountLibraryService) {}

  @Get()
  @ApiOperation({ summary: "Get the current user's likes and saved items" })
  findAll(@Req() request: AuthenticatedRequest) {
    return this.accountLibrary.findAll(request.user.id);
  }

  @Put('hotels/:slug/like')
  likeHotel(
    @Req() request: AuthenticatedRequest,
    @Param() { slug }: SlugParamDto,
  ) {
    return this.accountLibrary.setHotelLike(request.user.id, slug, true);
  }

  @Delete('hotels/:slug/like')
  unlikeHotel(
    @Req() request: AuthenticatedRequest,
    @Param() { slug }: SlugParamDto,
  ) {
    return this.accountLibrary.setHotelLike(request.user.id, slug, false);
  }

  @Put('hotels/:slug/save')
  saveHotel(
    @Req() request: AuthenticatedRequest,
    @Param() { slug }: SlugParamDto,
  ) {
    return this.accountLibrary.setHotelSaved(request.user.id, slug, true);
  }

  @Delete('hotels/:slug/save')
  unsaveHotel(
    @Req() request: AuthenticatedRequest,
    @Param() { slug }: SlugParamDto,
  ) {
    return this.accountLibrary.setHotelSaved(request.user.id, slug, false);
  }

  @Put('notable-people/:slug/like')
  likeNotablePerson(
    @Req() request: AuthenticatedRequest,
    @Param() { slug }: SlugParamDto,
  ) {
    return this.accountLibrary.setNotablePersonLike(
      request.user.id,
      slug,
      true,
    );
  }

  @Delete('notable-people/:slug/like')
  unlikeNotablePerson(
    @Req() request: AuthenticatedRequest,
    @Param() { slug }: SlugParamDto,
  ) {
    return this.accountLibrary.setNotablePersonLike(
      request.user.id,
      slug,
      false,
    );
  }

  @Put('notable-people/:slug/save')
  saveNotablePerson(
    @Req() request: AuthenticatedRequest,
    @Param() { slug }: SlugParamDto,
  ) {
    return this.accountLibrary.setNotablePersonSaved(
      request.user.id,
      slug,
      true,
    );
  }

  @Delete('notable-people/:slug/save')
  unsaveNotablePerson(
    @Req() request: AuthenticatedRequest,
    @Param() { slug }: SlugParamDto,
  ) {
    return this.accountLibrary.setNotablePersonSaved(
      request.user.id,
      slug,
      false,
    );
  }
}
