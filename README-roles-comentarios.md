# Plan de Cambios para Soporte de Roles y Comentarios en Mily

## 1. Objetivo
Agregar soporte para distintos tipos de usuario (normal, referente, nutri) y permitir comentarios de nutricionistas en registros de comida y ciclos, con control de visibilidad según el tipo de usuario.

---

## 2. Cambios en la Base de Datos

### a) Tabla `profiles`
- **Agregar columna `user_type`**: para distinguir entre "normal", "referente" y "nutri".
- **Agregar columna `referente_id`**: para vincular un usuario menor con su responsable (referente).

```sql
ALTER TABLE profiles
ADD COLUMN user_type text NOT NULL DEFAULT 'normal',
ADD COLUMN referente_id uuid REFERENCES profiles(id);
```

### b) Nueva tabla `comments`
- **Permite comentarios de nutricionistas** en registros de comida o ciclos.
- **Campos sugeridos:**
  - `id` (uuid, PK)
  - `created_at` (timestamp)
  - `author_id` (uuid, FK a profiles)
  - `target_user_id` (uuid, FK a profiles)
  - `meal_id` (uuid, FK a meals, nullable)
  - `cycle_id` (uuid, FK a cycles, nullable)
  - `content` (text)
  - `approved` (boolean, default false)

```sql
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  author_id uuid REFERENCES profiles(id),
  target_user_id uuid REFERENCES profiles(id),
  meal_id uuid REFERENCES meals(id),
  cycle_id uuid REFERENCES cycles(id),
  content text NOT NULL,
  approved boolean NOT NULL DEFAULT false
);
```

---

## 3. Cambios en la App (Frontend)

### a) Configuración de usuario
- Permitir seleccionar el tipo de usuario: "normal", "referente", "nutri".
- Si es menor de edad, permitir asociar un referente (buscar por email o username).

### b) Lógica de comentarios
- Un usuario tipo "nutri" puede dejar comentarios en:
  - Un registro de comida individual (meal)
  - Un ciclo completo (cycle)
- Los comentarios quedan pendientes de aprobación por el usuario "referente".
- El usuario "referente" puede aprobar/rechazar comentarios.
- El usuario "normal" (menor de edad) NO puede ver comentarios de la nutricionista.
- El usuario "referente" SÍ puede ver y gestionar los comentarios.

### c) Visibilidad
- El usuario "nutri" puede ver los comentarios que dejó y su estado.
- El usuario "referente" puede ver todos los comentarios de los usuarios a su cargo.
- El usuario "normal" no ve comentarios de la nutricionista.

### d) UI/UX
- En la página de historial compartido, mostrar sección de comentarios para "nutri" y "referente".
- Mostrar estado de aprobación de cada comentario.
- Permitir aprobar/rechazar desde la interfaz del referente.

---

## 4. Integración de comentarios y notas con la base de datos y visibilidad por roles

### a) Integración con la base de datos
- El comentario escrito con el componente `CommentButton` se guarda en la tabla `comments` asociado al registro (meal o cycle) y al usuario objetivo.
- El mismo comentario puede ser leído por el componente `NoteButton`.
- Eliminar un comentario desde la app elimina el registro correspondiente en la tabla `comments`.

### b) Visibilidad según roles
- **Usuario "nutri":**
  - Puede ver ambos componentes: el de escribir comentario (CommentButton) y el de leer la nota (NoteButton).
  - Puede crear, editar y eliminar comentarios/notas.
- **Usuario "referente":**
  - Solo puede ver el componente de nota (NoteButton) para leer los comentarios/notas escritos por el usuario "nutri".
  - No puede editar ni eliminar comentarios/notas.
- **Usuario común (niño/menor):**
  - No puede ver ninguno de los componentes de comentario o nota.

### c) Lógica de frontend
- El frontend debe mostrar u ocultar los componentes `CommentButton` y `NoteButton` según el tipo de usuario autenticado.
- La lógica de visibilidad se basa en el campo `user_type` de la tabla `profiles`.
- El componente de comentario solo se muestra en la vista de historial compartido y solo si el usuario autenticado es "nutri" o "referente" según corresponda.

### d) Resumen de flujo
1. El usuario "nutri" escribe o edita un comentario con `CommentButton`.
2. El comentario se guarda en la base de datos.
3. El usuario "referente" puede leer ese comentario con `NoteButton`.
4. El usuario "nutri" puede eliminar el comentario si lo desea.
5. El usuario común no ve estos componentes ni los comentarios.

---

## 5. Pruebas Locales
- Antes de modificar la base de datos en producción, crear las tablas y relaciones en entorno local.
- Probar:
  - Creación de comentarios por "nutri".
  - Aprobación/rechazo por "referente".
  - Visibilidad según tipo de usuario.

---

## 6. Siguientes pasos
1. Implementar cambios en la base de datos local.
2. Adaptar modelos y lógica en el backend/frontend.
3. Probar flujos completos de comentarios y visibilidad.
4. Documentar cualquier ajuste adicional necesario.

---

> Este plan debe revisarse y ajustarse según los resultados de las pruebas locales y feedback de usuarios clave.
