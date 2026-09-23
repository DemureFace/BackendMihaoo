import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from 'common/common';
import { UsersService } from '../users/users.service';

type UserWithRoles = {
  id: string;
  email: string;
  password: string;
  roles: { name: string }[];
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.usersService.create(email, hashed);
    return this.signToken(user);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.signToken(user);
  }

  private signToken(user: UserWithRoles) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name),
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, roles: payload.roles },
    };
  }
}
