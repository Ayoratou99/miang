/* ───────────────────────────────────────────────────────────────
   MIANG — in-memory seed data for the mock layer.
   Fictional data. The persona is "Kevin Mba / @kevin_mba".
   Draw happens at the next 20:00 (not midnight).
   ─────────────────────────────────────────────────────────────── */
import {
  Ami,
  Conversation,
  Couleur,
  DemandeAmi,
  Message,
  Operateur,
  Participant,
  SessionMise,
  Transaction,
  Utilisateur,
} from '../models';

export const MOI: Utilisateur = {
  id: 'me',
  nom: 'Kevin Mba',
  username: 'kevin_mba',
  phone: '+24106000041',
  phoneVerifie: true,
  couleur: 'forest',
  avatarUrl: null,
  kyc: 'en_attente',
  stats: { sessions: 23, victoires: 3, gainsFcfa: 310_000 },
};

export const SOLDE_INITIAL = 12_500;

const CONNECTEURS = new Set(['de', 'des', 'du', 'la', 'le', 'les', 'd', 'et']);

export function initiales(nom: string): string {
  const mots = nom
    .replace(/[.@]/g, ' ')
    .split(/\s+/)
    .filter((m) => m && !CONNECTEURS.has(m.toLowerCase()));
  const lettres = (mots.length ? mots : [nom]).map((m) => m[0]?.toUpperCase() ?? '');
  return (lettres[0] ?? '') + (lettres[1] ?? '');
}

const PALETTE: Couleur[] = ['forest', 'em', 'gold', 'coral'];
export function couleurDepuis(seed: string): Couleur {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length]!;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic seeded RNG so generated data is stable across reloads. */
function rng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** The next 20:00 local (today if still ahead, else tomorrow). */
export function prochainTirage(): Date {
  const d = new Date();
  const t = new Date();
  t.setHours(20, 0, 0, 0);
  if (t.getTime() <= d.getTime()) {
    t.setDate(t.getDate() + 1);
  }
  return t;
}
export function prochainTirageIso(): string {
  return prochainTirage().toISOString();
}

export const OPERATEURS: Operateur[] = [
  { id: 'airtel', nom: 'Airtel Money', couleur: '#E40000', numeroMasque: '+241 ·· ·· 41' },
  { id: 'moov', nom: 'Moov Money', couleur: '#F7941E', numeroMasque: null },
];

// ── People registry (drives profiles, mentions, presence) ──────────
interface Personne {
  username: string;
  nom: string;
  couleur: Couleur;
}
const GENS: [string, string][] = [
  ['marc241', 'Marc Obame'],
  ['aicha_og', 'Aïcha Onanga'],
  ['steve_pk', 'Steve Pk'],
  ['laure_m', 'Laure Mengue'],
  ['bob_ka', 'Bob Ka'],
  ['nina_p', 'Nina Pemba'],
  ['yann_g', 'Yann Ndong'],
  ['didi05', 'Didi'],
  ['franck_o', 'Franck Oyane'],
  ['sandra_l', 'Sandra Lendoye'],
  ['eric_mb', 'Éric Mba'],
  ['patou', 'Patou'],
  ['jojo241', 'Jojo'],
  ['mireille', 'Mireille Ada'],
  ['ange_n', 'Ange Nzé'],
  ['serge_o', 'Serge Obiang'],
  ['fatou', 'Fatou'],
  ['rodrigue', 'Rodrigue B.'],
  ['chris_g', 'Chris G.'],
  ['vanessa', 'Vanessa M.'],
];

export const PERSONNES: Personne[] = GENS.map(([username, nom]) => ({
  username,
  nom,
  couleur: couleurDepuis(username),
}));

export function personneDe(username: string): Personne {
  if (username === MOI.username) return { username: MOI.username, nom: MOI.nom, couleur: MOI.couleur };
  return (
    PERSONNES.find((p) => p.username === username) ?? {
      username,
      nom: username,
      couleur: couleurDepuis(username),
    }
  );
}

/** Deterministic per-user stats for the profile sheet. */
export function statsDe(username: string): { sessions: number; victoires: number; gainsFcfa: number; misesFcfa: number } {
  if (username === MOI.username) {
    return { ...MOI.stats, misesFcfa: 142_000 };
  }
  const h = hash(username);
  const sessions = 4 + (h % 40);
  const victoires = h % 7;
  return {
    sessions,
    victoires,
    gainsFcfa: victoires * (25_000 + (h % 9) * 10_000),
    misesFcfa: sessions * (1_000 + (h % 8) * 1_000),
  };
}

/** Roughly two-thirds of people are "online" (deterministic). */
export function onlineSeed(): Set<string> {
  const set = new Set<string>([MOI.username]);
  PERSONNES.forEach((p) => {
    if (hash(p.username) % 3 !== 0) set.add(p.username);
  });
  return set;
}

