import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    // 中央シード処理に移行されたため、ここでは何も行いません (Centralized to AppModule seeder)
  }

  async register(username: string, passwordPlain: string) {
    if (!username || username.trim().length === 0) {
      throw new ConflictException('Tên đăng nhập không được để trống.');
    }
    if (!passwordPlain || passwordPlain.length < 6) {
      throw new ConflictException('Mật khẩu phải chứa ít nhất 6 ký tự.');
    }
    const existing = await this.userRepository.findOne({
      where: { username: username.trim() },
    });
    if (existing) {
      throw new ConflictException('Tên đăng nhập đã tồn tại.');
    }
    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const user = this.userRepository.create({
      username: username.trim(),
      passwordHash,
      role: UserRole.USER,
    });
    const savedUser = await this.userRepository.save(user);
    return {
      id: savedUser.id,
      username: savedUser.username,
      role: savedUser.role,
    };
  }

  async login(username: string, passwordPlain: string) {
    const user = await this.userRepository.findOne({
      where: { username: username.trim() },
    });
    if (!user) {
      throw new UnauthorizedException(
        'Tên đăng nhập hoặc mật khẩu không đúng.',
      );
    }
    const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException(
        'Tên đăng nhập hoặc mật khẩu không đúng.',
      );
    }
    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = await this.jwtService.signAsync(payload);
    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async findUserById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }
}
