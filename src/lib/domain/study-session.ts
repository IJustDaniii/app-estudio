import { createHmac, timingSafeEqual } from "node:crypto";

export const MIN_STUDY_SESSION_MINUTES = 1;
export const MAX_STUDY_SESSION_MINUTES = 600;
export const STUDY_SESSION_CLOCK_GRACE_MS = 60_000;

const TOKEN_VERSION = 1;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StudyStartTokenPayload = {
  userId: string;
  requestId: string;
  startedAt: Date;
  plannedMinutes: number;
};

export type ValidatedStudySession = {
  startedAt: Date;
  endedAt: Date;
  plannedMinutes: number;
  actualMinutes: number;
};

export type StudySessionRequestData = Pick<ValidatedStudySession, "startedAt" | "plannedMinutes" | "actualMinutes"> & {
  subjectId: string | null;
  taskId: string | null;
};

export type StudySessionErrorCode =
  | "AUTH_SECRET_MISSING"
  | "INVALID_START_TOKEN"
  | "START_TOKEN_USER_MISMATCH"
  | "START_TOKEN_REQUEST_MISMATCH"
  | "START_TOKEN_PLAN_MISMATCH"
  | "STUDY_START_IN_FUTURE"
  | "STUDY_SESSION_TOO_SHORT"
  | "STUDY_SESSION_TOO_LONG"
  | "STUDY_MINUTES_EXCEED_ELAPSED"
  | "STUDY_MINUTES_EXCEED_PLAN";

export class StudySessionError extends Error {
  constructor(public readonly code: StudySessionErrorCode) {
    super(code);
    this.name = "StudySessionError";
  }
}

/** Compares a replay with the stored session, including all reward-affecting values. */
export function sameStudySessionRequest(existing: StudySessionRequestData, submitted: StudySessionRequestData) {
  return existing.startedAt.getTime() === submitted.startedAt.getTime()
    && existing.plannedMinutes === submitted.plannedMinutes
    && existing.actualMinutes === submitted.actualMinutes
    && existing.subjectId === submitted.subjectId
    && existing.taskId === submitted.taskId;
}

function requireSecret(secret: string) {
  if (!secret) throw new StudySessionError("AUTH_SECRET_MISSING");
  return secret;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", requireSecret(secret)).update(payload).digest("base64url");
}

function validDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function validPlan(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= MIN_STUDY_SESSION_MINUTES && value <= MAX_STUDY_SESSION_MINUTES;
}

/** Creates a server-signed token that fixes the user, request and plan for one session. */
export function createStudyStartToken(payload: StudyStartTokenPayload, secret: string) {
  if (!payload.userId || !UUID_PATTERN.test(payload.requestId) || !validDate(payload.startedAt) || !validPlan(payload.plannedMinutes)) {
    throw new StudySessionError("INVALID_START_TOKEN");
  }
  const encodedPayload = encode(JSON.stringify({
    version: TOKEN_VERSION,
    userId: payload.userId,
    requestId: payload.requestId,
    startedAt: payload.startedAt.toISOString(),
    plannedMinutes: payload.plannedMinutes,
  }));
  return `${encodedPayload}.${signature(encodedPayload, secret)}`;
}

/** Verifies that a submitted token belongs to the authenticated user and same request. */
export function verifyStudyStartToken(token: string, secret: string, expected: { userId: string; requestId: string; plannedMinutes: number }) {
  try {
    const [encodedPayload, providedSignature, extra] = token.split(".");
    if (!encodedPayload || !providedSignature || extra) throw new StudySessionError("INVALID_START_TOKEN");
    const expectedSignature = signature(encodedPayload, secret);
    const providedBytes = Buffer.from(providedSignature, "base64url");
    const expectedBytes = Buffer.from(expectedSignature, "base64url");
    if (providedBytes.length !== expectedBytes.length || !timingSafeEqual(providedBytes, expectedBytes)) throw new StudySessionError("INVALID_START_TOKEN");

    const value = JSON.parse(decode(encodedPayload)) as Record<string, unknown>;
    const startedAt = new Date(typeof value.startedAt === "string" ? value.startedAt : "");
    if (value.version !== TOKEN_VERSION || typeof value.userId !== "string" || typeof value.requestId !== "string" || !UUID_PATTERN.test(value.requestId) || !validDate(startedAt) || !validPlan(value.plannedMinutes)) {
      throw new StudySessionError("INVALID_START_TOKEN");
    }
    if (value.userId !== expected.userId) throw new StudySessionError("START_TOKEN_USER_MISMATCH");
    if (value.requestId !== expected.requestId) throw new StudySessionError("START_TOKEN_REQUEST_MISMATCH");
    if (value.plannedMinutes !== expected.plannedMinutes) throw new StudySessionError("START_TOKEN_PLAN_MISMATCH");
    return { userId: value.userId, requestId: value.requestId, startedAt, plannedMinutes: value.plannedMinutes };
  } catch (error) {
    if (error instanceof StudySessionError) throw error;
    throw new StudySessionError("INVALID_START_TOKEN");
  }
}

/** Validates client minutes against the server clock; the client never supplies the end date. */
export function validateServerStudySession(input: { startedAt: Date; plannedMinutes: number; actualMinutes: number }, now: Date): ValidatedStudySession {
  if (!validDate(input.startedAt) || !validDate(now) || input.startedAt.getTime() > now.getTime()) throw new StudySessionError("STUDY_START_IN_FUTURE");
  if (!validPlan(input.plannedMinutes)) throw new StudySessionError("INVALID_START_TOKEN");
  if (!Number.isSafeInteger(input.actualMinutes) || input.actualMinutes < MIN_STUDY_SESSION_MINUTES) throw new StudySessionError("STUDY_SESSION_TOO_SHORT");
  if (input.actualMinutes > input.plannedMinutes) throw new StudySessionError("STUDY_MINUTES_EXCEED_PLAN");

  const elapsedMs = now.getTime() - input.startedAt.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  if (elapsedMinutes < MIN_STUDY_SESSION_MINUTES) throw new StudySessionError("STUDY_SESSION_TOO_SHORT");
  if (elapsedMs > input.plannedMinutes * 60_000 + STUDY_SESSION_CLOCK_GRACE_MS) throw new StudySessionError("STUDY_SESSION_TOO_LONG");
  if (input.actualMinutes > elapsedMinutes) throw new StudySessionError("STUDY_MINUTES_EXCEED_ELAPSED");

  return {
    startedAt: input.startedAt,
    endedAt: now,
    plannedMinutes: input.plannedMinutes,
    actualMinutes: input.actualMinutes,
  };
}
