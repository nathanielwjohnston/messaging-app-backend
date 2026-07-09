import bcrypt from "bcryptjs";

export async function generateHash(password) {
        const saltLength = 10;
        const hashedPassword = await bcrypt.hash(password, saltLength);
        return hashedPassword;
}

export async function validatePassword(passwordAttempt, hashedPassword) {
        const match = await bcrypt.compare(passwordAttempt, hashedPassword);
        return match;
}
