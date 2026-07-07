import { SignUp } from '@clerk/nextjs';
import { clerkAppearance } from '@/lib/clerkAppearance';
import { CLERK_CONFIGURED } from '@/lib/clerkConfig';

export default function SignUpPage() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-paper px-4 py-12">
      {CLERK_CONFIGURED ? (
        <SignUp appearance={clerkAppearance} fallbackRedirectUrl="/" signInUrl="/sign-in" />
      ) : (
        <div className="max-w-md rounded-2xl border border-line bg-white p-6 text-center shadow-soft">
          <h1 className="text-2xl font-semibold text-ink">Clerk is not configured</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Add the sign-in provider key to enable sign up. Browser-only tools still work without an account.
          </p>
        </div>
      )}
    </main>
  );
}
