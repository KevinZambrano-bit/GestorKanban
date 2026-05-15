import { validate } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';
import { TaskStatus } from '../entities/task.entity';

describe('CreateTaskDto', () => {
  // ─────────────────────────────────────────────
  // TÍTULO VACÍO
  // ─────────────────────────────────────────────

  it('debe fallar si el título está vacío', async () => {
    const dto = new CreateTaskDto();

    dto.title = '';
    dto.description = 'Implementación';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);

    const titleError = errors.find(
      (error) => error.property === 'title',
    );

    expect(titleError).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // TÍTULO NO STRING
  // ─────────────────────────────────────────────

  it('debe fallar si el título no es un string', async () => {
    const dto = new CreateTaskDto();

    (dto as any).title = 123;
    dto.description = 'Implementación';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────
  // DTO VÁLIDO
  // ─────────────────────────────────────────────

  it('debe validar correctamente un DTO válido', async () => {
    const dto = new CreateTaskDto();

    dto.title = 'Implementar login con Google';
    dto.description = 'Usar OAuth2 con Passport.js';
    dto.status = TaskStatus.PENDING;
    dto.assigneeId = 1;

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });
});
