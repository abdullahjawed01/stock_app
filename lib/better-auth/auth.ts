import { betterAuth } from "better-auth";
import { mongodbAdapter} from "better-auth/adapters/mongodb";
import { connectToDatabase} from "@/database/mongoose";
import { nextCookies} from "better-auth/next-js";

let authInstance: ReturnType<typeof betterAuth> | null = null;

export const getAuth = async () => {
    if(authInstance) return authInstance;

    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;

        if(!db) throw new Error('MongoDB connection not found');

        authInstance = betterAuth({
            database: mongodbAdapter(db as any),
            secret: process.env.BETTER_AUTH_SECRET,
            baseURL: process.env.BETTER_AUTH_URL,
            emailAndPassword: {
                enabled: true,
                disableSignUp: false,
                requireEmailVerification: false,
                minPasswordLength: 8,
                maxPasswordLength: 128,
                autoSignIn: true,
            },
            plugins: [nextCookies()],
        });
    } catch (err) {
        console.warn('Failed to initialize Better Auth (this is expected during next build if MONGODB_URI is not set):', err);
        // Fallback mock to allow Next.js build / page compilation to succeed without active DB
        authInstance = {
            api: {
                signUpEmail: async () => ({}),
                signInEmail: async () => ({}),
                signOut: async () => ({}),
            },
            options: {},
        } as any;
    }

    return authInstance;
}

export const auth = await getAuth();
