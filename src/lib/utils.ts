import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Message } from "@/types/message"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function sendToEvaluation(messages: Message[]) {
  console.log("Enviando mensajes para evaluación:", messages);
  
  try {
    // Llamamos a nuestra API route en lugar del webhook directamente
    const response = await fetch('/api/evaluation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      timestamp: new Date().toISOString(),
      messageCount: messages.length,
      response: data
    };
  } catch (error) {
    console.error('Error al enviar mensajes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString(),
    };
  }
}
