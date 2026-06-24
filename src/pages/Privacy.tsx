import { Link } from "react-router-dom";

export default function Privacy() {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-16">
            <h1 className="mb-2 text-3xl font-bold">Política de Privacidad</h1>
            <p className="text-sm text-muted-foreground mb-10">Última actualización: junio de 2026</p>

            <div className="prose prose-slate max-w-none text-slate-600 space-y-8">

                {/* 1 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">1. Responsable del tratamiento</h2>
                    <p>
                        El responsable del tratamiento de tus datos personales es <strong>Operia Soluciones Inteligentes, S.L.</strong>, empresa titular de la plataforma <strong>FirmaClara</strong> (<a href="https://firmaclara.es" className="text-blue-600 hover:underline">firmaclara.es</a>).
                    </p>
                    <ul className="list-none space-y-1 mt-2">
                        <li><strong>Denominación social:</strong> Operia Soluciones Inteligentes, S.L.</li>
                        <li><strong>NIF/CIF:</strong> B26772665</li>
                        <li><strong>Domicilio:</strong> Av. de les Corts Catalanes, 5, 08173 Sant Cugat del Vallès (Barcelona), España</li>
                        <li><strong>Email de contacto:</strong> <a href="mailto:hola@firmaclara.es" className="text-blue-600 hover:underline">hola@firmaclara.es</a></li>
                        <li><strong>Delegado de Protección de Datos (DPD):</strong> <a href="mailto:dpo@firmaclara.es" className="text-blue-600 hover:underline">dpo@firmaclara.es</a></li>
                    </ul>
                </section>

                {/* 2 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">2. Datos que tratamos y base legal</h2>
                    <p>Tratamos tus datos personales para las siguientes finalidades y con las bases legales indicadas (Reglamento (UE) 2016/679 — RGPD y Ley Orgánica 3/2018 de Protección de Datos Personales — LOPD-GDD):</p>

                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Finalidad</th>
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Datos tratados</th>
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Base legal (RGPD)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="p-2 border border-slate-200">Gestión de cuenta y acceso al servicio</td>
                                    <td className="p-2 border border-slate-200">Nombre, email, contraseña (hash), empresa</td>
                                    <td className="p-2 border border-slate-200">Art. 6.1.b — ejecución del contrato</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200">Firma electrónica y evidencias legales</td>
                                    <td className="p-2 border border-slate-200">Nombre del firmante, email, teléfono, IP, hash del documento, marca de tiempo TSA, user agent</td>
                                    <td className="p-2 border border-slate-200">Art. 6.1.b — ejecución del contrato; Art. 6.1.c — obligación legal (eIDAS, Ley 6/2020)</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200">Verificación OTP (autenticación del firmante)</td>
                                    <td className="p-2 border border-slate-200">Número de teléfono, código OTP (almacenado en hash)</td>
                                    <td className="p-2 border border-slate-200">Art. 6.1.b — ejecución del contrato</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200">Procesamiento de pagos</td>
                                    <td className="p-2 border border-slate-200">Datos de tarjeta procesados directamente por Stripe (no accedemos a datos de tarjeta)</td>
                                    <td className="p-2 border border-slate-200">Art. 6.1.b — ejecución del contrato; Art. 6.1.c — obligación legal</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200">Comunicaciones transaccionales (email/SMS)</td>
                                    <td className="p-2 border border-slate-200">Email, nombre, contenido relacionado con el documento</td>
                                    <td className="p-2 border border-slate-200">Art. 6.1.b — ejecución del contrato</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200">Asistente IA (Clara)</td>
                                    <td className="p-2 border border-slate-200">Mensajes de chat, consultas de usuario</td>
                                    <td className="p-2 border border-slate-200">Art. 6.1.b — ejecución del contrato; o Art. 6.1.a — consentimiento</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200">Análisis de uso (Microsoft Clarity)</td>
                                    <td className="p-2 border border-slate-200">Comportamiento en el sitio web, grabaciones de sesión, mapas de calor, dirección IP anonimizada</td>
                                    <td className="p-2 border border-slate-200">Art. 6.1.a — <strong>consentimiento</strong> (cookies analíticas)</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200">Monitorización de errores (Sentry)</td>
                                    <td className="p-2 border border-slate-200">Stack traces, URL de la página, user agent, IP</td>
                                    <td className="p-2 border border-slate-200">Art. 6.1.a — <strong>consentimiento</strong> (cookies analíticas)</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200">Registro de actividad y seguridad (logs)</td>
                                    <td className="p-2 border border-slate-200">Tipo de evento, marca de tiempo, email del usuario</td>
                                    <td className="p-2 border border-slate-200">Art. 6.1.f — interés legítimo (seguridad del servicio)</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200">Programa de afiliados</td>
                                    <td className="p-2 border border-slate-200">Código de referido, comisiones, IBAN (para solicitudes de pago)</td>
                                    <td className="p-2 border border-slate-200">Art. 6.1.b — ejecución del contrato</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 3 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">3. Encargados del tratamiento y transferencias internacionales</h2>
                    <p>
                        Para prestar el servicio, contamos con los siguientes encargados del tratamiento. Algunos de ellos están ubicados fuera del Espacio Económico Europeo (EEE); en esos casos, la transferencia se ampara en las <strong>Cláusulas Contractuales Tipo (CCT)</strong> aprobadas por la Comisión Europea (Decisión 2021/914) y/o en la adhesión del proveedor al <strong>Marco de Privacidad de Datos UE-EE. UU. (EU-U.S. Data Privacy Framework)</strong>.
                    </p>

                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Proveedor</th>
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Servicio</th>
                                    <th className="text-left p-2 border border-slate-200 font-semibold">País</th>
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Garantía de transferencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="p-2 border border-slate-200">Supabase, Inc.</td>
                                    <td className="p-2 border border-slate-200">Base de datos, autenticación, almacenamiento</td>
                                    <td className="p-2 border border-slate-200">EE. UU.</td>
                                    <td className="p-2 border border-slate-200">CCT</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200">Stripe, Inc.</td>
                                    <td className="p-2 border border-slate-200">Procesamiento de pagos</td>
                                    <td className="p-2 border border-slate-200">EE. UU.</td>
                                    <td className="p-2 border border-slate-200">CCT + EU-U.S. DPF</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200">Google LLC</td>
                                    <td className="p-2 border border-slate-200">Google Gemini (asistente IA Clara), Google Fonts</td>
                                    <td className="p-2 border border-slate-200">EE. UU.</td>
                                    <td className="p-2 border border-slate-200">CCT + EU-U.S. DPF</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200">Microsoft Corporation</td>
                                    <td className="p-2 border border-slate-200">Microsoft Clarity (análisis de uso)</td>
                                    <td className="p-2 border border-slate-200">EE. UU.</td>
                                    <td className="p-2 border border-slate-200">CCT + EU-U.S. DPF</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200">Functional Software, Inc. (Sentry)</td>
                                    <td className="p-2 border border-slate-200">Monitorización de errores</td>
                                    <td className="p-2 border border-slate-200">EE. UU.</td>
                                    <td className="p-2 border border-slate-200">CCT</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200">n8n GmbH</td>
                                    <td className="p-2 border border-slate-200">Automatización de flujos y notificaciones</td>
                                    <td className="p-2 border border-slate-200">Alemania (UE)</td>
                                    <td className="p-2 border border-slate-200">Dentro del EEE</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200">Twilio, Inc.</td>
                                    <td className="p-2 border border-slate-200">Envío de SMS/WhatsApp (OTP)</td>
                                    <td className="p-2 border border-slate-200">EE. UU.</td>
                                    <td className="p-2 border border-slate-200">CCT</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200">Vercel, Inc.</td>
                                    <td className="p-2 border border-slate-200">Alojamiento web (frontend)</td>
                                    <td className="p-2 border border-slate-200">EE. UU.</td>
                                    <td className="p-2 border border-slate-200">CCT</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200">Resend, Inc.</td>
                                    <td className="p-2 border border-slate-200">Envío de emails transaccionales</td>
                                    <td className="p-2 border border-slate-200">EE. UU.</td>
                                    <td className="p-2 border border-slate-200">CCT</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200">FreeTSA</td>
                                    <td className="p-2 border border-slate-200">Autoridad de sellado de tiempo (TSA, RFC 3161)</td>
                                    <td className="p-2 border border-slate-200">UE</td>
                                    <td className="p-2 border border-slate-200">Dentro del EEE</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-3 text-sm">
                        Puedes solicitar una copia de las garantías de transferencia aplicables escribiendo a <a href="mailto:dpo@firmaclara.es" className="text-blue-600 hover:underline">dpo@firmaclara.es</a>.
                    </p>
                </section>

                {/* 4 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">4. Plazos de conservación</h2>
                    <ul className="list-disc pl-6 space-y-1">
                        <li><strong>Evidencias de firma y Audit Trail:</strong> mínimo 5 años (obligación legal bajo eIDAS y Ley 6/2020). En caso de litigio, hasta la resolución final.</li>
                        <li><strong>Datos de cuenta:</strong> durante la vigencia del contrato y 3 años adicionales desde la baja, para atender posibles reclamaciones.</li>
                        <li><strong>Datos de pago:</strong> según exigencias fiscales y contables (mínimo 5 años, Art. 30 CCo).</li>
                        <li><strong>Conversaciones con Clara (IA):</strong> 12 meses desde la última interacción.</li>
                        <li><strong>Datos de análisis (Clarity):</strong> hasta 13 meses (según política de Microsoft Clarity), salvo que retires el consentimiento antes.</li>
                        <li><strong>Logs de actividad y seguridad:</strong> 3 años.</li>
                    </ul>
                </section>

                {/* 5 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">5. Tus derechos</h2>
                    <p>De acuerdo con los artículos 15 a 22 del RGPD y los artículos 15 a 19 de la LOPD-GDD, puedes ejercer en cualquier momento los siguientes derechos:</p>
                    <ul className="list-disc pl-6 space-y-1 mt-2">
                        <li><strong>Acceso</strong> — Obtener confirmación de si tratamos tus datos y una copia de ellos.</li>
                        <li><strong>Rectificación</strong> — Corregir datos inexactos o incompletos.</li>
                        <li><strong>Supresión</strong> ("derecho al olvido") — Solicitar la eliminación de tus datos cuando, entre otros motivos, ya no sean necesarios para la finalidad para la que se recogieron. Ten en cuenta que algunos datos deben conservarse por obligación legal (evidencias de firma).</li>
                        <li><strong>Oposición</strong> — Oponerte al tratamiento basado en interés legítimo.</li>
                        <li><strong>Limitación del tratamiento</strong> — Solicitar que suspendamos temporalmente el tratamiento.</li>
                        <li><strong>Portabilidad</strong> — Recibir tus datos en un formato estructurado y legible por máquina. Puedes exportar todos tus datos desde Ajustes → Exportar datos.</li>
                        <li><strong>Retirada del consentimiento</strong> — Retirar en cualquier momento el consentimiento prestado (por ejemplo, para cookies analíticas), sin que ello afecte a la licitud del tratamiento previo.</li>
                        <li><strong>Decisiones automatizadas</strong> — No tomamos decisiones con efectos jurídicos significativos basadas exclusivamente en tratamiento automatizado.</li>
                    </ul>
                    <p className="mt-3">
                        Para ejercer cualquiera de estos derechos, escríbenos a <a href="mailto:support@firmaclara.es" className="text-blue-600 hover:underline">support@firmaclara.es</a> indicando tu nombre, email de registro y el derecho que deseas ejercer. Responderemos en el plazo máximo de un mes (prorrogable otros dos meses en casos complejos).
                    </p>
                    <p className="mt-2">
                        Si consideras que el tratamiento de tus datos vulnera la normativa, tienes derecho a presentar una reclamación ante la{' '}
                        <strong>Agencia Española de Protección de Datos (AEPD)</strong>:{' '}
                        <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.aepd.es</a>.
                    </p>
                </section>

                {/* 6 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">6. Asistente de inteligencia artificial (Clara)</h2>
                    <p>
                        El asistente Clara es una herramienta de inteligencia artificial conversacional. En cumplimiento del{' '}
                        <strong>Reglamento (UE) 2024/1689 de Inteligencia Artificial (Reglamento IA, Art. 52)</strong> y del Considerando 133 del RGPD, te informamos de que:
                    </p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>Clara está impulsada por <strong>Google Gemini 1.5 Flash</strong>, un modelo de lenguaje de gran tamaño (LLM) desarrollado por Google LLC.</li>
                        <li>Cuando interactúas con Clara, tus mensajes se envían a Google para generar la respuesta. Google actúa como encargado del tratamiento bajo contrato con Cláusulas Contractuales Tipo.</li>
                        <li>Las respuestas de Clara son generadas por IA y pueden contener errores. No constituyen asesoramiento legal ni jurídico. Siempre contrasta la información importante con un profesional.</li>
                        <li>No tomamos decisiones con efectos jurídicos sobre tu persona basadas exclusivamente en los resultados de Clara.</li>
                    </ul>
                </section>

                {/* 7 */}
                <section id="cookies">
                    <h2 className="text-xl font-semibold text-slate-800">7. Cookies</h2>
                    <p>Utilizamos cookies y tecnologías similares. Puedes gestionar tus preferencias en el panel de cookies que aparece al acceder por primera vez o desde{' '}
                        <button
                            onClick={() => {
                                localStorage.removeItem('firmaclara_cookie_consent');
                                window.location.reload();
                            }}
                            className="text-blue-600 hover:underline cursor-pointer"
                        >
                            aquí (resetear preferencias de cookies)
                        </button>.
                    </p>

                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Cookie / Tecnología</th>
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Proveedor</th>
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Categoría</th>
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Finalidad</th>
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Duración</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="p-2 border border-slate-200 font-mono text-xs">sb-* (Supabase)</td>
                                    <td className="p-2 border border-slate-200">Supabase</td>
                                    <td className="p-2 border border-slate-200">Necesaria</td>
                                    <td className="p-2 border border-slate-200">Gestión de sesión autenticada</td>
                                    <td className="p-2 border border-slate-200">Sesión / 1 año</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200 font-mono text-xs">firmaclara_cookie_consent</td>
                                    <td className="p-2 border border-slate-200">FirmaClara</td>
                                    <td className="p-2 border border-slate-200">Necesaria</td>
                                    <td className="p-2 border border-slate-200">Almacena tus preferencias de cookies (localStorage)</td>
                                    <td className="p-2 border border-slate-200">Permanente</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200 font-mono text-xs">_clck, _clsk, CLID, MUID</td>
                                    <td className="p-2 border border-slate-200">Microsoft Clarity</td>
                                    <td className="p-2 border border-slate-200">Analítica</td>
                                    <td className="p-2 border border-slate-200">Grabaciones de sesión, mapas de calor, análisis de comportamiento</td>
                                    <td className="p-2 border border-slate-200">Hasta 13 meses</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200 font-mono text-xs">sentry-*</td>
                                    <td className="p-2 border border-slate-200">Sentry</td>
                                    <td className="p-2 border border-slate-200">Analítica</td>
                                    <td className="p-2 border border-slate-200">Registro de errores técnicos y rendimiento</td>
                                    <td className="p-2 border border-slate-200">Sesión / 90 días</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 8 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">8. Acceso del equipo de soporte</h2>
                    <p>
                        El personal autorizado de Operia Soluciones Inteligentes, S.L. (soporte técnico y administración) puede acceder a los datos de tu cuenta (nombre, email, créditos, estadísticas de uso) con la única finalidad de prestarte asistencia o resolver incidencias técnicas. Este acceso está auditado mediante logs de actividad y se basa en el Art. 6.1.f RGPD (interés legítimo para la prestación del servicio). El personal de soporte <strong>no puede acceder</strong> al contenido de tus documentos ni a tus conversaciones con Clara.
                    </p>
                </section>

                {/* 9 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">9. Seguridad</h2>
                    <p>
                        Aplicamos medidas técnicas y organizativas apropiadas para proteger tus datos (Art. 32 RGPD), incluyendo cifrado TLS en tránsito, almacenamiento cifrado en reposo, control de acceso basado en roles, y sellado de tiempo con autoridades TSA reconocidas para garantizar la integridad de las evidencias de firma.
                    </p>
                </section>

                {/* 10 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">10. Encargados del tratamiento y transferencias internacionales</h2>
                    <p>
                        Para prestar el servicio, FirmaClara utiliza los siguientes encargados del tratamiento (Art. 28 RGPD).
                        Las transferencias a países fuera del Espacio Económico Europeo (EEE) se amparan en las
                        Cláusulas Contractuales Tipo (CCT) aprobadas por la Comisión Europea o en la decisión de
                        adecuación del Data Privacy Framework UE-EE. UU., según se indica.
                    </p>
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Proveedor</th>
                                    <th className="text-left p-2 border border-slate-200 font-semibold">País</th>
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Finalidad</th>
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Datos transferidos</th>
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Base legal (Art. 46 RGPD)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="p-2 border border-slate-200 font-medium">Supabase</td>
                                    <td className="p-2 border border-slate-200">EE. UU. / AWS eu-west-1</td>
                                    <td className="p-2 border border-slate-200">Base de datos, autenticación, almacenamiento</td>
                                    <td className="p-2 border border-slate-200">Todos los datos de cuenta y documentos</td>
                                    <td className="p-2 border border-slate-200">CCT (art. 46.2.c)</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200 font-medium">Stripe</td>
                                    <td className="p-2 border border-slate-200">EE. UU.</td>
                                    <td className="p-2 border border-slate-200">Procesamiento de pagos</td>
                                    <td className="p-2 border border-slate-200">Email, datos de pago (tokenizados)</td>
                                    <td className="p-2 border border-slate-200">CCT + Data Privacy Framework</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200 font-medium">Google (Gemini API)</td>
                                    <td className="p-2 border border-slate-200">EE. UU.</td>
                                    <td className="p-2 border border-slate-200">Asistente IA Clara (generación de texto)</td>
                                    <td className="p-2 border border-slate-200">Contenido de mensajes al asistente</td>
                                    <td className="p-2 border border-slate-200">CCT + Data Privacy Framework</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200 font-medium">Microsoft Clarity</td>
                                    <td className="p-2 border border-slate-200">EE. UU.</td>
                                    <td className="p-2 border border-slate-200">Analítica web (solo con consentimiento)</td>
                                    <td className="p-2 border border-slate-200">Interacciones de sesión (comportamiento)</td>
                                    <td className="p-2 border border-slate-200">CCT + Data Privacy Framework</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200 font-medium">Sentry</td>
                                    <td className="p-2 border border-slate-200">EE. UU.</td>
                                    <td className="p-2 border border-slate-200">Monitorización de errores (solo con consentimiento)</td>
                                    <td className="p-2 border border-slate-200">Datos técnicos de error, URL, user agent</td>
                                    <td className="p-2 border border-slate-200">CCT</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200 font-medium">Twilio</td>
                                    <td className="p-2 border border-slate-200">EE. UU.</td>
                                    <td className="p-2 border border-slate-200">Envío de OTP por SMS/WhatsApp</td>
                                    <td className="p-2 border border-slate-200">Número de teléfono del firmante</td>
                                    <td className="p-2 border border-slate-200">CCT + Data Privacy Framework</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200 font-medium">Vercel</td>
                                    <td className="p-2 border border-slate-200">EE. UU. / CDN global</td>
                                    <td className="p-2 border border-slate-200">Hosting y CDN de la aplicación web</td>
                                    <td className="p-2 border border-slate-200">IPs, logs de acceso</td>
                                    <td className="p-2 border border-slate-200">CCT</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200 font-medium">Resend</td>
                                    <td className="p-2 border border-slate-200">EE. UU.</td>
                                    <td className="p-2 border border-slate-200">Envío de emails transaccionales</td>
                                    <td className="p-2 border border-slate-200">Email del remitente y firmante, nombre</td>
                                    <td className="p-2 border border-slate-200">CCT</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200 font-medium">FreeTSA</td>
                                    <td className="p-2 border border-slate-200">UE (Bélgica)</td>
                                    <td className="p-2 border border-slate-200">Sellado de tiempo RFC 3161</td>
                                    <td className="p-2 border border-slate-200">Hash del documento firmado</td>
                                    <td className="p-2 border border-slate-200">Sin transferencia fuera del EEE</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-4 text-sm">
                        Puedes solicitar copia de las CCT vigentes escribiendo a{' '}
                        <a href="mailto:dpo@firmaclara.es" className="text-blue-600 hover:underline">
                            dpo@firmaclara.es
                        </a>
                        .
                    </p>
                </section>

                {/* 11 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">11. Cambios en esta política</h2>

                    <p>
                        Podemos actualizar esta política cuando sea necesario (cambios normativos, nuevos proveedores, nuevas funcionalidades). Te notificaremos por email con al menos 15 días de antelación si los cambios afectan sustancialmente al tratamiento de tus datos. La fecha de última actualización siempre figura en la cabecera de este documento.
                    </p>
                </section>

                <p className="text-sm text-slate-400 pt-4 border-t">
                    Esta política cumple con el Reglamento (UE) 2016/679 (RGPD), la Ley Orgánica 3/2018 (LOPD-GDD), la Ley 34/2002 (LSSI) y el Reglamento (UE) 2024/1689 (Reglamento IA).
                </p>
            </div>
        </div>
    );
}
