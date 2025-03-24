import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcrypt'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()
    
    // Validaciones básicas
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Nombre, email y contraseña son obligatorios' },
        { status: 400 }
      )
    }
    
    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 409 }
      )
    }
    
    // Crear usuario con contraseña encriptada
    const hashedPassword = await hash(password, 10)
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    })
    
    // No devolver la contraseña en la respuesta
    const { password: _, ...userWithoutPassword } = user
    
    return NextResponse.json(
      { user: userWithoutPassword, message: 'Usuario creado correctamente' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en registro:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
