import { SignIn } from '@clerk/nextjs';
import { clerkAppearance } from '@/lib/clerkAppearance';
import { CLERK_CONFIGURED } from '@/lib/clerkConfig';

export default function SignInPage() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-paper px-4 py-12">
      {CLERK_CONFIGURED ? (
        <SignIn appearance={clerkAppearance} fallbackRedirectUrl="/" signUpUrl="/sign-up" />
      ) : (
        <AuthSetupNotice mode="sign in" />
      )}
    </main>
  );
}

function AuthSetupNotice({ mode }: { mode: string }) {
  return (
    <div className="max-w-md rounded-2xl border border-line bg-white p-6 text-center shadow-soft">
      <h1 className="text-2xl font-semibold text-ink">Clerk is not configured</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Add the sign-in provider key to enable {mode}. Browser-only tools still work without an account.
      </p>
    </div>
  );
}
