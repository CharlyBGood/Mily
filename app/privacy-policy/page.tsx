import HeaderBar from "@/components/header-bar";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <HeaderBar backHref="/profile" ariaLabel="Volver" />
      <main className="max-w-2xl mx-auto p-6 text-gray-800">
        <h1 className="text-2xl font-bold mb-2">
          Política de Privacidad de Mily
        </h1>
        <p className="mb-4 text-sm text-gray-500">
          Última actualización: 7 de julio de 2025
        </p>
        <p className="mb-4">
          Bienvenido a Mily (“nosotros”, “nuestro”). Esta Política explica cómo
          recopilamos, usamos, protegemos y eliminamos tus datos cuando utilizás
          nuestra webapp para seguimiento alimenticio.
        </p>
        <h2 className="text-lg font-semibold mt-6 mb-2">
          1. Responsable del tratamiento
        </h2>
        <ul className="mb-4 list-disc pl-6">
          <li>App: Mily</li>
          <li>Desarrollador: SinapsiaLab</li>
          <li>Ubicación: Argentina/Uruguay</li>
        </ul>
        <h2 className="text-lg font-semibold mt-6 mb-2">
          2. Datos que recopilamos
        </h2>
        <ul className="mb-4 list-disc pl-6">
          <li>
            Cuenta de usuario: correo electrónico y nombre (provenientes del
            inicio de sesión con Google).
          </li>
          <li>Fotos de comidas: capturadas vía cámara, almacenadas en Supabase.</li>
          <li>Datos técnicos mínimos: fecha/hora de subida.</li>
        </ul>
        <h2 className="text-lg font-semibold mt-6 mb-2">
          3. Finalidad del uso
        </h2>
        <ul className="mb-4 list-disc pl-6">
          <li>Crear y gestionar tu cuenta.</li>
          <li>Permitirte guardar y visualizar fotos de tus comidas.</li>
          <li>Mantener y facilitar tu historial alimenticio.</li>
        </ul>
        <h2 className="text-lg font-semibold mt-6 mb-2">
          4. Cómo se almacenan y conservan
        </h2>
        <ul className="mb-4 list-disc pl-6">
          <li>Las fotos se guardan en Supabase por un máximo de 1 año.</li>
          <li>
            Cuando borrás una foto desde tu dispositivo o eliminás tu cuenta, esa
            foto y todos tus datos se eliminan automáticamente de nuestra base de
            datos.
          </li>
        </ul>
        <h2 className="text-lg font-semibold mt-6 mb-2">5. Compartición de datos</h2>
        <ul className="mb-4 list-disc pl-6">
          <li>No vendemos ni compartimos tus datos con terceros.</li>
          <li>Supabase actúa únicamente como proveedor de almacenamiento.</li>
        </ul>
        <h2 className="text-lg font-semibold mt-6 mb-2">6. Seguridad</h2>
        <ul className="mb-4 list-disc pl-6">
          <li>Utilizamos HTTPS para transmisión segura.</li>
          <li>
            Los datos están protegidos mediante controles de acceso y almacenamiento
            seguro en servidores.
          </li>
        </ul>
        <h2 className="text-lg font-semibold mt-6 mb-2">7. Tus derechos</h2>
        <ul className="mb-4 list-disc pl-6">
          <li>Podés eliminar fotos individuales en cualquier momento.</li>
          <li>
            Podés cancelar tu cuenta, lo cual elimina tus fotos, correo y nombre de
            forma permanente.
          </li>
          <li>Luego de la eliminación, no conservamos copia alguna.</li>
        </ul>
        <h2 className="text-lg font-semibold mt-6 mb-2">8. Cambios en esta política</h2>
        <ul className="mb-4 list-disc pl-6">
          <li>Revisaremos y actualizaremos esta política según sea necesario.</li>
          <li>Cualquier cambio se reflejará con la fecha de revisión.</li>
          <li>Te recomendamos revisarla periódicamente.</li>
        </ul>
        <h2 className="text-lg font-semibold mt-6 mb-2">9. Contacto</h2>
        <ul className="mb-4 list-disc pl-6">
          <li>
            Para consultas o ejercicio de tus derechos, escribinos a:
            [bonavita.carlos@gmail.com]
          </li>
        </ul>
        <h2 className="text-lg font-semibold mt-6 mb-2">Consentimiento</h2>
        <p>
          Al usar Mily, aceptás esta Política de Privacidad con conocimiento de
          cómo se manejan tus datos.
        </p>
      </main>
    </div>
  );
}
