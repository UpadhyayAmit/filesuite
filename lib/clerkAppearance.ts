export const clerkAppearance = {
  variables: {
    colorPrimary: '#ff6b35',
    colorBackground: '#ffffff',
    colorInputBackground: '#f7f8fb',
    colorInputText: '#141824',
    colorText: '#141824',
    colorTextSecondary: '#667085',
    borderRadius: '12px',
    fontFamily: 'var(--font-sans), sans-serif',
  },
  elements: {
    cardBox: 'shadow-[0_24px_80px_rgba(20,24,36,0.16)]',
    card: 'border border-slate-200',
    headerTitle: 'text-slate-950',
    headerSubtitle: 'text-slate-500',
    socialButtonsBlockButton: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    formButtonPrimary: 'bg-[#ff6b35] hover:bg-[#f25f2b] text-white',
    footerActionLink: 'text-[#ff6b35] hover:text-[#f25f2b]',
  },
} as const;
