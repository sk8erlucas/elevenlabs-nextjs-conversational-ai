"use client";

import { useEffect, useState, useRef } from "react";

// ElevenLabs
import { useConversation } from "@11labs/react";

// UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Mic, MicOff, Volume2, VolumeX, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

// Tipos
import type { Message } from "@/types/message";
import { sendToEvaluation } from "@/lib/utils";

const VoiceChat = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [agentVideo, setAgentVideo] = useState("/agent_01_idle.mp4");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string>("");
  const { toast } = useToast();

  // Estados para la barra de progreso
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");

  // Usar una ref para mantener una copia actualizada de los mensajes que se pueda acceder desde callbacks
  const messagesRef = useRef<Message[]>([]);

  // Actualizar la ref cada vez que cambia el estado de mensajes
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const conversation = useConversation({
    onConnect: () => {
      console.log("Conectado a ElevenLabs");
      setAgentVideo("/agent_01_idle.mp4");
    },
    onDisconnect: async () => {
      console.log("Desconectado de ElevenLabs");
      setAgentVideo("/agent_01_idle.mp4");

      try {
        // Iniciar procesamiento
        setIsProcessing(true);
        setProgress(10);
        setProcessingStatus("Preparando mensajes...");
        
        // Verificar si hay mensajes para guardar
        if (messagesRef.current.length === 0) {
          setProcessingStatus("No hay mensajes para procesar");
          setProgress(100);
          setTimeout(() => setIsProcessing(false), 1500);
          return;
        }

        // Guardar la conversación en la base de datos
        setProgress(30);
        setProcessingStatus("Guardando conversación en la base de datos...");
        
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: messagesRef.current,
            conversationId: conversationId || undefined,
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Error al guardar la conversación");
        }
        
        // Si no teníamos un ID de conversación, guardamos el que nos devuelve la API
        if (!conversationId && data.conversationId) {
          setConversationId(data.conversationId);
        }
        
        setProgress(60);
        setProcessingStatus("Enviando datos para evaluación...");

        // Usar la función para enviar los mensajes para evaluación
        const result = await sendToEvaluation(messagesRef.current);

        console.log("Resultado de evaluación:", result);

        setProgress(100);
        setProcessingStatus("¡Proceso completado con éxito!");
        
        // Mostrar notificación de éxito
        toast({
          title: "Conversación finalizada",
          description: "Evaluación finalizada y enviada a revisión, gracias por su tiempo",
          variant: "success",
        });
        
        // Ocultar la barra de progreso después de mostrarla completa
        setTimeout(() => setIsProcessing(false), 1500);
      } catch (error) {
        console.error("Error al procesar la conversación:", error);
        setErrorMessage("Error al procesar la conversación");
        setProcessingStatus("Se produjo un error al procesar la información");
        setProgress(100);
        
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Error al procesar la conversación",
          variant: "destructive",
        });
        
        setTimeout(() => setIsProcessing(false), 1500);
      }
    },
    onMessage: (message) => {
      console.log("Mensaje recibido:", message);

      // Corregimos para adaptarnos a la estructura real de los mensajes
      if (message.source === "ai" && message.message) {
        const newMessage: Message = {
          id: `agent-${Date.now()}`,
          text: message.message,
          sender: "agent",
          timestamp: new Date().toISOString(),
        };

        setMessages((prevMessages) => [...prevMessages, newMessage]);
      }

      // Guardar mensaje del usuario si está presente
      if (message.source === "user" && message.message) {
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          text: message.message,
          sender: "user",
          timestamp: new Date().toISOString(),
        };

        setMessages((prevMessages) => [...prevMessages, userMessage]);
      }
    },
    onError: (error: string | Error) => {
      setErrorMessage(typeof error === "string" ? error : error.message);
      console.error("Error:", error);
      setAgentVideo("/agent_01_error.mp4");
      
      toast({
        title: "Error de conversación",
        description: typeof error === "string" ? error : error.message,
        variant: "destructive",
      });
    },
  });

  const { status, isSpeaking } = conversation;

  useEffect(() => {
    if (status === "connected") {
      if (isSpeaking) {
        setAgentVideo("/agent_01_speaking.mp4");
      } else {
        setAgentVideo("/agent_01_listening.mp4");
      }
    } else {
      setAgentVideo("/agent_01_idle.mp4");
    }
  }, [status, isSpeaking]);

  useEffect(() => {
    // Solicitar permiso de micrófono al montar el componente
    const requestMicPermission = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasPermission(true);
      } catch (error) {
        setErrorMessage("Acceso al micrófono denegado");
        console.error("Error al acceder al micrófono:", error);
        
        toast({
          title: "Error de permisos",
          description: "No se pudo acceder al micrófono. Por favor, verifica los permisos.",
          variant: "destructive",
        });
      }
    };

    requestMicPermission();
  }, [toast]);

  const handleStartConversation = async () => {
    try {
      // Reemplazar con tu ID de agente real o URL
      const id = await conversation.startSession({
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
      });
      console.log("Conversación iniciada:", id);
      setConversationId(id);

      // Reiniciar los mensajes para una nueva conversación
      setMessages([]);
      
      toast({
        title: "Conversación iniciada",
        description: "Puede comenzar a hablar con el asistente",
        variant: "default",
      });
    } catch (error) {
      setErrorMessage("Error al iniciar la conversación");
      console.error("Error al iniciar la conversación:", error);
      
      toast({
        title: "Error",
        description: "No se pudo iniciar la conversación",
        variant: "destructive",
      });
    }
  };

  const handleEndConversation = async () => {
    try {
      await conversation.endSession();
      // El onDisconnect se encargará de procesar los mensajes y enviar la evaluación
    } catch (error) {
      setErrorMessage("Error al finalizar la conversación");
      console.error("Error al finalizar la conversación:", error);
      
      toast({
        title: "Error",
        description: "No se pudo finalizar la conversación correctamente",
        variant: "destructive",
      });
    }
  };

  const toggleMute = async () => {
    try {
      await conversation.setVolume({ volume: isMuted ? 1 : 0 });
      setIsMuted(!isMuted);
      
      toast({
        title: isMuted ? "Audio activado" : "Audio desactivado",
        description: isMuted ? "Ahora podrá escuchar al asistente" : "El asistente ha sido silenciado",
        variant: "default",
      });
    } catch (error) {
      setErrorMessage("Error al cambiar el volumen");
      console.error("Error al cambiar el volumen:", error);
      
      toast({
        title: "Error",
        description: "No se pudo cambiar el volumen",
        variant: "destructive",
      });
    }
  };

  // Añadimos una función específica para exportar que podamos usar en cualquier momento
  const getConversationData = () => {
    return {
      id: conversationId,
      timestamp: new Date().toISOString(),
      messages: messagesRef.current, // Usar la ref para acceder a los mensajes actualizados
    };
  };

  const exportConversation = () => {
    // Obtener los datos de la conversación
    const conversationData = getConversationData();

    // Convertir a JSON y crear un blob
    const jsonData = JSON.stringify(conversationData, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });

    // Crear una URL para descargar
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversacion-${conversationId || Date.now()}.json`;
    document.body.appendChild(a);
    a.click();

    // Limpiar
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({
      title: "Conversación exportada",
      description: "El archivo JSON ha sido descargado correctamente",
      variant: "success",
    });
  };

  // Añadimos este useEffect para depurar y confirmar que los mensajes se guardan
  useEffect(() => {
    if (messages.length > 0) {
      console.log(
        `Estado de mensajes actualizado: ${messages.length} mensajes guardados`
      );
    }
  }, [messages]);

  return (
    <Card className="w-full max-w-md mx-auto bg-corporate-white shadow-xl border-0">
      <CardHeader className="border-b border-corporate-gray/10 pb-4">
        <CardTitle className="flex items-center justify-between text-corporate-dark">
          <span className="flex items-center">
            <Info className="h-5 w-5 mr-2 text-corporate-violet" />
            Asistente de Ventas
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
              disabled={status !== "connected"}
              className="border-corporate-gray/20 text-corporate-gray hover:text-corporate-violet hover:border-corporate-violet"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={exportConversation}
              disabled={messages.length === 0}
              title="Exportar conversación"
              className="border-corporate-gray/20 text-corporate-gray hover:text-corporate-violet hover:border-corporate-violet"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 pb-6">
        <div className="space-y-6">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-corporate-dark/5 border border-corporate-gray/10">
            <video
              src={agentVideo}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
            />
          </div>

          {/* Indicador de mensajes guardados */}
          {messages.length > 0 && (
            <div className="text-xs text-corporate-gray text-center py-2 px-3 bg-corporate-gray/5 rounded-md">
              {messages.length} mensajes guardados
            </div>
          )}
          
          {/* Barra de progreso durante el procesamiento */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-corporate-gray">{processingStatus}</p>
            </div>
          )}

          <div className="flex justify-center">
            {status === "connected" ? (
              <Button
                variant="destructive"
                onClick={handleEndConversation}
                disabled={isProcessing}
                className="w-full py-6 bg-red-500 hover:bg-red-600 text-white"
              >
                <MicOff className="mr-2 h-5 w-5" />
                Finalizar Conversación
              </Button>
            ) : (
              <Button
                onClick={handleStartConversation}
                disabled={!hasPermission || isProcessing}
                className="w-full py-6 bg-corporate-violet hover:bg-corporate-violet/90 text-white"
              >
                <Mic className="mr-2 h-5 w-5" />
                Iniciar Conversación
              </Button>
            )}
          </div>

          <div className="text-center">
            {status === "connected" && (
              <p className="text-green-600 font-medium">
                {isSpeaking ? "El agente está hablando..." : "Escuchando..."}
              </p>
            )}
            {errorMessage && (
              <p className="text-red-500 font-medium mt-2">{errorMessage}</p>
            )}
            {!hasPermission && (
              <p className="text-amber-600 font-medium mt-2">
                Por favor, permite el acceso al micrófono para usar el chat de
                voz
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceChat;
