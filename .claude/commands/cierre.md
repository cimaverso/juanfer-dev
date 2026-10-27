---
description: Cierre de sesión — actualiza documentos vivos y deja el siguiente paso listo
disable-model-invocation: true
---

# /cierre

Comando manual y local: solo lo invoca el usuario al terminar la sesión. Los comandos se ejecutan en Git Bash.

Alcance de archivos que este comando puede modificar:
- docs/ESTADO.md (siempre)
- docs/DECISIONES.md (solo decisiones NUEVAS)
- docs/DEUDA.md (PROPONER, no escribir sin mi OK)
- docs/GUIA.md, backend/.env.example y frontend/.env.example (PROPONER, no escribir sin mi OK)
- docs/ARQUITECTURA.md (PROPONER si cambió la estructura de módulos, no escribir sin mi OK)
- docs/ROADMAP.md y docs/REQUISITOS.md (PROPONER cambios de estado, no escribir sin mi OK)

Ningún otro archivo. No hagas commit ni push salvo que te lo pida.

## Pasos
1. Evidencia, no memoria: ejecuta `git status` y `git diff --stat` y revisa qué cambió realmente en esta sesión. Basa el cierre en eso, no en lo que recuerdas haber hecho.
2. Verifica solo el área tocada y reporta el resultado real. Si algo falla, ESTADO.md lo dice explícitamente; no lo maquilles.
   - Frontend (si cambió `frontend/src`): `npm run lint` y `npm run build`, desde `frontend/`.
   - Backend (si cambió `backend/`): `uv run alembic heads` debe mostrar un solo head; si hubo cambios en `backend/app/models`, debe haber una migración en `backend/alembic/versions` en el mismo diff, y se prueba `upgrade head` y `downgrade -1` en una base descartable. Pruebas automáticas: no existen todavía (DT-006); si ya existen, córrelas.
   - Reglas del front sobre lo cambiado: ningún `.js` ni `.jsx` tocado supera 1000 líneas (`git diff --name-only -- frontend/src | xargs wc -l`) y no hay hex nuevos fuera de `global.css` (`git diff -U0 -- frontend/src ':!frontend/src/styles/global.css' | grep -E '^\+.*#[0-9a-fA-F]{6}\b'`).
3. Actualiza docs/ESTADO.md siguiendo su plantilla: un solo siguiente paso concreto, bloqueos, contexto no obvio.
4. Coherencia de configuración (solo si esta sesión tocó código, dependencias o despliegue):
   a. Extrae las variables de entorno que el código realmente lee:
      - Backend: campos de `Settings` en `backend/app/core/config.py` (`grep -nE "^\s+[A-Z_]+\s*:" backend/app/core/config.py`) y usos directos (`grep -rnE "os\.environ|os\.getenv" backend/app backend/scripts backend/alembic`).
      - Frontend: `grep -rhoE "import\.meta\.env\.[A-Z_]+" frontend/src | sort -u`.
   b. Compáralas con `backend/.env.example`, `frontend/.env.example` y la tabla de variables de docs/GUIA.md (sección 3).
   c. Reporta tres listas: (i) leídas por el código pero ausentes en el `.env.example` o la GUIA, (ii) documentadas pero ya no usadas, (iii) comando de instalación, ejecución o migración que cambió y la GUIA aún no refleja.
   d. PROPÓN el parche a los `.env.example` y a GUIA.md; no lo escribas sin mi OK. Nunca imprimas valores reales de `.env`; compara solo nombres.
   e. Límite: este paso detecta nombres de variables y comandos obvios; no demuestra que la guía funcione. Eso sigue exigiendo ejecutarla en un clon limpio.
5. Decisiones: si hubo una decisión no obvia o difícil de revertir, redáctala en DECISIONES.md. Si no la hubo, no añadas nada.
6. Deuda: lista atajos o riesgos que detectaste en la sesión como PROPUESTA (con tipo, impacto, costo, disparador). Espera mi aprobación.
7. Roadmap/requisitos: propón qué casillas marcar o estados cambiar, con la evidencia (commit, test). Espera mi aprobación.
8. Muéstrame el diff de los documentos modificados y un resumen de máximo 8 líneas.
9. Si la conversación perdió coherencia o notas que olvidas contexto, dilo y sugiere abrir sesión nueva.

## Prohibido
- Marcar como hecho algo que no verificaste.
- Reescribir documentos completos para "mejorar la redacción".
- Inventar el contexto de pasos que no ocurrieron en esta sesión.
