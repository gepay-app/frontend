import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

export const useAuth = () => {
  const { $firebaseAuth } = useNuxtApp();
  const user = useState<User | null>("auth-user");
  const authReady = useState("auth-ready");

  const loginWithCredentials = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(
        $firebaseAuth,
        email,
        password,
      );

      return cred.user;
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(
        $firebaseAuth,
        new GoogleAuthProvider(),
      );
      return cred.user;
    } catch (e) {
      throw mapFirebaseAuthError(e);
    }
  };

  // Self-registration. Akun Firebase dibuat di client, TAPI backend baru
  // mengenalnya saat login pertama + email sudah terverifikasi
  // (provisionOnFirstLogin). Karena itu setelah daftar kita kirim email
  // verifikasi lalu signOut — biar user gak nyangkut di sesi yang belum bisa
  // akses API (401).
  const registerWithEmail = async (
    name: string,
    email: string,
    password: string,
  ) => {
    try {
      const cred = await createUserWithEmailAndPassword(
        $firebaseAuth,
        email,
        password,
      );

      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }

      await sendEmailVerification(cred.user);
      await signOut($firebaseAuth);
      return true;
    } catch (e) {
      throw mapFirebaseAuthError(e);
    }
  };

  const sendResetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail($firebaseAuth, email);
    } catch (e) {
      throw mapFirebaseAuthError(e);
    }
  };

  const logout = async (redirect = true) => {
    await signOut($firebaseAuth);
    useCurrentUser().clear();
    if (redirect) await navigateTo("/login");
  };

  return {
    user: readonly(user),
    authReady: readonly(authReady),
    loginWithCredentials,
    loginWithGoogle,
    registerWithEmail,
    sendResetPassword,
    logout,
  };
};
