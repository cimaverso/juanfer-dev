from html import escape
from typing import Optional

# Paleta fija del correo (no son tokens de frontend -- ese correo lo abre
# un cliente de correo, no el navegador del admin, así que no aplica la
# regla de CLAUDE.md de tokens de global.css). Tabla + estilos inline a
# propósito: es lo único que renderiza bien parejo en Outlook/Gmail/etc.
_COLOR_HEADER = "#13324a"
_COLOR_ACENTO = "#2f7fb3"
_COLOR_FONDO = "#eef1f4"
_COLOR_TARJETA = "#ffffff"
_COLOR_BORDE = "#e3e8ec"
_COLOR_TEXTO = "#1f2b36"
_COLOR_TEXTO_SUAVE = "#5b6b78"
_COLOR_GRUPO_FONDO = "#eaf3fa"

# Mismos colores del monograma real (frontend/public/favicon.svg, usado
# como favicon y en Login). Se replica como insignia CSS en vez de
# incrustar el SVG/una imagen: Outlook y buena parte de Gmail no
# renderizan <svg> inline de forma confiable en correos, y así tampoco
# depende de que exista una URL pública con el archivo -- si más
# adelante hay un logo real alojado públicamente, es cambiar esta
# insignia por un <img src="...">.
_COLOR_LOGO_FONDO = "#1B2A4A"
_COLOR_LOGO_TEXTO = "#3B6CB7"

# Mismo marcador reservado que BranchingCodigos.FIN / la lectura de
# páginas de FormularioPublico.jsx -- aquí no se usa para saltar nada,
# solo para identificar qué preguntas son encabezados de sección.
_TIPO_SECCION = "seccion"


def construir_html(
    formulario_titulo: str,
    estructura: dict,
    respuestas: dict,
    cliente_nombre: Optional[str],
    cliente_documento: Optional[str],
) -> str:
    """
    Maqueta el correo de notificación de una respuesta de formulario,
    fiel a cómo el usuario público lo vio: mismo orden real (preguntas
    sueltas y grupos repetibles intercalados por `orden`, igual que
    `construirEntradas` en FormularioPublico.jsx) y mismos cortes de
    sección (una pregunta tipo "seccion" cierra la sección anterior y
    abre una nueva con su título/subtítulo, igual que
    `construirPaginas`). Lee los valores desde `respuestas` (mismo
    formato que envía el público: valor plano por `codigo` para
    preguntas sueltas, lista de dicts por `codigo` de grupo para
    repeticiones). No valida ni transforma tipos -- es solo lectura
    para mostrar, la validación real ya ocurrió al guardar la respuesta.
    """
    secciones = _construir_secciones(estructura)
    mostrar_divisores = len(secciones) > 1

    cuerpo = []
    numero_pregunta = 0

    for i, seccion in enumerate(secciones, start=1):
        if mostrar_divisores:
            cuerpo.append(_divisor_seccion(i, seccion["titulo"], seccion["subtitulo"]))

        for entrada in seccion["items"]:
            if entrada["tipo"] == "pregunta":
                numero_pregunta += 1
                pregunta = entrada["data"]
                cuerpo.append(_fila_pregunta(
                    numero_pregunta, pregunta.get("titulo"), _formatear_valor(respuestas.get(pregunta["codigo"]))
                ))
            else:
                grupo = entrada["data"]
                repeticiones = respuestas.get(grupo["codigo"]) or []
                for idx_rep, repeticion in enumerate(repeticiones, start=1):
                    titulo_grupo = (grupo.get("titulo_template") or grupo["codigo"]).replace("{n}", str(idx_rep))
                    campos = [
                        (p.get("titulo"), _formatear_valor(repeticion.get(p["codigo"])))
                        for p in entrada["preguntas"]
                    ]
                    cuerpo.append(_bloque_grupo(titulo_grupo, campos))

    cliente_html = ""
    if cliente_nombre or cliente_documento:
        cliente_html = f"""
        <tr>
          <td style="padding:0 32px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{_COLOR_GRUPO_FONDO}; border-radius:8px;">
              <tr>
                <td style="padding:14px 18px; font-family:Arial, sans-serif; font-size:14px; color:{_COLOR_TEXTO};">
                  <span style="color:{_COLOR_TEXTO_SUAVE};">Cliente (tomador)</span><br>
                  <strong>{escape(cliente_nombre or "(sin nombre)")}</strong>
                  &nbsp;&middot;&nbsp; Documento: {escape(cliente_documento or "-")}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        """

    return f"""
    <html>
      <body style="margin:0; padding:0; background:{_COLOR_FONDO}; font-family:Arial, Helvetica, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{_COLOR_FONDO}; padding:24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background:{_COLOR_TARJETA}; border-radius:12px; overflow:hidden; border:1px solid {_COLOR_BORDE};">
                <tr>
                  <td style="padding:20px 32px; background:{_COLOR_TARJETA}; border-bottom:1px solid {_COLOR_BORDE};">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:{_COLOR_LOGO_FONDO}; border-radius:9px; width:40px; height:40px; text-align:center; font-family:Arial, sans-serif; font-weight:bold; font-size:16px; color:{_COLOR_LOGO_TEXTO};">
                          JF
                        </td>
                        <td style="padding-left:12px; font-family:Arial, sans-serif; font-size:16px; font-weight:bold; color:{_COLOR_HEADER}; letter-spacing:0.3px;">
                          JUANFER SEGUROS
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background:{_COLOR_HEADER}; padding:24px 32px;">
                    <p style="margin:0; color:#aac7db; font-size:12px; letter-spacing:0.5px; text-transform:uppercase; font-family:Arial, sans-serif;">Nueva respuesta de formulario</p>
                    <h1 style="margin:6px 0 0; color:#ffffff; font-size:20px; font-family:Arial, sans-serif;">{escape(formulario_titulo)}</h1>
                  </td>
                </tr>
                {cliente_html}
                <tr>
                  <td style="padding:4px 32px 28px;">
                    {''.join(cuerpo)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 32px; background:{_COLOR_FONDO}; border-top:1px solid {_COLOR_BORDE};">
                    <p style="margin:0; font-size:12px; color:{_COLOR_TEXTO_SUAVE}; font-family:Arial, sans-serif;">
                      Este es un mensaje generado automáticamente por el sistema de Juanfer Seguros. Por favor no respondas a este correo.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """


