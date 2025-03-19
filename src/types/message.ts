/**
 * Tipo para el rol del mensaje (usuario o agente)
 */
export type Role = "user" | "agent";

/**
 * Interfaz que define la estructura de un mensaje en la conversación
 */
export interface Message {
  /**
   * Identificador único del mensaje
   */
  id: string;
  
  /**
   * Contenido textual del mensaje, puede ser undefined
   */
  text: string | undefined;
  
  /**
   * Remitente del mensaje: usuario o agente IA
   */
  sender: Role;
  
  /**
   * Marca de tiempo como cadena ISO para serialización
   */
  timestamp: string;
}

/**
 * Interfaz para los mensajes recibidos por ElevenLabs
 */
export interface ElevenLabsMessage {
  /**
   * Contenido del mensaje
   */
  message: string;
  
  /**
   * Origen del mensaje: 'user' o 'ai'
   */
  source: string;
}
