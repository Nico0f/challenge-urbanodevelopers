import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    if (!payload.sub && !payload.username) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      userId: payload.sub || payload.username,
      username: payload.username || payload.sub,
      email: payload.email,
      roles: payload['cognito:groups'] || payload.roles || [],
    };
  }
}

