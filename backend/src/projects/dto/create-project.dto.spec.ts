import { validate } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

describe('CreateProjectDto', () => {
  // ─────────────────────────────────────────────
  // NAME REQUERIDO
  // ─────────────────────────────────────────────

  it('debe fallar si el name no es proporcionado', async () => {
    const dto = new CreateProjectDto();

    dto.description = 'Descripción del proyecto';
    dto.wipLimit = 5;
    dto.isPublic = false;

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);

    const nameError = errors.find((error) => error.property === 'name');

    expect(nameError).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // NAME DEBE SER STRING
  // ─────────────────────────────────────────────

  it('debe fallar si el name no es string', async () => {
    const dto = new CreateProjectDto();

    (dto as any).name = 12345;
    dto.description = 'Descripción';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);

    const nameError = errors.find((error) => error.property === 'name');

    expect(nameError).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // DESCRIPTION OPCIONAL Y DEBE SER STRING
  // ─────────────────────────────────────────────

  it('debe fallar si description no es string', async () => {
    const dto = new CreateProjectDto();

    dto.name = 'Mi Proyecto';
    (dto as any).description = 12345;

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);

    const descError = errors.find((error) => error.property === 'description');

    expect(descError).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // WIP LIMIT DEBE SER NÚMERO Y MÍNIMO 1
  // ─────────────────────────────────────────────

  it('debe fallar si wipLimit no es número', async () => {
    const dto = new CreateProjectDto();

    dto.name = 'Mi Proyecto';
    (dto as any).wipLimit = 'no-es-numero';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);

    const wipError = errors.find((error) => error.property === 'wipLimit');

    expect(wipError).toBeDefined();
  });

  it('debe fallar si wipLimit es menor a 1', async () => {
    const dto = new CreateProjectDto();

    dto.name = 'Mi Proyecto';
    dto.wipLimit = 0;

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);

    const wipError = errors.find((error) => error.property === 'wipLimit');

    expect(wipError).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // IS PUBLIC DEBE SER BOOLEANO
  // ─────────────────────────────────────────────

  it('debe fallar si isPublic no es booleano', async () => {
    const dto = new CreateProjectDto();

    dto.name = 'Mi Proyecto';
    (dto as any).isPublic = 'si';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);

    const isPublicError = errors.find((error) => error.property === 'isPublic');

    expect(isPublicError).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // DTO VÁLIDO CON TODOS LOS CAMPOS
  // ─────────────────────────────────────────────

  it('debe validar correctamente un DTO completo y válido', async () => {
    const dto = new CreateProjectDto();

    dto.name = 'GestorKanban';
    dto.description = 'Plataforma de gestión de tareas';
    dto.wipLimit = 5;
    dto.isPublic = false;

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  // ─────────────────────────────────────────────
  // DTO VÁLIDO CON SOLO CAMPO REQUERIDO
  // ─────────────────────────────────────────────

  it('debe validar correctamente con solo el name (campos opcionales vacíos)', async () => {
    const dto = new CreateProjectDto();

    dto.name = 'Mi Proyecto';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  // ─────────────────────────────────────────────
  // DTO VÁLIDO CON VALORES VÁLIDOS MÍNIMOS
  // ─────────────────────────────────────────────

  it('debe validar correctamente con wipLimit mínimo (1)', async () => {
    const dto = new CreateProjectDto();

    dto.name = 'Proyecto';
    dto.wipLimit = 1;

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  // ─────────────────────────────────────────────
  // DTO VÁLIDO CON TODOS LOS CAMPOS OPCIONALES
  // ─────────────────────────────────────────────

  it('debe validar correctamente un DTO con todos los campos opcionales', async () => {
    const dto = new CreateProjectDto();

    dto.name = 'Proyecto Completo';
    dto.description = 'Descripción completa';
    dto.wipLimit = 10;
    dto.isPublic = true;

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });
});
