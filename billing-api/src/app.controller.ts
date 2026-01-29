import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import { CognitoMockService } from './auth/services/cognito-mock.service';
import { LoginDto } from './auth/dto/login.dto';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly cognitoMockService: CognitoMockService,
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('auth/login')
  @ApiOperation({ summary: 'Login with username and password' })
  @ApiResponse({ status: 201, description: 'Login successful', schema: { properties: { accessToken: { type: 'string' } } } })
  @ApiResponse({ status: 400, description: 'Bad request - username and password required' })
  async login(@Body() loginDto: LoginDto) {
    return this.cognitoMockService.login(loginDto.username, loginDto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user profile (protected endpoint)' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  getProfile(@CurrentUser() user: any) {
    return {
      message: 'This is a protected endpoint',
      user: user,
    };
  }
}

