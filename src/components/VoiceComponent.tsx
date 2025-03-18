"use client";

import React, { useEffect, useState } from "react";

// ElevenLabs
import { useConversation } from "@11labs/react";

// UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Dialog
} from "./ui/dialog";

// Definimos el tipo para los mensajes con tipos más amplios para compatibilidad
interface Message {
  id: string;
  text: string | undefined; // Ahora acepta undefined
  sender: "user" | "agent";
  timestamp: string; // Usamos string en lugar de Date para serialización
}

const VoiceChat = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [agentVideo, setAgentVideo] = useState("/agent_01_idle.mp4");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string>("");
  const [showConversationDialog, setShowConversationDialog] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log("Conectado a ElevenLabs");
      setAgentVideo("/agent_01_idle.mp4");
    },
    onDisconnect: () => {
      console.log("Desconectado de ElevenLabs");
      setAgentVideo("/agent_01_idle.mp4");

      // Mostrar el diálogo con la conversación si hay mensajes
      if (messages.length > 0) {
        setShowConversationDialog(true);
      }
    },
    onMessage: (message) => {
      console.log("Mensaje recibido:", message);

      // Guardar mensaje del agente
      if (message.text) {
        const newMessage: Message = {
          id: `agent-${Date.now()}`,
          text: message.text,
          sender: "agent",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, newMessage]);
      }

      // Guardar mensaje del usuario si está presente
      if (message.userInput) {
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          text: message.userInput,
          sender: "user",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
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
      await conversation.endSession();
      // El diálogo se mostrará automáticamente en el evento onDisconnect
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

  const exportConversation = () => {
    // Crear un objeto con los detalles de la conversación
    const conversationData = {
      id: conversationId,
      timestamp: new Date().toISOString(),
      messages: messages,
    };

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

  return (
    <>
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

      {/* Diálogo para mostrar la conversación completa */}
      <Dialog
        open={showConversationDialog}
        onOpenChange={setShowConversationDialog}
      >
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resumen de la Conversación</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-4">
            {messages.length === 0 ? (
              <p className="text-center text-gray-500">
                No hay mensajes en esta conversación.
              </p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.sender === "user"
                        ? "bg-blue-100 ml-8"
                        : "bg-gray-100 mr-8"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1 text-xs text-gray-500">
                      <span>{msg.sender === "user" ? "Tú" : "Agente"}</span>
                      <span>{formatTimestamp(msg.timestamp)}</span>
                    </div>
                    <p>{msg.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={exportConversation}
              disabled={messages.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar Conversación
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowConversationDialog(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VoiceChat;
