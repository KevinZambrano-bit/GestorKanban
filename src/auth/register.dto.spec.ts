import { validate } from 'class-validator';
import { RegisterDto } from './dto/register.dto';

describe('RegisterDto', () => {
  // ─────────────────────────────────────────────
  // EMAIL INVÁLIDO
  // ─────────────────────────────────────────────

  it('debe fallar si el email es inválido', async () => {
    const dto = new RegisterDto();

    dto.name = 'Kevin';
    dto.email = 'correo-invalido';
    dto.password = '123456';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);

    const emailError = errors.find(
      (error) => error.property === 'email',
    );

    expect(emailError).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // PASSWORD MUY CORTA
  // ─────────────────────────────────────────────

  it('debe fallar si la contraseña tiene menos de 6 caracteres', async () => {
    const dto = new RegisterDto();

    dto.name = 'Kevin';
    dto.email = 'kevin@test.com';
    dto.password = '123';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);

    const passwordError = errors.find(
      (error) => error.property === 'password',
    );

    expect(passwordError).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // DTO VÁLIDO
  // ─────────────────────────────────────────────

  it('debe validar correctamente un DTO válido', async () => {
    const dto = new RegisterDto();

    dto.name = 'Kevin';
    dto.email = 'kevin@test.com';
    dto.password = '123456';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });
});