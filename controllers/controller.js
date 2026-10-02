import { prisma } from "../lib/prisma.js";
import { generateHash } from "../lib/passwordUtils.js";

import { v2 as cloudinary } from "cloudinary";

export async function register(req, res, next) {
        const { username, password } = req.body;

        const hash = await generateHash(password);

        try {
                await prisma.user.create({
                        data: {
                                username,
                                hash,
                                profile: {
                                        create: {
                                                avatarUrl: "https://res.cloudinary.com/da6cjcmtt/image/upload/v1785094610/cms278o7400084053i508u0tl.png",
                                        },
                                },
                        },
                });
        } catch (error) {
                next(error);
        }

        return res.json({ message: "success" });
}
export async function login(req, res) {
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
                        include: {
                                users: { select: { id: true, username: true } },
                                messages: true,
                        },
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
                        include: {
                                users: { select: { id: true, username: true } },
                                messages: true,
                        },
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
                        include: {
                                users: { select: { id: true, username: true } },
                                messages: { include: { user: true } },
                        },
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

export async function getUsers(req, res, next) {
        const currentUserId = req.user.id;

        try {
                const user = await prisma.user.findUnique({
                        where: {
                                id: currentUserId,
                        },
                });

                const users = await prisma.user.findMany({
                        where: { NOT: { username: user.username } },
                        select: {
                                id: true,
                                username: true,
                                profile: { select: { avatarUrl: true } },
                        },
                });

                return res.json(users);
        } catch (error) {
                console.error(error);
                return next(error);
        }
}
export async function getProfile(req, res, next) {
        const { userid } = req.params;

        try {
                let profile = await prisma.user.findUnique({
                        where: {
                                id: userid,
                        },
                        include: {
                                profile: true,
                        },
                });

                if (!profile) {
                        return res
                                .status(404)
                                .json({ message: "This user does not exist" });
                }

                profile = {
                        username: profile.username,
                        bio: profile.profile.bio,
                        age: profile.profile.age,
                        avatarUrl: profile.profile.avatarUrl,
                };

                return res.json(profile);
        } catch (error) {
                console.error(error);
                return next(error);
        }
}

async function uploadImage(file, userId) {
        const base64 = Buffer.from(file.buffer).toString("base64");
        let dataURI = "data:" + file.mimetype + ";base64," + base64;
        const uploadResult = await cloudinary.uploader.upload(dataURI, {
                resource_type: "auto",
                public_id: userId,
                overwrite: true,
        });

        // versioned url
        const url = uploadResult.secure_url;

        return url;
}

export async function updateProfile(req, res, next) {
        const file = req.file;
        const { userid } = req.params;
        const { username, bio, age } = req.body || {};

        const currentUserId = req.user.id;

        if (currentUserId !== userid) {
                return res.status(403).json({ message: "Not your profile" });
        }

        const fields = {
                bio,
                age: parseInt(age),
        };

        try {
                if (file) {
                        fields.avatarUrl = await uploadImage(file, userid);
                }
                const profile = await prisma.profile.update({
                        where: { id: userid },
                        data: {
                                ...fields,
                        },
                });

                const user = await prisma.user.update({
                        where: { id: userid },
                        data: {
                                username,
                        },
                });

                const updatedProfile = {
                        username: user.username,
                        bio: profile.bio,
                        age: profile.age,
                        avatarUrl: profile.avatarUrl,
                };

                return res.json(updatedProfile);
        } catch (error) {
                console.error(error);
                return next(error);
        }
}

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
                                messages: { include: { user: true } },
                                users: {
                                        select: {
                                                id: true,
                                                username: true,
                                                profile: true,
                                        },
                                },
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
                        include: { user: true },
                });

                return res.json(message);
        } catch (error) {
                console.error(error);
                return next(error);
        }
}
