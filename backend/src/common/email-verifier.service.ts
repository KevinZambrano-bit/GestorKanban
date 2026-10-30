import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resolver } from 'dns/promises';

/**
 * Comprueba que el dominio de un correo pueda recibir mensajes consultando sus
 * registros MX.
 *
 * No valida que el buzón concreto exista —eso solo lo sabe el servidor de
 * destino—, pero descarta direcciones con el dominio mal escrito o sin correo,
 * que son la mayoría de los fallos de entrega de una invitación. Además
 * bloquea dominios de correo desechable/temporal conocidos.
 */
@Injectable()
export class EmailVerifierService {
  private readonly logger = new Logger(EmailVerifierService.name);
  private readonly resolver = new Resolver();
  private readonly cache = new Map<
    string,
    { result: boolean; expiresAt: number }
  >();
  private readonly blockedDomains = new Set<string>();

  private static readonly CACHE_TTL_MS = 10 * 60 * 1000;

  /**
   * Proveedores de correo temporal habituales. Una invitación ahí casi nunca
   * llega a un humano real, así que se rechaza antes de gastar un envío.
   */
  private static readonly DEFAULT_BLOCKED_DOMAINS = [
    'mailinator.com',
    'guerrillamail.com',
    'guerrillamail.info',
    'guerrillamailblock.com',
    'sharklasers.com',
    'grr.la',
    'tempmail.com',
    'temp-mail.org',
    '10minutemail.com',
    'yopmail.com',
    'trashmail.com',
    'trash-mail.com',
    'getnada.com',
    'dispostable.com',
    '1secmail.com',
    'throwawaymail.com',
    'maildrop.cc',
    'fakeinbox.com',
  ];

  constructor(private readonly configService?: ConfigService) {
    // Se admite una lista extra separada por comas en MAIL_BLOCKED_DOMAINS
    // para no recompilar si aparece un proveedor nuevo.
    const extra = (
      this.configService?.get<string>('MAIL_BLOCKED_DOMAINS') ?? ''
    )
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean);

    for (const domain of [
      ...EmailVerifierService.DEFAULT_BLOCKED_DOMAINS,
      ...extra,
    ]) {
      this.blockedDomains.add(domain);
    }
  }

  /** ¿Pertenece el correo a un proveedor de correo desechable conocido? */
  isDisposable(email: string): boolean {
    const domain = email.split('@')[1]?.trim().toLowerCase();
    return domain ? this.blockedDomains.has(domain) : false;
  }

  async canReceiveMail(email: string): Promise<boolean> {
    const domain = email.split('@')[1]?.trim().toLowerCase();
    if (!domain) return false;

    const cached = this.cache.get(domain);
    if (cached && cached.expiresAt > Date.now()) return cached.result;

    let result: boolean;
    try {
      const records = await this.resolver.resolveMx(domain);
      // Un exchange vacío es el "null MX" (RFC 7505): el dominio declara
      // explícitamente que no acepta correo.
      result = records.some((record) => Boolean(record.exchange));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOTFOUND' || code === 'ENODATA') {
        // El dominio no existe o no publica registros MX: no puede recibir.
        result = false;
      } else {
        // DNS caído, timeout...: no se bloquea la invitación por un fallo
        // transitorio, pero se deja constancia para poder revisarlo.
        this.logger.warn(
          `No se pudo verificar el dominio ${domain}: ${(error as Error).message}`,
        );
        return true;
      }
    }

    this.cache.set(domain, {
      result,
      expiresAt: Date.now() + EmailVerifierService.CACHE_TTL_MS,
    });
    return result;
  }
}
