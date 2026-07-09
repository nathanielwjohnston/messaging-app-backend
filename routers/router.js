import { Router } from "express";
import * as controller from "../controllers/controller.js";
import passport from "passport";

const router = Router();

const isNotAuthenticated = (req, res, next) => {
        if (!req.isAuthenticated()) {
                return next();
        }

        return res.status(409).json({
                error: "Already logged in",
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

export default router;
