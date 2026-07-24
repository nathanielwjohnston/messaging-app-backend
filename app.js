import express from "express";
import session from "express-session";
import passport from "passport";
import { prisma } from "./lib/prisma.js";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import "./config/passport.js";
import router from "./routers/router.js";
import { v2 as cloudinary } from "cloudinary";

export function createApp() {
        const app = express();

        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        const checkPeriod = process.env.NODE_ENV === "test" ? 0 : 2 * 60 * 1000; // 2 minutes

        const sessionStore = new PrismaSessionStore(prisma, {
                checkPeriod,
                dbRecordIdIsSessionId: true,
                dbRecordIdFunction: undefined,
        });

        app.use(
                session({
                        secret: process.env.SECRET,
                        resave: false,
                        saveUninitialized: true,
                        store: sessionStore,
                        cookie: {
                                maxAge: 1000 * 60 * 60 * 24,
                        },
                }),
        );

        app.use(passport.initialize());
        app.use(passport.session());

        cloudinary.config({
                cloud_name: process.env.CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        app.use("/", router);

        app.use((err, req, res) => {
                console.error(err);
                res.status(500).json(err);
        });

        return app;
}
