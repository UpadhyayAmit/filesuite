'use client';

import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs';
import { clerkAppearance } from '@/lib/clerkAppearance';
import { CLERK_CONFIGURED } from '@/lib/clerkConfig';

export function NavBarAuth() {
  if (!CLERK_CONFIGURED) {
    return (
      <div className="flex items-center gap-2">
        <a href="/sign-in" className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-sage">
          Sign in
        </a>
        <a href="/sign-up" className="rounded-md bg-coral px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-[#f25f2b]">
          Sign up free
        </a>
      </div>
    );
  }

  return <NavBarAuthInner />;
}

function NavBarAuthInner() {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return <UserButton appearance={{ elements: { avatarBox: 'h-9 w-9' } }} />;
  }

  return (
    <div className="flex items-center gap-2">
      <SignInButton mode="modal" appearance={clerkAppearance}>
        <button className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-sage">
          Sign in
        </button>
      </SignInButton>
      <SignUpButton mode="modal" appearance={clerkAppearance}>
        <button className="rounded-md bg-coral px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-[#f25f2b]">
          Sign up free
        </button>
      </SignUpButton>
    </div>
  );
}
