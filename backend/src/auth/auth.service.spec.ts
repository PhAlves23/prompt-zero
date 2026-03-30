import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const usersServiceMock = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    createUser: jest.fn(),
    updateRefreshTokenHash: jest.fn(),
    getProfile: jest.fn(),
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn((key: string, fallback: string) => fallback),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('register should throw conflict when email already exists', async () => {
    usersServiceMock.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'existing@test.com',
    });

    await expect(
      service.register({
        name: 'Teste',
        email: 'existing@test.com',
        password: 'Password@123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('login should throw unauthorized with wrong password', async () => {
    const hash = await bcrypt.hash('Password@123', 10);
    usersServiceMock.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'user@test.com',
      passwordHash: hash,
    });

    await expect(
      service.login({
        email: 'user@test.com',
        password: 'wrong-pass',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
