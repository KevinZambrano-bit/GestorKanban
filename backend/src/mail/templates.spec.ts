import {
  renderInvitationEmail,
  renderWelcomeEmail,
  renderTaskAssignedEmail,
  renderPasswordResetEmail,
  escapeHtml,
} from './templates';

describe('plantillas de correo', () => {
  it('escapa las etiquetas HTML de los valores de la base de datos', () => {
    const { html } = renderInvitationEmail({
      inviterName: '<script>alert(1)</script>',
      projectName: 'Tienda & "Café"',
      role: 'member',
      acceptUrl: 'http://localhost:5173/invitacion/abc',
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Tienda &amp; &quot;Café&quot;');
  });

  it('el asunto conserva el texto literal pero el HTML lo escapa', () => {
    const content = renderTaskAssignedEmail({
      name: 'Ana',
      taskTitle: '<b>Corregir login</b>',
      taskNumber: 12,
      projectName: 'Tienda',
      assignedByName: 'Ana',
      taskUrl: 'http://x/1',
    });

    // En el asunto y en el texto plano las etiquetas son texto literal, así
    // que no se tocan; solo la parte HTML va escapada.
    expect(content.subject).toBe(
      'Te asignaron la tarea #12: <b>Corregir login</b>',
    );
    expect(content.text).toContain('Tarea #12: <b>Corregir login</b>');
    expect(content.html).not.toContain('<b>');
    expect(content.html).toContain('&lt;b&gt;Corregir login&lt;/b&gt;');
  });

  it('formatea el rol en lenguaje natural', () => {
    const leader = renderWelcomeEmail({
      name: 'Ana',
      projectName: 'Tienda',
      role: 'leader',
      projectUrl: 'http://x/1',
    });
    const member = renderWelcomeEmail({
      name: 'Ana',
      projectName: 'Tienda',
      role: 'member',
      projectUrl: 'http://x/1',
    });

    expect(leader.html).toContain('líder');
    expect(member.html).toContain('miembro');
  });

  it('incluye el enlace en texto por si el cliente bloquea el botón', () => {
    const url = 'http://localhost:5173/invitacion/abc';
    const { html } = renderInvitationEmail({
      inviterName: 'Ana',
      projectName: 'Tienda',
      role: 'member',
      acceptUrl: url,
    });

    // Una vez en el href del botón y otra en el texto de respaldo
    expect(
      html.match(new RegExp(url.replace(/[/.]/g, '\\$&'), 'g')),
    ).toHaveLength(2);
  });

  it('omite el bloque de fecha límite si la tarea no tiene fecha', () => {
    const base = {
      name: 'Beto',
      taskTitle: 'Corregir login',
      taskNumber: 12,
      projectName: 'Tienda',
      assignedByName: 'Ana',
      taskUrl: 'http://x/1',
    };

    expect(renderTaskAssignedEmail(base).html).not.toContain('Fecha límite');
    expect(
      renderTaskAssignedEmail({ ...base, dueDate: '15/03/2026' }).html,
    ).toContain('Fecha límite');
    // La fecha también viaja en el texto plano, no solo en el HTML
    expect(renderTaskAssignedEmail(base).text).not.toContain('Fecha límite');
    expect(
      renderTaskAssignedEmail({ ...base, dueDate: '15/03/2026' }).text,
    ).toContain('Fecha límite: 15/03/2026');
  });

  it('dice explícitamente que ignorar el correo no cambia la contraseña', () => {
    const content = renderPasswordResetEmail({
      name: 'Ana',
      resetUrl: 'http://x/reset?token=abc',
      expiresInMinutes: 30,
    });

    expect(content.html).toContain('ignora este correo');
    expect(content.html).toContain('30 minutos');
    expect(content.text).toContain('ignora este correo');
    expect(content.text).toContain('30 minutos');
  });

  it('el texto plano incluye siempre el enlace de acción', () => {
    const reset = renderPasswordResetEmail({
      name: 'Ana',
      resetUrl: 'http://x/reset?token=abc',
      expiresInMinutes: 30,
    });
    const invitation = renderInvitationEmail({
      inviterName: 'Ana',
      projectName: 'Tienda',
      role: 'member',
      acceptUrl: 'http://x/invitacion/abc',
    });

    expect(reset.text).toContain('Elegir nueva contraseña: http://x/reset');
    expect(invitation.text).toContain(
      'Aceptar invitación: http://x/invitacion/abc',
    );
  });

  it('escapa también los valores ausentes', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml('')).toBe('');
  });
});
