import { KycStatut } from '@prisma/client';

/** The principal attached to each authenticated request (req.user). */
export interface AuthUser {
  id: string;
  username: string;
  phone: string;
  kyc: KycStatut;
}
