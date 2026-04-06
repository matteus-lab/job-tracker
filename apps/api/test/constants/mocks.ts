import { Response } from 'express';
import { IHashingService } from 'src/core/hashing/hashing.service.interface';
import { ISessionRepository } from 'src/modules/session/session.repository.interface';
import { IUserRepository } from 'src/modules/user/user.repository.interface';

/**
 *  CORE
 */
export const MOCK_RES = {
  cookie: jest.fn(),
} as unknown as Response;

export const MOCK_CONFIG_SERVICE = {
  get: jest.fn((key: string, defaultValue: string) => defaultValue),
  getOrThrow: jest.fn(),
};

export const MOCK_JWT_SERVICE = {
  sign: jest.fn(),
  verify: jest.fn(),
};

export const MOCK_HASHING_SERVICE: jest.Mocked<IHashingService> = {
  hash: jest.fn(),
  generateFingerprint: jest.fn(),
  verify: jest.fn(),
};

/**
 *  MODULES
 */

export const MOCK_AUTH_SERVICE = {
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
};

export const MOCK_USER_SERVICE = {
  create: jest.fn(),
  getById: jest.fn(),
  getByEmailWithPassword: jest.fn(),
};

export const MOCK_USER_REPOSITORY: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEmailWithPassword: jest.fn(),
};

export const MOCK_SESSION_SERVICE = {
  create: jest.fn(),
  validateSession: jest.fn(),
  deleteByRefreshToken: jest.fn(),
};

export const MOCK_SESSION_REPOSITORY: jest.Mocked<ISessionRepository> = {
  create: jest.fn(),
  findByHashedRefreshToken: jest.fn(),
  deleteManyByHashedRefreshToken: jest.fn(),
  deleteAllExpired: jest.fn(),
};
