import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const { messages, conversationId } = await req.json();

    console.log('Mensajes recibidos:', messages);
    console.log('ID de conversación:', conversationId);
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No hay mensajes para guardar' }, { status: 400 });
    }
    
    // Buscar el usuario por email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    
    // Crear o recuperar una conversación
    let conversation;
    
    if (conversationId) {
      // Verificar si la conversación existe y pertenece al usuario
      conversation = await prisma.conversation.findFirst({
        where: { 
          id: conversationId,
          userId: user.id 
        },
      });
      
      if (!conversation) {
        return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
      }
      
      // Actualizar la hora de finalización
      conversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: { endTime: new Date() },
      });
    } else {
      // Crear nueva conversación
      conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          startTime: new Date(),
          endTime: new Date(), // Como es finalizada inmediatamente
        },
      });
    }
    
    // Guardar todos los mensajes
    const savedMessages = await Promise.all(
      messages.map((msg: any) => 
        prisma.message.create({
          data: {
            text: msg.text,
            sender: msg.sender,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            conversationId: conversation.id,
          }
        })
      )
    );
    
    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      messagesCount: savedMessages.length
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error al guardar la conversación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Obtener conversaciones del usuario
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    
    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      include: {
        messages: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    });
    
    return NextResponse.json({ conversations }, { status: 200 });
    
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
