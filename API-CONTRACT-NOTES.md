# Instructor course frontend integration notes

The instructor feature now models the Prisma `Course` fields (`title`, `description`, `prerequisites`, `status`, `enrollmentStartAt`, and `enrollmentEndAt`) and the `CourseBlock` tree (`MODULE`, `TEXT`, `FILE`, `VIDEO`, `QUIZ`, `ASSIGNMENT`). It uses the shared authenticated `httpClient` and TanStack Query for loading/mutations.

## Backend contract still requiring confirmation

The uploaded backend snapshot defines the Prisma `Course` and `CourseBlock` models, but it does not include a course controller/service or a CourseBlock controller/service exposing these operations. Therefore, the frontend endpoint paths and request shapes in `src/features/courses/api/course.api.ts` and `course-block.api.ts` are centralized integration assumptions, not verified against the backend Swagger document. Before relying on live integration, compare them with the running backend `/docs` contract and adjust only those API modules if the actual routes/DTOs differ. In particular, confirm the list CourseBlock query parameter and the create/update/delete routes.

The content UI deliberately does not implement per-lesson publication. Publication is represented by `Course.status` (`DRAFT` / `PUBLISHED`) at course level.
