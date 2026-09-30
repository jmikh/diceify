// TODO(C3): delete with app/api/projects/**.
//
// NextAuth is gone (C2) and the Prisma project routes are replaced by direct Supabase access under RLS in C3.
// Until then they keep compiling against this shim, which never authenticates anyone: every project route
// answers 401 and the client degrades to an empty project list. Supabase JWTs are deliberately not bridged
// into Prisma — the two user tables have different ids.

export interface LegacySession {
  user: { id: string; email?: string | null }
}

export async function auth(): Promise<LegacySession | null> {
  return null
}
