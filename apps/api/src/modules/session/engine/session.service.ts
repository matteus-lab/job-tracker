import ms from 'ms';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import {
  HASHING_PORT_TOKEN,
  type HashingPort,
} from 'src/modules/hashing/domain/hashing.port';
import { SessionEntity } from '../domain/entities/session.entity';
import {
  SESSION_REPOSITORY_PORT_TOKEN,
  type SessionRepositoryPort,
} from '../domain/session.repository.port';
import { CreateSessionCommand } from './commands/createSession.command';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(HASHING_PORT_TOKEN)
    private readonly hashingAdapter: HashingPort,
    @Inject(SESSION_REPOSITORY_PORT_TOKEN)
    private readonly sessionRepositoryAdapter: SessionRepositoryPort,
  ) {}

  async create(command: CreateSessionCommand): Promise<{
    sessionEntity: SessionEntity;
    refreshToken: string;
  }> {
    const refreshToken = crypto.randomUUID();
    const hashedRefreshToken =
      await this.hashingAdapter.generateFingerprint(refreshToken);

    const durationStr = this.configService.get<ms.StringValue>(
      'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
      '1w',
    );

    const expiresAt = new Date(Date.now() + ms(durationStr));

    const sessionEntity = await this.sessionRepositoryAdapter.create({
      hashedRefreshToken,
      expiresAt,
      userId: command.userId,
      userAgent: command.userAgent,
      ipAddress: command.ipAddress,
    });

    return {
      sessionEntity,
      refreshToken,
    };
  }

  async validateSession(
    rawRefreshToken: string,
  ): Promise<SessionEntity | null> {
    const hashedRefreshToken =
      await this.hashingAdapter.generateFingerprint(rawRefreshToken);

    const session =
      await this.sessionRepositoryAdapter.findByHashedRefreshToken(
        hashedRefreshToken,
      );

    if (!session) return null;

    const isExpired = session.expiresAt.getTime() < Date.now();
    if (isExpired) {
      await this.sessionRepositoryAdapter.deleteManyByHashedRefreshToken(
        hashedRefreshToken,
      );
      return null;
    }

    return session;
  }

  async deleteByRefreshToken(refreshToken: string): Promise<void> {
    const hashedRefreshToken =
      await this.hashingAdapter.generateFingerprint(refreshToken);

    await this.sessionRepositoryAdapter.deleteManyByHashedRefreshToken(
      hashedRefreshToken,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expiredSessionsCleanup() {
    try {
      const deletedCount =
        await this.sessionRepositoryAdapter.deleteAllExpired();

      this.logger.log(
        `Cleanup successful. Removed ${deletedCount} expired sessions.`,
        {
          task: this.expiredSessionsCleanup.name,
          count: deletedCount,
        },
      );
    } catch (error) {
      this.logger.error(
        'Failed to cleanup expired sessions.',
        error instanceof Error ? error.stack : undefined,
        {
          task: this.expiredSessionsCleanup.name,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }
}
