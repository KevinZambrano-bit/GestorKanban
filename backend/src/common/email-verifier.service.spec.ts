jest.mock('dns/promises', () => ({
  Resolver: jest.fn(),
}));

import { Resolver } from 'dns/promises';
import { EmailVerifierService } from './email-verifier.service';

describe('EmailVerifierService', () => {
  let service: EmailVerifierService;
  let resolveMx: jest.Mock;

  beforeEach(() => {
    resolveMx = jest.fn();
    (Resolver as unknown as jest.Mock).mockImplementation(() => ({
      resolveMx,
    }));
    service = new EmailVerifierService();
  });

  it('acepta un dominio con registros MX', async () => {
    resolveMx.mockResolvedValue([
      { exchange: 'gmail-smtp-in.l.google.com', priority: 5 },
    ]);

    await expect(service.canReceiveMail('alguien@gmail.com')).resolves.toBe(
      true,
    );
  });

  it('rechaza un dominio sin MX (ENODATA)', async () => {
    const error = Object.assign(new Error('queryMx ENODATA'), {
      code: 'ENODATA',
    });
    resolveMx.mockRejectedValue(error);

    await expect(
      service.canReceiveMail('alguien@sin-correo.test'),
    ).resolves.toBe(false);
  });

  it('rechaza un dominio inexistente (ENOTFOUND)', async () => {
    const error = Object.assign(new Error('queryMx ENOTFOUND'), {
      code: 'ENOTFOUND',
    });
    resolveMx.mockRejectedValue(error);

    await expect(service.canReceiveMail('alguien@nope.test')).resolves.toBe(
      false,
    );
  });

  it('rechaza el "null MX" que declara que el dominio no recibe correo', async () => {
    resolveMx.mockResolvedValue([{ exchange: '', priority: 0 }]);

    await expect(service.canReceiveMail('alguien@example.com')).resolves.toBe(
      false,
    );
  });

  it('rechaza una dirección sin dominio', async () => {
    await expect(service.canReceiveMail('sin-arroba')).resolves.toBe(false);
    expect(resolveMx).not.toHaveBeenCalled();
  });

  it('no bloquea la invitación ante un fallo transitorio de DNS', async () => {
    const error = Object.assign(new Error('timeout'), { code: 'ETIMEOUT' });
    resolveMx.mockRejectedValue(error);

    await expect(service.canReceiveMail('alguien@gmail.com')).resolves.toBe(
      true,
    );
  });

  it('cachea el resultado por dominio', async () => {
    resolveMx.mockResolvedValue([{ exchange: 'mx.gmail.com', priority: 5 }]);

    await service.canReceiveMail('uno@gmail.com');
    await service.canReceiveMail('dos@gmail.com');

    expect(resolveMx).toHaveBeenCalledTimes(1);
  });

  describe('isDisposable', () => {
    it('detecta un dominio desechable conocido', () => {
      expect(service.isDisposable('alguien@mailinator.com')).toBe(true);
    });

    it('no distingue mayúsculas en el dominio', () => {
      expect(service.isDisposable('alguien@YOPMAIL.COM')).toBe(true);
    });

    it('acepta un dominio normal', () => {
      expect(service.isDisposable('alguien@gmail.com')).toBe(false);
    });

    it('rechaza una dirección sin dominio', () => {
      expect(service.isDisposable('sin-arroba')).toBe(false);
    });

    it('admite dominios extra desde MAIL_BLOCKED_DOMAINS', () => {
      const withConfig = new EmailVerifierService({
        get: (key: string) =>
          key === 'MAIL_BLOCKED_DOMAINS'
            ? 'correo-raro.test, otro.test'
            : undefined,
      } as never);

      expect(withConfig.isDisposable('alguien@correo-raro.test')).toBe(true);
      expect(withConfig.isDisposable('alguien@otro.test')).toBe(true);
      expect(withConfig.isDisposable('alguien@mailinator.com')).toBe(true);
    });
  });
});
