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

    const emailError = errors.find((error) => error.property === 'email');

    expect(emailError).toBeDefined();
  });
});
