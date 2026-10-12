export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  isSuperAdmin: boolean;
}

export const SUPER_ADMIN_ROLE = "SUPER_ADMIN";