def _construir_secciones(estructura: dict) -> list[dict]:
    """
    Mismo algoritmo que `construirEntradas` + `construirPaginas` en
    FormularioPublico.jsx: preguntas sueltas y grupos comparten la
    escala de `orden` y se intercalan en ese orden real; una pregunta
    tipo "seccion" cierra la sección anterior y abre una nueva.
    """
    preguntas = estructura.get("preguntas", [])
    grupos = estructura.get("grupos", [])

    entradas = [
        {"tipo": "pregunta", "orden": float(p.get("orden") or 0), "data": p}
        for p in preguntas
        if p.get("grupo_id") is None
    ] + [
        {
            "tipo": "grupo",
            "orden": float(g.get("orden") or 0),
            "data": g,
            "preguntas": sorted(
                (p for p in preguntas if p.get("grupo_id") == g.get("id")),
                key=lambda p: float(p.get("orden") or 0),
            ),
        }
        for g in grupos
    ]
    entradas.sort(key=lambda e: e["orden"])

    secciones = [{"titulo": None, "subtitulo": None, "items": []}]

    for entrada in entradas:
        if entrada["tipo"] == "pregunta" and entrada["data"].get("tipo_codigo") == _TIPO_SECCION:
            secciones.append({"titulo": entrada["data"].get("titulo"), "subtitulo": entrada["data"].get("subtitulo"), "items": []})
        else:
            secciones[-1]["items"].append(entrada)

    if len(secciones) > 1 and not secciones[0]["items"]:
        secciones = secciones[1:]

    return secciones


def _divisor_seccion(numero: int, titulo: Optional[str], subtitulo: Optional[str]) -> str:
    subtitulo_html = (
        f'<p style="margin:2px 0 0; font-size:12px; color:#dbe9f4; font-family:Arial, sans-serif;">{escape(subtitulo)}</p>'
        if subtitulo else ""
    )
    return f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td style="background:{_COLOR_ACENTO}; border-radius:8px; padding:10px 16px;">
          <p style="margin:0; font-size:11px; letter-spacing:0.5px; text-transform:uppercase; color:#dbe9f4; font-family:Arial, sans-serif;">Sección {numero}</p>
          <p style="margin:2px 0 0; font-size:14px; font-weight:bold; color:#ffffff; font-family:Arial, sans-serif;">{escape(str(titulo or ""))}</p>
          {subtitulo_html}
        </td>
      </tr>
    </table>
    """


def _fila_pregunta(numero: int, titulo, valor: str) -> str:
    return f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:14px 0 2px; font-family:Arial, sans-serif; font-size:14px; font-weight:bold; color:{_COLOR_TEXTO};">
          {numero}. {escape(str(titulo or ""))}
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 10px; font-family:Arial, sans-serif; font-size:14px; color:{_COLOR_TEXTO}; border-bottom:1px solid {_COLOR_BORDE};">
          {escape(valor)}
        </td>
      </tr>
    </table>
    """


def _bloque_grupo(titulo_grupo: str, campos: list[tuple]) -> str:
    filas = "".join(
        f"""
        <tr>
          <td style="padding:8px 16px 0; font-family:Arial, sans-serif; font-size:13px; font-weight:bold; color:{_COLOR_TEXTO};">
            {escape(str(titulo or ""))}
          </td>
        </tr>
        <tr>
          <td style="padding:1px 16px 8px; font-family:Arial, sans-serif; font-size:14px; color:{_COLOR_TEXTO};">
            {escape(valor)}
          </td>
        </tr>
        """
        for titulo, valor in campos
    )
    return f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px; border:1px solid {_COLOR_BORDE}; border-radius:8px; overflow:hidden;">
      <tr>
        <td style="padding:10px 16px; background:{_COLOR_GRUPO_FONDO}; font-family:Arial, sans-serif; font-size:13px; font-weight:bold; color:{_COLOR_ACENTO};">
          {escape(str(titulo_grupo))}
        </td>
      </tr>
      {filas}
    </table>
    """


def _formatear_valor(valor) -> str:
    if valor is None or valor == "":
        return "-"
    if isinstance(valor, list):
        return ", ".join(str(v) for v in valor) if valor else "-"
    return str(valor)
