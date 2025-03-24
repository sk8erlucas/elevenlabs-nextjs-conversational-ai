import { compare } from 'bcrypt'
import { prisma } from './db'

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user || !user.password) {
    return null
  }

  const isPasswordValid = await compare(password, user.password)

  if (!isPasswordValid) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
  }
}
