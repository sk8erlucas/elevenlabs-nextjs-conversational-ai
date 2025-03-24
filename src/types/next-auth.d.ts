import NextAuth from "next-auth"

declare module "next-auth" {
  /**
   * Extends the built-in session types
   */
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
