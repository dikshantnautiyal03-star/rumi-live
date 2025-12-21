import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Server-side Firebase Admin SDK initialization
// This file should only be imported in API routes (server-side)

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return;
    }

    let credential;

    // Priority 1: Load from FIREBASE_SERVICE_ACCOUNT_KEY env var (Base64 encoded JSON)
    // This is the recommended approach for production deployments
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            console.log('[Firebase Admin] Loading credentials from FIREBASE_SERVICE_ACCOUNT_KEY env var');
            const serviceAccountJson = Buffer.from(
                process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
                'base64'
            ).toString('utf8');
            const serviceAccount = JSON.parse(serviceAccountJson);
            credential = admin.credential.cert(serviceAccount);
        } catch (error) {
            console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error);
            throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY - must be valid Base64 encoded JSON');
        }
    }

    if (admin.apps.length === 0) {
        // If we have credentials, initialize as usual
        if (credential) {
            try {
                admin.initializeApp({
                    credential: credential,
                    projectId: process.env.FIREBASE_PROJECT_ID
                });
                console.log('✅ Firebase Admin Initialized');
                console.log('Project ID:', admin.app().options.projectId);
            } catch (e) {
                console.error('Error during admin.initializeApp:', e);
            }
        }
        // If no credentials (e.g. during build where secrets aren't available), 
        // skip initialization to prevent build crash.
        else {
            console.warn('[Firebase Admin] Skipping initialization: No credentials found (build step or missing secret).');
        }
    }
}

// Initialize on first import
initializeFirebaseAdmin();

db = admin.firestore();
auth = admin.auth();

export { db, auth, admin };
