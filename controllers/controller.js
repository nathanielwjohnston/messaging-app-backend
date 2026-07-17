import { prisma } from "../lib/prisma.js";
import { generateHash } from "../lib/passwordUtils.js";

export async function register(req, res, next) {
        // TODO: password confirm and validation
        const { username, password } = req.body;

        const hash = await generateHash(password);

        try {
                await prisma.user.create({
                        data: {
                                username,
                                hash,
                                profile: {
                                        create: {},
                                },
                        },
                });
        } catch (error) {
                next(error);
        }

        return res.json({ message: "success" });
}

export async function login(req, res) {
        // TODO: verification
        return res.json({ message: "success" });
}

export async function logout(req, res, next) {
        req.logout((err) => {
                if (err) return next(err);
                return res.json({ message: "success" });
        });
}

export async function createChat(req, res, next) {
        const { recipientId } = req.body;

        const currentUserId = req.user.id;

        try {
                // Check for chat
                const chat = await prisma.chat.findFirst({
                        where: {
                                users: {
                                        every: {
                                                id: {
                                                        in: [
                                                                currentUserId,
                                                                recipientId,
                                                        ],
                                                },
                                        },
                                },
                        },
                        include: { users: true, messages: true },
                });

                if (chat) {
                        return res.json({
                                ...chat,
                                message: "Returned existing chat",
                        });
                }
        } catch (error) {
                console.error(error);
                return next(error);
        }

        try {
                // Create
                const chat = await prisma.chat.create({
                        data: {
                                users: {
                                        connect: [
                                                { id: currentUserId },
                                                { id: recipientId },
                                        ],
                                },
                        },
                        include: { users: true, messages: true },
                });

                return res.json(chat);
        } catch (error) {
                console.error(error);
                return next(error);
        }
}
export async function getChat(req, res, next) {
        const { id } = req.params;

        try {
                const chat = await prisma.chat.findUnique({
                        where: {
                                id,
                        },
                        include: { users: true, messages: true },
                });

                if (chat) {
                        return res.json(chat);
                }

                return res.status(404).json({ message: "Chat does not exist" });
        } catch (error) {
                console.error(error);
                return next(error);
        }
}
export async function getUsers(req, res, next) {}
export async function getProfile(req, res, next) {}
export async function updateProfile(req, res, next) {}
export async function getUserChats(req, res, next) {
        const { userid } = req.params;

        try {
                const chats = await prisma.chat.findMany({
                        where: {
                                users: {
                                        some: {
                                                id: userid,
                                        },
                                },
                        },
                        include: {
                                users: true,
                                messages: true,
                        },
                });

                return res.json(chats);
        } catch (error) {
                console.error(error);
                return next(error);
        }
}
export async function sendMessage(req, res, next) {
        const { chatid } = req.params;
        const { content } = req.body;

        const currentUserId = req.user.id;

        if (!content) {
                return res
                        .status(400)
                        .json({ message: "No message content provided" });
        }

        try {
                const usersChat = await prisma.chat.findUnique({
                        where: {
                                id: chatid,
                                users: {
                                        some: {
                                                id: currentUserId,
                                        },
                                },
                        },
                });

                if (!usersChat) {
                        return res
                                .status(403)
                                .json({ message: "Not your chat" });
                }
        } catch (error) {
                console.error(error);
                return next(error);
        }

        try {
                const message = await prisma.message.create({
                        data: {
                                content,
                                userId: currentUserId,
                                chatId: chatid,
                        },
                });

                return res.json(message);
        } catch (error) {
                console.error(error);
                return next(error);
        }
}
