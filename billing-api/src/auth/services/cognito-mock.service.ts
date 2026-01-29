import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CognitoMockService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(username: string, password: string): Promise<{ accessToken: string }> {
    if (!username || !password) {
      throw new BadRequestException('Username and password are required');
    }

    const payload = {
      sub: username,
      username: username,
      email: `${username}@example.com`,
      'cognito:groups': ['USER'],
    };

    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  async validateToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