// ── Sessions ───────────────────────────────────────────────────────
const TITRES = [
  'Soirée des potos', 'Quartier Louis', 'Les boss du 241', 'Cagnotte PK9',
  'Team Akébé', 'Vendredi chaud', 'Les millionnaires', 'Oloumi crew',
  'Nzeng-Ayong', 'Sortie plage', 'Le grand pari', 'Awendjé night',
  'Glass City', 'Les fidèles', 'Montagne Sainte', 'Charbonnages',
  'La famille', 'Cocotiers', 'Sablière squad', 'Lalala',
  'Batterie IV', 'Owendo express', 'Les anciens', 'Toujours là',
];
const MISES = [500, 1_000, 2_000, 5_000, 10_000, 25_000];
const COVERS = ['🎉', '🔥', '💰', '🏆', '🌴', '⚡', '🎲', '👑', null, null, null, null];

function buildParticipants(rand: () => number, miseMin: number, withMe: boolean): Participant[] {
  const count = 3 + Math.floor(rand() * 9);
  const pool = [...PERSONNES].sort(() => rand() - 0.5).slice(0, count);
  const parts: Participant[] = pool.map((p) => ({
    userId: p.username,
    username: p.username,
    nom: p.nom,
    couleur: p.couleur,
    montant: miseMin * (1 + Math.floor(rand() * 5)),
    moi: false,
    online: false,
  }));
  if (withMe) {
    parts.unshift({
      userId: MOI.username,
      username: MOI.username,
      nom: MOI.nom,
      couleur: MOI.couleur,
      montant: miseMin * (1 + Math.floor(rand() * 3)),
      moi: true,
      online: true,
    });
  }
  return parts;
}

export function genOpenSessions(count = 40): SessionMise[] {
  const drawAt = prochainTirageIso();
  const out: SessionMise[] = [];
  for (let i = 0; i < count; i++) {
    const rand = rng(i + 7);
    const miseMin = MISES[Math.floor(rand() * MISES.length)]!;
    const withMe = i < 6 && i % 2 === 0; // I'm registered in a few
    const participants = buildParticipants(rand, miseMin, withMe);
    const potTotal = participants.reduce((n, p) => n + p.montant, 0);
    const maxParticipants = rand() < 0.45 ? null : participants.length + 5 + Math.floor(rand() * 40);
    const maMise = participants.find((p) => p.moi)?.montant ?? 0;
    out.push({
      id: `s${i + 1}`,
      titre: TITRES[i % TITRES.length] + (i >= TITRES.length ? ` ${Math.floor(i / TITRES.length) + 1}` : ''),
      miseMin,
      maxParticipants,
      coverImage: COVERS[Math.floor(rand() * COVERS.length)] ?? null,
      potTotal,
      joueurs: participants.length,
      statut: 'open',
      drawAt,
      createdParUsername: participants[withMe ? 1 : 0]?.username ?? 'marc241',
      participants,
      maMise,
      inscrit: maMise > 0,
      complet: maxParticipants !== null && participants.length >= maxParticipants,
    });
  }
  return out;
}

export function genHistory(count = 14): SessionMise[] {
  const out: SessionMise[] = [];
  for (let i = 0; i < count; i++) {
    const rand = rng(1000 + i);
    const miseMin = MISES[Math.floor(rand() * MISES.length)]!;
    const iWasIn = i % 2 === 0; // half include me
    const iWon = i % 6 === 0;
    const participants = buildParticipants(rand, miseMin, iWasIn);
    const potTotal = participants.reduce((n, p) => n + p.montant, 0);
    const gagnant = iWon
      ? participants.find((p) => p.moi)!
      : participants[Math.floor(rand() * participants.length)]!;
    const daysAgo = i + 1;
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(20, 0, 0, 0);
    out.push({
      id: `h${i + 1}`,
      titre: TITRES[(i + 5) % TITRES.length] + ' (passée)',
      miseMin,
      maxParticipants: null,
      coverImage: COVERS[Math.floor(rand() * COVERS.length)] ?? null,
      potTotal,
      joueurs: participants.length,
      statut: 'drawn',
      drawAt: d.toISOString(),
      createdParUsername: participants[0]?.username ?? 'marc241',
      participants,
      maMise: participants.find((p) => p.moi)?.montant ?? 0,
      inscrit: iWasIn,
      complet: true,
      gagnantUsername: gagnant.username,
      gagnantNom: gagnant.nom,
    });
  }
  return out;
}

export function seedTransactions(): Transaction[] {
  const now = Date.now();
  const h = 3_600_000;
  return [
    { id: 't1', type: 'gain', libelle: 'Gain — Quartier Louis', montant: 240_000, date: new Date(now - 24 * h).toISOString() },
    { id: 't2', type: 'retrait', libelle: 'Retrait — Airtel Money', montant: -50_000, date: new Date(now - 33 * h).toISOString(), operateur: 'airtel' },
    { id: 't3', type: 'mise', libelle: 'Mise — Soirée des potos', montant: -2_000, date: new Date(now - 50 * h).toISOString() },
    { id: 't4', type: 'depot', libelle: 'Dépôt — Moov Money', montant: 5_000, date: new Date(now - 54 * h).toISOString(), operateur: 'moov' },
  ];
}

