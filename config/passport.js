import passport from "passport";
import { prisma } from "../lib/prisma.js";
import { Strategy as LocalStrategy } from "passport-local";
import { validatePassword } from "../lib/passwordUtils.js";

const verifyCallback = async (username, password, done) => {
        try {
                const user = await prisma.user.findUnique({
                        where: { username },
                });
                if (!user) return done(null, false);
                const isValid = await validatePassword(password, user.hash);
                if (isValid) {
                        console.log("valid");
                        return done(null, user);
                } else {
                        console.log("invalid");
                        return done(null, false);
                }
        } catch (error) {
                done(error);
        }
};

const strategy = new LocalStrategy(verifyCallback);
passport.use(strategy);

passport.serializeUser((user, done) => {
        done(null, user.id);
});

passport.deserializeUser(async (userId, done) => {
        try {
                const user = await prisma.user.findUnique({
                        where: {
                                id: userId,
                        },
                });
                done(null, user);
        } catch (error) {
                done(error);
        }
});
