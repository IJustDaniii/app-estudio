import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { DEMO_SUBJECTS } from "../src/lib/demo-subjects";

const prisma = new PrismaClient();

function atDayOffset(days: number, hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function main() {
  const email = process.env.DEMO_USER_EMAIL?.toLowerCase();
  const password = process.env.DEMO_USER_PASSWORD;
  if (!email || !password) throw new Error("Configura DEMO_USER_EMAIL y DEMO_USER_PASSWORD para ejecutar el seed");

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: "Dani", email, passwordHash: await hash(password, 12), xp: 170, coins: 18 },
  });

  await prisma.$transaction(
    DEMO_SUBJECTS.map(([name, color]) =>
      prisma.subject.upsert({
        where: { userId_name: { userId: user.id, name } },
        update: { color },
        create: { userId: user.id, name, color },
      }),
    ),
  );

  if ((await prisma.task.count({ where: { userId: user.id } })) > 0) return;
  const subjects = await prisma.subject.findMany({ where: { userId: user.id } });
  const byName = Object.fromEntries(subjects.map((subject) => [subject.name, subject.id]));

  await prisma.task.createMany({ data: [
    { userId: user.id, subjectId: byName["Matemáticas"], title: "Entregar hoja de derivadas", planningMode: "FIXED_DEADLINE", type: "Entrega", priority: "HIGH", difficulty: 4, dueDate: atDayOffset(0, 20), estimatedMinutes: 50, status: "PENDING" },
    { userId: user.id, subjectId: byName["Física y Química"], title: "Repasar cinemática", planningMode: "FLEXIBLE_STUDY", type: "Repaso", priority: "MEDIUM", difficulty: 3, dueDate: atDayOffset(2), estimatedMinutes: 35, status: "PENDING" },
    { userId: user.id, subjectId: byName["Lengua Castellana y Literatura"], title: "Comentario de texto", planningMode: "FIXED_DEADLINE", type: "Entrega", priority: "MEDIUM", difficulty: 3, dueDate: atDayOffset(3), estimatedMinutes: 60, status: "IN_PROGRESS" },
  ] });

  await prisma.boss.create({ data: { userId: user.id, subjectId: byName["Matemáticas"], title: "Boss · Derivadas", date: atDayOffset(5), topics: ["Reglas de derivación", "Recta tangente", "Optimización"], difficulty: 4, preparation: 45, targetGrade: 8.5, expectedGrade: 7.5 } });
  await prisma.grade.createMany({ data: [
    { userId: user.id, subjectId: byName["Inglés"], label: "Writing", value: 8.2, date: atDayOffset(-8) },
    { userId: user.id, subjectId: byName["Filosofía"], label: "Disertación", value: 7.6, date: atDayOffset(-5) },
  ] });
  await prisma.goal.create({ data: { userId: user.id, title: "Mantener una media de 8", targetDate: atDayOffset(75), progress: 60 } });
  await prisma.timetableEntry.createMany({ data: [
    { userId: user.id, subjectId: byName["Matemáticas"], dayOfWeek: 1, startTime: "08:15", endTime: "09:10" },
    { userId: user.id, subjectId: byName["Física y Química"], dayOfWeek: 1, startTime: "09:10", endTime: "10:05" },
    { userId: user.id, subjectId: byName["Inglés"], dayOfWeek: 2, startTime: "08:15", endTime: "09:10" },
  ] });
}

main().finally(() => prisma.$disconnect());