// ── Conversations + messages ────────────────────────────────────────
const PHRASES = [
  'Qui rafle ce soir ?', 'Moi je tente, bon feeling', 'On est combien déjà ?',
  'Je rentre, mise 2k', 'Trop tard pour vous 😂', 'On relance demain ?',
  'Le sort est avec moi', 'Allez les gars', 'Ça chauffe ce soir',
  'Bonne chance à tous', 'Je sens que c’est mon jour', 'Faut miser gros',
  '241 représente', 'Qui est chaud ?', 'Minuit… euh 20h ça approche',
];

export function genConversations(sessions: SessionMise[], history: SessionMise[] = []): Conversation[] {
  const convs: Conversation[] = [];
  // A session conversation for the sessions I'm registered in + a few popular ones.
  const sessionConvs = sessions.filter((s) => s.inscrit).slice(0, 6);
  const extra = sessions.filter((s) => !s.inscrit).slice(0, 8);
  [...sessionConvs, ...extra].forEach((s, i) => {
    convs.push({
      id: `c-${s.id}`,
      type: 'session',
      titre: s.titre,
      couleur: couleurDepuis(s.id),
      dernierMessage: `${personneDe(s.participants[0]!.username).nom} : ${PHRASES[i % PHRASES.length]}`,
      dernierLe: `2${i % 4}:0${i % 6}`,
      nonLus: i < 3 ? (i + 1) % 4 : 0,
      sessionId: s.id,
      sessionTermine: false,
    });
  });
  // A few terminated (drawn) session conversations → "terminée" tag + locked chat.
  history.filter((s) => s.inscrit).slice(0, 4).forEach((s) => {
    convs.push({
      id: `c-${s.id}`,
      type: 'session',
      titre: s.titre,
      couleur: couleurDepuis(s.id),
      dernierMessage: `🏆 @${s.gagnantUsername} a raflé ${s.potTotal.toLocaleString('fr-FR')} F`,
      dernierLe: 'hier',
      nonLus: 0,
      sessionId: s.id,
      sessionTermine: true,
    });
  });
  // Private conversations.
  PERSONNES.slice(0, 12).forEach((p, i) => {
    convs.push({
      id: `c-dm-${p.username}`,
      type: 'prive',
      titre: p.nom,
      couleur: p.couleur,
      autreUsername: p.username,
      dernierMessage: PHRASES[(i + 3) % PHRASES.length]!,
      dernierLe: i < 2 ? 'hier' : `1${i % 9}:${(i * 7) % 60 < 10 ? '0' : ''}${(i * 7) % 60}`,
      nonLus: i === 0 ? 2 : 0,
    });
  });
  return convs;
}

/** Long, ordered history per conversation so scroll-up pagination is real. */
export function genMessages(convs: Conversation[]): Record<string, Message[]> {
  const map: Record<string, Message[]> = {};
  for (const c of convs) {
    const rand = rng(hash(c.id));
    const total = 30 + Math.floor(rand() * 40);
    const msgs: Message[] = [];
    const speakers =
      c.type === 'session'
        ? [...PERSONNES].sort(() => rand() - 0.5).slice(0, 5).map((p) => p.username)
        : [c.autreUsername ?? 'marc241'];
    const base = Date.now() - total * 5 * 60_000;
    for (let i = 0; i < total; i++) {
      const ts = base + i * 5 * 60_000 + Math.floor(rand() * 60_000);
      const mine = rand() < 0.4;
      const system = c.type === 'session' && rand() < 0.15;
      const who = mine ? MOI.username : speakers[Math.floor(rand() * speakers.length)]!;
      const person = personneDe(who);
      if (system) {
        msgs.push({
          id: `${c.id}-m${i}`,
          conversationId: c.id,
          auteurUsername: null,
          corps: `${person.nom} a misé ${(1000 * (1 + Math.floor(rand() * 9))).toLocaleString('fr-FR')} F`,
          type: 'system',
          le: hhmm(ts),
          ts,
          moi: false,
        });
      } else {
        msgs.push({
          id: `${c.id}-m${i}`,
          conversationId: c.id,
          auteurUsername: mine ? MOI.username : who,
          auteurId: mine ? MOI.username : who,
          auteurNom: mine ? MOI.nom : person.nom,
          auteurCouleur: mine ? MOI.couleur : person.couleur,
          corps: PHRASES[Math.floor(rand() * PHRASES.length)]!,
          type: 'text',
          le: hhmm(ts),
          ts,
          moi: mine,
        });
      }
    }
    map[c.id] = msgs;
  }
  return map;
}

function hhmm(ts: number): string {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function seedAmis(): Ami[] {
  return PERSONNES.slice(0, 5).map((p, i) => ({
    id: `f${i}`,
    nom: p.nom,
    username: p.username,
    couleur: p.couleur,
    enLigne: hash(p.username) % 3 !== 0,
  }));
}

export function seedDemandes(): DemandeAmi[] {
  return PERSONNES.slice(12, 15).map((p, i) => ({
    id: `r${i}`,
    nom: p.nom,
    username: p.username,
    couleur: p.couleur,
  }));
}

export const POOL_PSEUDOS = PERSONNES.map((p) => p.username).slice(0, 10);
