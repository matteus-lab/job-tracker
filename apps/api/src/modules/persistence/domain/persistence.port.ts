export const PERSISTENCE_PORT_TOKEN = 'PERSISTENCE_PORT_TOKEN';

/*
 * Port/Adapter + Dependency inversion
 *
 * This interface is a Port that the DB Service
 * must implement to run a transaction
 *
 * each service like AuthService will use this Port
 * to run a transaction without knowing
 * how the transaction is managed
 */
export interface PersistencePort {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
  readonly client;
}
