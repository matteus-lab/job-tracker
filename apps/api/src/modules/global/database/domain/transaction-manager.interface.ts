export const ITRANSACTION_MANAGER_TOKEN = 'ITRANSACTION_MANAGER_TOKEN';

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
export interface ITransactionManager {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}
