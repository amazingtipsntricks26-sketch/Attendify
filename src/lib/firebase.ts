import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

let firebaseApp: any = null;
let db: any = null;
let auth: any = null;
let storage: any = null;

const getFirebaseConfig = async () => {
  try {
    const response = await fetch('/firebase-applet-config.json');
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
};

export const initFirebase = async () => {
  if (firebaseApp) return { app: firebaseApp, db, auth, storage };

  const config = await getFirebaseConfig();
  if (!config) {
    console.warn('Firebase config missing. Operating in Local Storage (Demo) mode.');
    // Return a mock object that matches the expected interface but is null for real firebase
    // This allows the app to not crash, and we'll handle the 'null' check in components or 
    // just implement a transparent local storage proxy if we wanted to go deep.
    // For now, returning null indicates to components they should use local state/demo mode.
    return null;
  }

  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
  db = getFirestore(firebaseApp, config.firestoreDatabaseId);
  auth = getAuth(firebaseApp);
  storage = getStorage(firebaseApp);

  return { app: firebaseApp, db, auth, storage };
};

export const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const currentAuth = auth;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.currentUser?.uid,
      email: currentAuth?.currentUser?.email,
      emailVerified: currentAuth?.currentUser?.emailVerified,
      isAnonymous: currentAuth?.currentUser?.isAnonymous,
      tenantId: currentAuth?.currentUser?.tenantId,
      providerInfo: currentAuth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

export { OperationType };
