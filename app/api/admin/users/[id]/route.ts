import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/admin/users/[id] - получение пользователя по ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
	try {
		// Проверка прав администратора
		const session = await auth();
		if (!session?.user || session.user.role !== "ADMIN") {
			return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
		}

		const userId = params.id;

		// Получение пользователя по ID
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				createdAt: true,
			},
		});

		if (!user) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		return NextResponse.json(user);
	} catch (error) {
		console.error("Ошибка при получении пользователя:", error);
		return NextResponse.json({ error: "Ошибка при получении пользователя" }, { status: 500 });
	}
}

// PUT /api/admin/users/[id] - обновление данных пользователя
export async function PUT(request: Request, { params }: { params: { id: string } }) {
	try {
		// Проверка прав администратора
		const session = await auth();
		if (!session?.user || session.user.role !== "ADMIN") {
			return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
		}

		// Получение данных из запроса
		const data = await request.json();
		const { name, email, role } = data;

		// Проверка обязательных полей
		if (!name || !email) {
			return NextResponse.json({ error: "Отсутствуют обязательные поля" }, { status: 400 });
		}

		const userId = params.id;

		// Проверка существования пользователя с таким ID
		const existingUser = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!existingUser) {
			return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
		}

		// Защита от изменения собственного статуса администратора
		if (session?.user?.id === userId && existingUser.role === "ADMIN" && role !== "ADMIN") {
			return NextResponse.json({ error: "Нельзя лишить себя прав администратора" }, { status: 400 });
		}

		// Проверка уникальности email (если изменился)
		if (email !== existingUser.email) {
			const emailExists = await prisma.user.findUnique({
				where: { email },
			});

			if (emailExists) {
				return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 400 });
			}
		}

		// Обновление пользователя
		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: {
				name,
				email,
				...(role && { role }),
			},
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				createdAt: true,
			},
		});

		return NextResponse.json(updatedUser);
	} catch (error) {
		console.error("Ошибка при обновлении пользователя:", error);
		return NextResponse.json({ error: "Ошибка при обновлении пользователя" }, { status: 500 });
	}
}

// PATCH /api/admin/users/[id] - обновление статуса администратора
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
	try {
		// Проверка прав администратора
		const session = await auth();
		if (!session?.user || session.user.role !== "ADMIN") {
			return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
		}

		const userId = params.id;
		const data = await request.json();

		// Защита от изменения собственного статуса администратора
		if (session?.user?.id === userId && data.role !== "ADMIN") {
			return NextResponse.json({ error: "Нельзя лишить себя прав администратора" }, { status: 400 });
		}

		// Обновление статуса администратора
		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: { role: data.role },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
			},
		});

		return NextResponse.json(updatedUser);
	} catch (error) {
		console.error("Ошибка при обновлении пользователя:", error);
		return NextResponse.json({ error: "Ошибка при обновлении пользователя" }, { status: 500 });
	}
}

// DELETE /api/admin/users/[id] - удаление пользователя
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
	try {
		// Проверка прав администратора
		const session = await auth();
		if (!session?.user || session.user.role !== "ADMIN") {
			return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
		}

		const userId = params.id;

		// Защита от удаления своего аккаунта
		if (session?.user?.id === userId) {
			return NextResponse.json({ error: "Нельзя удалить свой аккаунт" }, { status: 400 });
		}

		// Удаление пользователя
		await prisma.user.delete({
			where: { id: userId },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Ошибка при удалении пользователя:", error);
		return NextResponse.json({ error: "Ошибка при удалении пользователя" }, { status: 500 });
	}
}
