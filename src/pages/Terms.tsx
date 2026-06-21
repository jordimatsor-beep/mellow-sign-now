export default function Terms() {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-16">
            <h1 className="mb-2 text-3xl font-bold">Términos y Condiciones de Uso</h1>
            <p className="text-sm text-muted-foreground mb-10">Última actualización: junio de 2026</p>

            <div className="prose prose-slate max-w-none text-slate-600 space-y-8">

                {/* Art. 10 LSSI — Datos identificativos obligatorios */}
                <section className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-800 mb-3">Información del prestador de servicios (Art. 10 LSSI)</h2>
                    <p className="text-sm mb-2">
                        En cumplimiento de la <strong>Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI)</strong>, ponemos a tu disposición los datos identificativos del titular de este sitio web:
                    </p>
                    <ul className="list-none space-y-1 text-sm">
                        <li><strong>Denominación social:</strong> Operia Soluciones Inteligentes, S.L.</li>
                        <li><strong>NIF/CIF:</strong> B26772665</li>
                        <li><strong>Domicilio social:</strong> Av. de les Corts Catalanes, 5, 08173 Sant Cugat del Vallès (Barcelona), España</li>
                        <li><strong>Email de contacto:</strong> <a href="mailto:hola@firmaclara.es" className="text-blue-600 hover:underline">hola@firmaclara.es</a></li>
                        <li><strong>Inscripción Registro Mercantil:</strong> Registro Mercantil de Barcelona</li>
                        <li><strong>Sitio web:</strong> <a href="https://firmaclara.es" className="text-blue-600 hover:underline">https://firmaclara.es</a></li>
                    </ul>
                </section>

                {/* 1 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">1. Objeto y ámbito de aplicación</h2>
                    <p>
                        Los presentes Términos y Condiciones regulan el acceso y uso de la plataforma <strong>FirmaClara</strong>, un servicio de firma electrónica simple conforme al Reglamento (UE) 910/2014 (eIDAS) y a la Ley 6/2020, de 11 de noviembre, reguladora de determinados aspectos de los servicios electrónicos de confianza.
                    </p>
                    <p className="mt-2">
                        Al registrarte o usar el servicio, aceptas íntegramente estos Términos. Si no estás de acuerdo con alguno de ellos, no debes utilizar FirmaClara.
                    </p>
                </section>

                {/* 2 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">2. Condiciones de acceso</h2>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>El servicio está dirigido a personas mayores de 18 años con plena capacidad de obrar.</li>
                        <li>Es necesario registrarse y mantener una cuenta activa para enviar documentos.</li>
                        <li>Eres responsable de mantener la confidencialidad de tus credenciales de acceso.</li>
                        <li>Queda prohibido el uso del servicio para fines ilícitos, fraudulentos o contrarios a la buena fe.</li>
                    </ul>
                </section>

                {/* 3 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">3. Planes, precios e IVA</h2>
                    <p>Los precios indicados son en euros. Los planes de suscripción mensual se muestran <strong>sin IVA</strong>; el IVA aplicable (21 % en España) se añadirá en el proceso de pago.</p>

                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Plan</th>
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Precio</th>
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Incluye</th>
                                    <th className="text-left p-2 border border-slate-200 font-semibold">Exceso (overage)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="p-2 border border-slate-200">Gratuito</td>
                                    <td className="p-2 border border-slate-200">0 €/mes</td>
                                    <td className="p-2 border border-slate-200">2 firmas/mes</td>
                                    <td className="p-2 border border-slate-200">No disponible</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200">Básico</td>
                                    <td className="p-2 border border-slate-200">9,00 €/mes + IVA</td>
                                    <td className="p-2 border border-slate-200">10 firmas/mes</td>
                                    <td className="p-2 border border-slate-200">No disponible</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-200">Profesional</td>
                                    <td className="p-2 border border-slate-200">19,00 €/mes + IVA</td>
                                    <td className="p-2 border border-slate-200">50 firmas/mes</td>
                                    <td className="p-2 border border-slate-200">0,40 €/firma adicional + IVA</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="p-2 border border-slate-200">Pack puntual</td>
                                    <td className="p-2 border border-slate-200">15,00 € + IVA (pago único)</td>
                                    <td className="p-2 border border-slate-200">15 firmas sin caducidad</td>
                                    <td className="p-2 border border-slate-200">—</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-3 text-sm">
                        Los créditos incluidos en los planes mensuales se renuevan cada ciclo de facturación y no se acumulan. Los créditos del Pack puntual no caducan nunca.
                    </p>
                </section>

                {/* 4 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">4. Facturación y renovación</h2>
                    <p>
                        Los planes de suscripción se facturan mensualmente mediante el procesador de pagos <strong>Stripe</strong>. La suscripción se renueva automáticamente salvo que la canceles antes de la fecha de renovación.
                        Puedes cancelar en cualquier momento desde Ajustes → Suscripción; seguirás teniendo acceso al servicio hasta el final del período pagado.
                    </p>
                </section>

                {/* 5 — Desistimiento */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">5. Derecho de desistimiento</h2>
                    <p>
                        De conformidad con el <strong>Real Decreto Legislativo 1/2007 (TRLGDCU), Art. 102 y siguientes</strong>, tienes derecho a desistir del contrato en un plazo de <strong>14 días naturales</strong> desde la contratación, sin necesidad de justificación.
                    </p>
                    <p className="mt-2">
                        No obstante, de acuerdo con el Art. 103.a) TRLGDCU, <strong>pierdes el derecho de desistimiento</strong> si has dado tu consentimiento expreso para que el servicio comience a ejecutarse antes de que expire dicho plazo y reconoces que, una vez ejecutado el servicio, habrás perdido el derecho de desistimiento.
                    </p>
                    <p className="mt-2">
                        Para ejercer el derecho de desistimiento, notifícanos dentro del plazo a <a href="mailto:hola@firmaclara.es" className="text-blue-600 hover:underline">hola@firmaclara.es</a> indicando tu decisión mediante una declaración inequívoca.
                    </p>
                </section>

                {/* 6 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">6. Marco legal de la firma electrónica</h2>
                    <p>
                        Las firmas procesadas a través de FirmaClara son <strong>firmas electrónicas simples</strong> conforme al Reglamento (UE) 910/2014 (eIDAS) y a la Ley 6/2020. En virtud del Art. 25 eIDAS:
                    </p>
                    <blockquote className="border-l-4 border-slate-300 pl-4 italic my-3 text-slate-500">
                        «No se denegarán efectos jurídicos ni admisibilidad como prueba en procedimientos judiciales a una firma electrónica por el mero hecho de ser electrónica.»
                    </blockquote>
                    <p>
                        Para cada documento firmado generamos un <strong>Certificado de Evidencias (Audit Trail)</strong> que incluye: hash SHA-256 del documento, registro de envío y apertura, código OTP verificado, dirección IP del firmante, user agent, y sellado de tiempo TSA (RFC 3161) mediante autoridades reconocidas.
                    </p>
                </section>

                {/* 7 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">7. Inteligencia Artificial — Clara</h2>
                    <p>
                        FirmaClara incluye el asistente <strong>Clara</strong>, impulsado por <strong>Google Gemini 1.5 Flash</strong> (Google LLC, EE. UU.). En cumplimiento del <strong>Reglamento (UE) 2024/1689 de Inteligencia Artificial, Art. 52</strong>, te informamos de que Clara es un sistema de IA conversacional.
                    </p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>Las respuestas de Clara son generadas por IA y pueden contener imprecisiones.</li>
                        <li>Clara no proporciona asesoramiento legal. Para cuestiones jurídicas, consulta a un profesional.</li>
                        <li>Tus mensajes se transmiten a Google para generar respuestas; consulta el apartado de privacidad para más detalles.</li>
                    </ul>
                </section>

                {/* 8 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">8. Propiedad intelectual</h2>
                    <p>
                        Todo el contenido del sitio web (marca, diseño, software, textos e imágenes) es propiedad de Operia Soluciones Inteligentes, S.L. o de sus licenciantes y está protegido por las leyes de propiedad intelectual e industrial. El usuario adquiere únicamente una licencia de uso limitada, personal, no exclusiva e intransferible para utilizar el servicio.
                    </p>
                    <p className="mt-2">
                        Tú eres el propietario de los documentos que cargas y de las firmas que recibes. Operia Soluciones Inteligentes, S.L. no reivindica ningún derecho sobre el contenido de tus documentos.
                    </p>
                </section>

                {/* 9 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">9. Limitación de responsabilidad</h2>
                    <p>
                        FirmaClara proporciona el servicio «tal cual» y con disponibilidad razonable. No garantizamos disponibilidad ininterrumpida. No nos responsabilizamos de los daños derivados del uso incorrecto del servicio, de fallos atribuibles a terceros (operadores de telecomunicaciones, proveedores de cloud), ni de circunstancias de fuerza mayor.
                    </p>
                    <p className="mt-2">
                        La validez jurídica de una firma depende de los requisitos aplicables al acto concreto que se formaliza. FirmaClara no presta asesoramiento legal; consulta a un profesional si tienes dudas sobre la idoneidad de la firma electrónica simple para tu caso.
                    </p>
                </section>

                {/* 10 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">10. Modificación de los términos</h2>
                    <p>
                        Podemos modificar estos Términos en cualquier momento. Te notificaremos por email con al menos <strong>15 días de antelación</strong> antes de que entren en vigor los cambios materiales. Si no estás de acuerdo, podrás cancelar tu suscripción antes de la fecha de entrada en vigor sin coste adicional. El uso continuado del servicio después de esa fecha implica la aceptación de los nuevos Términos.
                    </p>
                </section>

                {/* 11 */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-800">11. Ley aplicable y jurisdicción</h2>
                    <p>
                        Estos Términos se rigen por la legislación española, en particular la LSSI (Ley 34/2002), el TRLGDCU (Real Decreto Legislativo 1/2007), el Reglamento eIDAS (UE 910/2014) y el Código Civil.
                    </p>
                    <p className="mt-2">
                        Para la resolución de cualquier controversia derivada de estos Términos, las partes se someten a los juzgados y tribunales de <strong>Barcelona</strong>, renunciando expresamente a cualquier otro fuero que pudiera corresponderles, salvo cuando la normativa de protección al consumidor establezca otro fuero imperativo.
                    </p>
                    <p className="mt-2">
                        Para conflictos de consumo en línea, puedes acceder a la plataforma de resolución alternativa de la Comisión Europea:{' '}
                        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            https://ec.europa.eu/consumers/odr
                        </a>.
                    </p>
                </section>

                <p className="text-sm text-slate-400 pt-4 border-t">
                    Estos Términos cumplen con la Ley 34/2002 (LSSI), el Real Decreto Legislativo 1/2007 (TRLGDCU), el Reglamento (UE) 910/2014 (eIDAS), la Ley 6/2020 y el Reglamento (UE) 2024/1689 (Reglamento IA).
                </p>
            </div>
        </div>
    );
}
