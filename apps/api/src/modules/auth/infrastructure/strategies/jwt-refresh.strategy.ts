import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import type { JwtPayload } from '@teras-lmbur/types';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const authHeader = req.get('Authorization');
    if (!authHeader) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const refreshToken = authHeader.replace('Bearer', '').trim();
    return {
      sub: payload.sub,
      email: payload.email,
      refreshToken,
    };
  }
}
