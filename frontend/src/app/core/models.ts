/* ───────────────────────────────────────────────────────────────
   MIANG — domain models (frontend view).
   Money is FCFA (XAF), always integers — no decimals, ever.
   ─────────────────────────────────────────────────────────────── */

/** Avatar palette keys — map to a {bg, fg} pair in the avatar component. */
export type Couleur = 'forest' | 'em' | 'gold' | 'coral';

export type KycStatut = 'aucun' | 'en_attente' | 'verifie' | 'rejete';

export type PieceType = 'cni' | 'passeport' | 'permis';

export interface Utilisateur {
  id: string;
  nom: string;
  username: string;
  phone: string;
  phoneVerifie: boolean;
  couleur: Couleur;
  avatarUrl?: string | null;
  kyc: KycStatut;
  stats: { sessions: number; victoires: number; gainsFcfa: number };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  utilisateur: Utilisateur;
}

export type SessionStatut = 'open' | 'locked' | 'drawn';

export interface Participant {
  userId: string;
  username: string;
  nom: string;
  couleur: Couleur;
  montant: number;
  moi: boolean;
  online: boolean;
}

export interface SessionMise {
  id: string;
  titre: string;
  miseMin: number;
  /** null = illimité. */
  maxParticipants: number | null;
  coverImage?: string | null;
  potTotal: number;
  joueurs: number;
  statut: SessionStatut;
  /** ISO timestamp of the draw — the next 20:00 local. */
  drawAt: string;
  createdParUsername: string;
  participants: Participant[];
  /** Total the current user has staked. > 0 ⇒ inscrit. */
  maMise: number;
  inscrit: boolean;
  complet: boolean;
  /** Set once drawn (history). */
  gagnantUsername?: string | null;
  gagnantNom?: string | null;
}

export interface DrawResult {
  sessionId: string;
  gagnantUsername: string;
  gagnantNom: string;
  montant: number;
  serverSeedHash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  tireLe: string;
}

export type TxType = 'depot' | 'retrait' | 'mise' | 'gain' | 'remboursement';

export interface Transaction {
  id: string;
  type: TxType;
  libelle: string;
  /** Signed amount in FCFA (credit > 0, debit < 0). */
  montant: number;
  date: string;
  operateur?: OperateurId;
}

export type OperateurId = 'airtel' | 'moov';

export interface Operateur {
  id: OperateurId;
  nom: string;
  couleur: string;
  numeroMasque?: string | null;
}

export type ConversationType = 'session' | 'prive';

export interface Conversation {
  id: string;
  type: ConversationType;
  titre: string;
  couleur: Couleur;
  dernierMessage: string;
  dernierLe: string;
  nonLus: number;
  sessionId?: string;
  autreUsername?: string;
  enLigne?: boolean;
  /** session conversation only — true once the session is drawn (chat fermé). */
  sessionTermine?: boolean;
}

export type MessageType = 'text' | 'system' | 'invite';

export interface Message {
  id: string;
  conversationId: string;
  /** null = système (« X a misé 5 000 F »). */
  auteurUsername: string | null;
  auteurId?: string;
  auteurNom?: string;
  auteurCouleur?: Couleur;
  corps: string;
  type: MessageType;
  le: string;
  /** epoch ms — used for ordering / pagination. */
  ts: number;
  moi: boolean;
  /** type === 'invite' */
  inviteSessionId?: string;
  inviteTitre?: string;
  inviteMiseMin?: number;
}

export interface Ami {
  id: string;
  nom: string;
  username: string;
  couleur: Couleur;
  enLigne: boolean;
}

export interface DemandeAmi {
  id: string;
  nom: string;
  username: string;
  couleur: Couleur;
}

/** Detailed profile shown in the participant bottom-sheet. */
export interface Profil {
  id: string;
  nom: string;
  username: string;
  couleur: Couleur;
  online: boolean;
  stats: { sessions: number; victoires: number; gainsFcfa: number; misesFcfa: number };
  estMoi: boolean;
  estAmi: boolean;
  demandeEnvoyee: boolean;
  bloque: boolean;
}

/** A paginated slice — drives infinite scroll. */
export interface Page<T> {
  items: T[];
  hasMore: boolean;
}

export interface SessionFiltre {
  recherche?: string;
  montantMin?: number | null;
  montantMax?: number | null;
  joueursMin?: number | null;
  joueursMax?: number | null;
}
