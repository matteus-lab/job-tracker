/**
 * Data for DB insertion.
 * @important The 'password' field MUST be hashed before reaching this layer.
 */
export type CreateUserPersistence = {
  email: string;
  password: string;
  lastname: string | null;
  firstname: string | null;
};
