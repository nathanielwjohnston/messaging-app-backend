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
