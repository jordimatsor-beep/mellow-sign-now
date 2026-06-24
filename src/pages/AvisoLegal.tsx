import { Link } from "react-router-dom";

export default function AvisoLegal() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold">Aviso Legal</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Información obligatoria conforme al Art. 10 de la Ley 34/2002 de Servicios de la
        Sociedad de la Información y de Comercio Electrónico (LSSI-CE)
      </p>

      <div className="prose prose-slate max-w-none text-slate-600 space-y-8">

        <section>
          <h2 className="text-xl font-semibold text-slate-800">1. Titular del sitio web</h2>
          <ul className="list-none space-y-1 mt-2">
            <li><strong>Denominación social:</strong> Operia Soluciones Inteligentes, S.L.</li>
            <li><strong>NIF/CIF:</strong> B26772665</li>
            <li>
              <strong>Domicilio social:</strong> Av. de les Corts Catalanes, 5,
              08173 Sant Cugat del Vallès (Barcelona), España
            </li>
            <li>
              <strong>Datos registrales:</strong> Inscrita en el Registro Mercantil de
              Barcelona — pendiente de completar con tomo, folio y hoja de inscripción
            </li>
            <li>
              <strong>Email:</strong>{" "}
              <a href="mailto:contacto@operiatech.es" className="text-blue-600 hover:underline">
                contacto@operiatech.es
              </a>
            </li>
            <li><strong>Teléfono:</strong> 936 940 749</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800">2. Objeto y ámbito de aplicación</h2>
          <p>
            El presente Aviso Legal regula el acceso y uso del sitio web{" "}
            <a href="https://firmaclara.es" className="text-blue-600 hover:underline">
              firmaclara.es
            </a>{" "}
            y sus subdominios, titularidad de Operia Soluciones Inteligentes, S.L.
            (en adelante, «FirmaClara» o «el titular»).
          </p>
          <p className="mt-2">
            El acceso y uso del sitio implica la aceptación plena y sin reservas del presente
            Aviso Legal. Si no estás de acuerdo con alguno de sus términos, te rogamos que no
            accedas ni utilices el sitio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800">3. Propiedad intelectual e industrial</h2>
          <p>
            Todos los contenidos del sitio web, incluyendo textos, imágenes, logotipos,
            iconos, código fuente y diseño gráfico, son propiedad exclusiva del titular o de
            sus licenciantes, y están protegidos por la legislación española e internacional
            de propiedad intelectual e industrial.
          </p>
          <p className="mt-2">
            Queda prohibida su reproducción, distribución, comunicación pública o
            transformación sin autorización expresa y por escrito del titular.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800">4. Condiciones de acceso y uso</h2>
          <p>
            El usuario se compromete a utilizar el sitio web de conformidad con la ley, la
            moral, las buenas costumbres y el orden público, y a no emplearlo para fines
            ilícitos o lesivos de derechos de terceros.
          </p>
          <p className="mt-2">
            El uso del servicio de firma electrónica se rige por los{" "}
            <Link to="/terms" className="text-blue-600 hover:underline">
              Términos y Condiciones de Uso
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800">5. Exclusión de garantías y responsabilidad</h2>
          <p>
            El titular no garantiza la disponibilidad ininterrumpida del sitio ni la ausencia
            de errores en sus contenidos. No se responsabiliza de los daños o perjuicios que
            pudieran derivarse del uso del sitio, de la imposibilidad de acceso al mismo, de
            los fallos en las transmisiones de datos o de las interrupciones del servicio por
            causas ajenas al control del titular.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800">6. Política de privacidad y cookies</h2>
          <p>
            El tratamiento de los datos personales recabados a través del sitio web se regula
            en la{" "}
            <Link to="/privacy" className="text-blue-600 hover:underline">
              Política de Privacidad
            </Link>{" "}
            y en la{" "}
            <Link to="/privacy#cookies" className="text-blue-600 hover:underline">
              Política de Cookies
            </Link>
            , de conformidad con el Reglamento (UE) 2016/679 (RGPD) y la LOPD-GDD 3/2018.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800">7. Ley aplicable y jurisdicción</h2>
          <p>
            El presente Aviso Legal se rige por la legislación española vigente. Para cualquier
            controversia derivada del acceso o uso del sitio web, las partes se someten, con
            renuncia expresa a cualquier otro fuero, a la jurisdicción de los Juzgados y
            Tribunales de Barcelona.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800">8. Modificaciones</h2>
          <p>
            El titular se reserva el derecho de modificar el presente Aviso Legal en cualquier
            momento. Los cambios serán efectivos desde su publicación en el sitio web. Se
            recomienda revisarlo periódicamente.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Última actualización: junio de 2026
          </p>
        </section>

      </div>
    </div>
  );
}
