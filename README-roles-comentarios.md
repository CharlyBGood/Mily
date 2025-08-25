# Plan de Cambios para Soporte de Roles y Comentarios en Mily

## 1. Objetivo

Agregar soporte para distintos tipos de usuario (normal, referente, nutri) y permitir comentarios de nutricionistas en registros de comida, día y/o ciclos, con control de visibilidad según el tipo de usuario.

---

## 2. Cambios en la Base de Datos

### a) Tabla `profiles`

- **Agregada columna `user_type`**: para distinguir entre "normal", "referente" y "nutri".
- **Agregada columna `referente_id`**: para vincular un usuario menor con su responsable (referente).

| column_name  | data_type                | is_nullable | column_default |
| ------------ | ------------------------ | ----------- | -------------- |
| id           | uuid                     | NO          | null           |
| email        | text                     | NO          | null           |
| username     | text                     | YES         | null           |
| full_name    | text                     | YES         | null           |
| avatar_url   | text                     | YES         | null           |
| bio          | text                     | YES         | null           |
| website      | text                     | YES         | null           |
| created_at   | timestamp with time zone | YES         | now()          |
| updated_at   | timestamp with time zone | YES         | now()          |
| user_type    | text                     | NO          | 'normal'::text |
| referente_id | uuid                     | YES         | null           |

### b) Nueva tabla `comments`

- **Permite comentarios de nutricionistas** en registros de comida, día o ciclos.
- **Campos sugeridos:**
  | column_name    | data_type                | is_nullable | column_default    |
| -------------- | ------------------------ | ----------- | ----------------- |
| id             | uuid                     | NO          | gen_random_uuid() |
| author_id      | uuid                     | YES         | null              |
| target_user_id | uuid                     | YES         | null              |
| meal_id        | uuid                     | YES         | null              |
| cycle_id       | text                     | YES         | null              |
| content        | text                     | NO          | null              |
| created_at     | timestamp with time zone | YES         | now()             |
| approved       | boolean                  | YES         | true              |

---

## 3. Cambios en la App (Frontend)

### a) Configuración de usuario

- Permitir seleccionar el tipo de usuario: "normal", "referente", "nutri" en "profile/settings.
- Usuario referente puede buscar por email de usuario "normal" al que "controlar" con un input que debe aparecer una vez que se ha seleccionado su perfil como "referente" en "profile/settings.

### b) Lógica de comentarios

- Un usuario tipo "nutri" puede dejar comentarios en:
  - Un registro de comida individual (meal)
  - Un día completo (day)
  - Un ciclo completo (cycle)
- El usuario "nutri" puede crear/editar/eliminar notas en la página de historial compartido.
- El usuario "normal" NO puede ver comentarios de user nutri.
- El usuario "referente" solo puede leer "notes" que contiene los "comment" que dejó el user "nutri".

### c) Visibilidad

- El usuario "nutri" puede ver los comentarios que dejó y su estado.
- El usuario "referente" puede ver todos los comentarios de los usuarios a su cargo.
- El usuario "normal" no ve comentarios de user nutri.

### d) UI/UX

- En la página "profile/settings" se puede ver un input que permite seleccionar el tipo de usuario entre "normal", "referente" y "nutri".
- En la página de settings una vez seleccionado el tipo de perfil "referente" se muestra otro input que permite buscar y seleccionar por email el usuario a controlar. Una vez guardados los cambios, el usuario "referente" puede ver las "notes" que el user "nutri" dejó en el historial compartido del user "normal" que está siendo "controlado" por el user referente.
- En la página de historial compartido, mostrar iconos de comentario para "nutri" (añade comentario) y para user "referente" mostrar ícono de "nota" que contiene el comentario que dejó el user "nutri".

---

## 4. Integración de comentarios y notas con la base de datos y visibilidad por roles

### a) Integración con la base de datos

- El comentario escrito con el componente `CommentButton` se guarda en la tabla `comments` asociado al registro (meal, day o cycle) y al usuario objetivo.
- El mismo comentario puede ser leído por el componente `NoteButton`.
- Eliminar un comentario desde la app elimina el registro correspondiente en la tabla `comments`.

### b) Visibilidad según roles

- **Usuario "nutri":**
  - Puede ver el componente de escribir comentario (CommentButton).
  - Puede crear, editar y eliminar comentarios.
- **Usuario "referente":**
  - Solo puede ver el componente de nota (NoteButton) para leer los comentarios/notas escritos por el usuario "nutri".
  - No puede editar ni eliminar comentarios/notas.
- **Usuario "normal":**
  - No puede ver ninguno de los componentes de comentario o nota.

### c) Lógica de frontend

- El frontend debe mostrar u ocultar los componentes `CommentButton` y `NoteButton` según el tipo de usuario autenticado.
- La lógica de visibilidad se basa en el campo `user_type` de la tabla `profiles`.
- El componente de comentario solo se muestra en la vista de historial compartido y solo si el usuario autenticado es "nutri".
- El componente de nota solo se muestra en la vista de historial compartido y solo si el usuario autenticado es "referente".

### d) Resumen de flujo

1. El usuario "nutri" escribe o edita un comentario con `CommentButton`.
2. El comentario se guarda en la base de datos y se muestra en el historial compartido, en el componente "NoteButton".
3. El usuario "referente" puede leer ese comentario con `NoteButton`.
4. El usuario "nutri" puede eliminar o editar el comentario si lo desea, desde el mismo componente de "CommentButton".
5. El usuario "normal" no ve estos componentes ni los comentarios.

---
