import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/prisma/client"

export const authConfig = {
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                try {
                    const usuario = await prisma.usuario.findUnique({
                        where: { email: credentials.email as string },
                        include: { lote: { include: { manzana: true } } }
                    })

                    if (!usuario) {
                        return null
                    }

                    const isPasswordValid = await compare(
                        credentials.password as string,
                        usuario.password
                    )

                    if (!isPasswordValid) {
                        return null
                    }

                    if (!usuario.verificado) {
                        throw new Error("Tu cuenta aún no ha sido verificada por un administrador")
                    }

                    return {
                        id: usuario.id.toString(),
                        email: usuario.email,
                        name: usuario.nombre,
                        role: usuario.rol,
                        loteId: usuario.loteId,
                    }
                } catch (error) {
                    console.error('Auth error:', error)
                    throw error
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id as string
                token.role = user.role
                token.loteId = user.loteId
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as string
                session.user.loteId = token.loteId as number
            }
            return session
        }
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: "jwt" as const,
    },
} satisfies NextAuthConfig

export const authOptions = authConfig