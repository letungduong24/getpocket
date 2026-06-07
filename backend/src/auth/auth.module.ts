import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from './user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      global: true, // Making JwtModule global so we don't have to import it in every module that needs guards
      secret:
        process.env.JWT_SECRET || 'super_secret_pokemon_champions_jwt_key_2026',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRY || '24h') as any,
      },
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
