import { NextRequest, NextResponse } from 'next/server';
import { Message } from '@/types/message';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages: Message[] = body.messages;
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Se requieren mensajes válidos' }, { status: 400 });
    }

    // Enviar los mensajes al webhook externo
    const response = await fetch('https://n8n-2rxn.onrender.com/webhook/b0cfc8ec-a63f-4cc6-9c87-cb11a20211eb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`Error en la solicitud al webhook: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      response: data
    });
  } catch (error) {
    console.error('Error en la ruta de evaluación:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      }, 
      { status: 500 }
    );
  }
}
