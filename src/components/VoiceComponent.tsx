"use client";

import React, { useEffect, useState } from "react";

// ElevenLabs
import { useConversation } from "@11labs/react";

// UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

const VoiceChat = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [agentVideo, setAgentVideo] = useState("/agent_01_idle.mp4");

  const conversation = useConversation({
    onConnect: () => {
      console.log("Conectado a ElevenLabs");
      setAgentVideo("/agent_01_idle.mp4");
    },
    onDisconnect: () => {
      console.log("Desconectado de ElevenLabs");
      setAgentVideo("/agent_01_idle.mp4");
    },
    onMessage: (message) => {
      console.log("Mensaje recibido:", message);
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
      const conversationId = await conversation.startSession({
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
      });
      console.log("Conversación iniciada:", conversationId);
    } catch (error) {
      setErrorMessage("Error al iniciar la conversación");
      console.error("Error al iniciar la conversación:", error);
    }
  };

  const handleEndConversation = async () => {
    try {
      await conversation.endSession();
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
                Por favor, permite el acceso al micrófono para usar el chat de voz
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceChat;
