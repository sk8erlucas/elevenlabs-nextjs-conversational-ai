"use client";

import React, { useEffect, useState, useRef } from "react";

// ElevenLabs
import { useConversation } from "@11labs/react";

// UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Mic, MicOff, Volume2, VolumeX } from "lucide-react";

// Tipos
import { Message } from "@/types/message";
import { sendToEvaluation } from "@/lib/utils";

const VoiceChat = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [agentVideo, setAgentVideo] = useState("/agent_01_idle.mp4");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string>("");

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
        // Usar la nueva función para enviar los mensajes para evaluación
        const result = await sendToEvaluation(messagesRef.current);

        console.log("Resultado de evaluación:", result);

        alert(
          "Evaluación finalizada y enviada a su revisión, gracias por su tiempo"
        );
      } catch (error) {
        console.error("Error al enviar mensajes para evaluación:", error);
        setErrorMessage("Error al enviar mensajes para evaluación");
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
      }
    };

    requestMicPermission();
  }, []);

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
    } catch (error) {
      setErrorMessage("Error al iniciar la conversación");
      console.error("Error al iniciar la conversación:", error);
    }
  };

  const handleEndConversation = async () => {
    try {
      // Hacer un registro de los mensajes ANTES de terminar la sesión
      console.log("Mensajes antes de finalizar:", messages);

      await conversation.endSession();
      // El onDisconnect se encargará de mostrar la alerta y hacer el console.log
    } catch (error) {
      setErrorMessage("Error al finalizar la conversación");
      console.error("Error al finalizar la conversación:", error);
    }
  };

  const toggleMute = async () => {
    try {
      await conversation.setVolume({ volume: isMuted ? 1 : 0 });
      setIsMuted(!isMuted);
    } catch (error) {
      setErrorMessage("Error al cambiar el volumen");
      console.error("Error al cambiar el volumen:", error);
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
  };

  // Función para formatear la fecha/hora para mostrar
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Chat de Voz
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
              disabled={status !== "connected"}
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
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative aspect-video mb-4 rounded-lg overflow-hidden bg-gray-100">
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
            <div className="text-xs text-gray-500 mb-2 text-center">
              {messages.length} mensajes guardados
            </div>
          )}

          <div className="flex justify-center">
            {status === "connected" ? (
              <Button
                variant="destructive"
                onClick={handleEndConversation}
                className="w-full"
              >
                <MicOff className="mr-2 h-4 w-4" />
                Finalizar Conversación
              </Button>
            ) : (
              <Button
                onClick={handleStartConversation}
                disabled={!hasPermission}
                className="w-full"
              >
                <Mic className="mr-2 h-4 w-4" />
                Iniciar Conversación
              </Button>
            )}
          </div>

          <div className="text-center text-sm">
            {status === "connected" && (
              <p className="text-green-600">
                {isSpeaking ? "El agente está hablando..." : "Escuchando..."}
              </p>
            )}
            {errorMessage && <p className="text-red-500">{errorMessage}</p>}
            {!hasPermission && (
              <p className="text-yellow-600">
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
