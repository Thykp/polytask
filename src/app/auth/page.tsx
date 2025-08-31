'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';

import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If a session already exists, redirect home
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/');
    });
  }, [router]);

  const canSubmit = useMemo(() => isValidEmail(email) && phase !== 'loading', [email, phase]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setErrorMsg('Please enter a valid email.');
      return;
    }
    setErrorMsg(null);
    setPhase('loading');

    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setPhase('error');
      setErrorMsg(error.message ?? 'Something went wrong. Please try again.');
      return;
    }
    setPhase('sent');
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-background to-muted">
      <Card className="w-full max-w-md p-6 shadow-lg border-border">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold">PT</span>
          </div>
          <div>
            <div className="text-lg font-semibold leading-none">Polytask by Kendrick Poon</div>
            <div className="text-xs text-muted-foreground">Sign in to continue</div>
          </div>
        </div>

        {phase === 'sent' ? (
          <div className="space-y-4">
            <p className="text-sm">
              We’ve sent a <span className="font-medium">magic link</span> to{' '}
              <span className="font-mono">{email}</span>. Open it to finish signing in.
            </p>
            <p className="text-xs text-muted-foreground">
              Didn’t get it? Check spam, or try again.
            </p>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                setPhase('idle');
                setErrorMsg(null);
              }}>
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={signIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={phase === 'loading'}
              />
            </div>

            {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {phase === 'loading' ? 'Sending magic link…' : 'Continue with email'}
            </Button>

            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              By continuing, you agree to the app’s terms of use.
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
