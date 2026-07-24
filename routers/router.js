import { Router } from "express";
import * as controller from "../controllers/controller.js";
import passport from "passport";

import multer from "multer";

const router = Router();

const storage = new multer.memoryStorage();
const upload = multer({
        storage,
        limits: { fileSize: 10000000 },
});

const isNotAuthenticated = (req, res, next) => {
        if (!req.isAuthenticated()) {
                return next();
        }

        return res.status(409).json({
                error: "Already logged in",
        });
};

const isAuthenticated = (req, res, next) => {
        if (req.isAuthenticated()) {
                return next();
        }

        return res.status(409).json({
                error: "Not logged in",
        });
};

router.post("/register", isNotAuthenticated, controller.register);

router.post(
        "/login",
        isNotAuthenticated,
        passport.authenticate("local"),
        controller.login,
);

router.get("/logout", controller.logout);

// Create chat
router.post("/chats", isAuthenticated, controller.createChat);
router.get("/chats/:id", isAuthenticated, controller.getChat);

router.get("/users", isAuthenticated, controller.getUsers);
router.get("/users/:userid/profile", isAuthenticated, controller.getProfile);
router.put(
        "/users/:userid/profile",
        (req, res, next) => {
                console.log("before auth");
                next();
        },
        isAuthenticated,
        (req, res, next) => {
                console.log("before multer");
                next();
        },
        upload.single("avatar"),
        (req, res, next) => {
                console.log("after multer");
                next();
        },
        controller.updateProfile,
);

router.get("/users/:userid/chats", isAuthenticated, controller.getUserChats);

router.post("/chats/:chatid/messages", isAuthenticated, controller.sendMessage);

export default router;
