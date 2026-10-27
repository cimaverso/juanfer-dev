# Propósito

**Problema:** Juanfer Seguros vende pólizas y necesita llevar la traza y el seguimiento de sus clientes y prospectos junto con sus pólizas. Qué duele hoy exactamente (proceso manual, pérdida de seguimiento, información dispersa): [PENDIENTE].

**Solución en una frase:** Un sistema web interno para registrar y dar seguimiento a prospectos, clientes y pólizas, que además expone formularios editables, por URL, para que asegurados e interesados los diligencien sin cuenta.

**Usuario de entrada:**
- Interno: asesores y administradores de Juanfer Seguros, mediante el panel admin.
- Externo (solo formularios): asegurado o interesado que recibe una URL. No tiene login.

**No es:**
- Un sistema de pagos ni de facturación.
- Una integración con las aseguradoras ni con otros servicios externos (única excepción prevista: envío de correo con Resend).
- Un portal del cliente ni una app móvil.

**Éxito se ve así (medible):** [PENDIENTE] — definir 2-3 indicadores con el dueño (ej. formularios diligenciados por URL, prospectos con seguimiento al día). No se inventan aquí.

**Supuestos que, si fallan, invalidan el proyecto** (ninguno verificado todavía):
- Los 17 formularios actuales caben en un único modelo de datos genérico, sin una tabla por formulario.
- Los formularios públicos pueden recoger datos personales con autorización explícita del titular (Ley 1581 de 2012, habeas data). No se sabe si ya está cubierto.
- El dueño tiene, o puede verificar, un dominio de correo para enviar con Resend.
