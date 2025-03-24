import VoiceComponent from "@/components/VoiceComponent";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center relative overflow-hidden bg-corporate-dark p-4">
      <div className="absolute -z-10 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-corporate-violet/20 to-corporate-blue/20 blur-[120px] animate-pulse" />

      <div className="max-w-4xl w-full text-center mb-8">
        <h1 className="text-5xl font-bold mb-3 text-corporate-white">
          Entrenador y evaluador de ventas
        </h1>
        <p className="text-corporate-gray/80 text-lg mb-8">
          Mejora tus habilidades de venta con nuestro asistente de IA
        </p>
      </div>
      
      <VoiceComponent />
      
      <div className="mt-12 text-center">
        <p className="text-sm text-corporate-gray/70 mb-1">
          Esta aplicación requiere acceso al micrófono para funcionar correctamente
        </p>
        <p className="text-xs text-corporate-gray/60">
          Desarrollado por Sitemaster
        </p>
      </div>
    </main>
  );
}
