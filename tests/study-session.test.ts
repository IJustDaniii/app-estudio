import { describe, expect, it } from "vitest";
import {
  createStudyStartToken,
  StudySessionError,
  validateServerStudySession,
  verifyStudyStartToken,
} from "@/lib/domain/study-session";

const secret = "test-secret-that-is-not-used-in-production";
const userId = "user-1";
const requestId = "11111111-1111-4111-8111-111111111111";
const startedAt = new Date("2026-09-13T10:00:00.000Z");

describe("sesiones de estudio verificadas por servidor", () => {
  it("firma y verifica el usuario, la petición y el plan", () => {
    const token = createStudyStartToken({ userId, requestId, startedAt, plannedMinutes: 25 }, secret);

    expect(verifyStudyStartToken(token, secret, { userId, requestId, plannedMinutes: 25 })).toEqual({ userId, requestId, startedAt, plannedMinutes: 25 });
  });

  it("rechaza un token manipulado", () => {
    const token = createStudyStartToken({ userId, requestId, startedAt, plannedMinutes: 25 }, secret);

    expect(() => verifyStudyStartToken(`${token}x`, secret, { userId, requestId, plannedMinutes: 25 })).toThrowError(new StudySessionError("INVALID_START_TOKEN"));
  });

  it("rechaza un token usado por otro usuario o con otro plan", () => {
    const token = createStudyStartToken({ userId, requestId, startedAt, plannedMinutes: 25 }, secret);

    expect(() => verifyStudyStartToken(token, secret, { userId: "other-user", requestId, plannedMinutes: 25 })).toThrowError(new StudySessionError("START_TOKEN_USER_MISMATCH"));
    expect(() => verifyStudyStartToken(token, secret, { userId, requestId, plannedMinutes: 30 })).toThrowError(new StudySessionError("START_TOKEN_PLAN_MISMATCH"));
  });

  it("rechaza una fecha de inicio futura", () => {
    expect(() => validateServerStudySession({ startedAt: new Date("2026-09-13T11:00:00.000Z"), plannedMinutes: 25, actualMinutes: 1 }, new Date("2026-09-13T10:00:00.000Z"))).toThrowError(new StudySessionError("STUDY_START_IN_FUTURE"));
  });

  it("rechaza minutos superiores al tiempo que el servidor puede demostrar", () => {
    expect(() => validateServerStudySession({ startedAt, plannedMinutes: 25, actualMinutes: 6 }, new Date("2026-09-13T10:05:30.000Z"))).toThrowError(new StudySessionError("STUDY_MINUTES_EXCEED_ELAPSED"));
  });

  it("rechaza sesiones demasiado cortas o que superan el plan", () => {
    expect(() => validateServerStudySession({ startedAt, plannedMinutes: 25, actualMinutes: 1 }, new Date("2026-09-13T10:00:59.000Z"))).toThrowError(new StudySessionError("STUDY_SESSION_TOO_SHORT"));
    expect(() => validateServerStudySession({ startedAt, plannedMinutes: 25, actualMinutes: 26 }, new Date("2026-09-13T10:26:00.000Z"))).toThrowError(new StudySessionError("STUDY_MINUTES_EXCEED_PLAN"));
  });

  it("permite menos minutos activos que el tiempo de reloj y guarda el final del servidor", () => {
    const now = new Date("2026-09-13T10:12:10.000Z");

    expect(validateServerStudySession({ startedAt, plannedMinutes: 25, actualMinutes: 10 }, now)).toEqual({ startedAt, endedAt: now, plannedMinutes: 25, actualMinutes: 10 });
  });

  it("rechaza una sesión que queda abierta más allá del margen permitido", () => {
    expect(() => validateServerStudySession({ startedAt, plannedMinutes: 25, actualMinutes: 25 }, new Date("2026-09-13T10:26:01.000Z"))).toThrowError(new StudySessionError("STUDY_SESSION_TOO_LONG"));
  });
});
