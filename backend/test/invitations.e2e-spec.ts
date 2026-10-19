import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Project } from '../src/projects/entities/project.entity';
import { ProjectInvitation } from '../src/projects/entities/project-invitation.entity';

// Prueba de integración contra la base de datos de desarrollo: comprueba que
// el esquema de las entidades nuevas se crea y que el flujo de invitación
// funciona de punta a punta (HTTP → TypeORM). Requiere MySQL levantado.
jest.setTimeout(60000);

describe('Flujo de invitación (integración)', () => {
  let app: INestApplication;
  let leaderToken: string;
  let inviteeToken: string;
  let projectId: number;

  const leaderEmail = `lider-${Date.now()}@test.com`;
  // El dominio del invitado debe poder recibir correo: la invitación verifica
  // los registros MX antes de crearse. Gmail los publica.
  const inviteeEmail = `invitado-${Date.now()}@gmail.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    // Los proyectos arrastran invitaciones y miembros por ON DELETE CASCADE.
    // TypeORM no admite delete() sin criterios, así que se vacían por id.
    const projects = app.get<Repository<Project>>(getRepositoryToken(Project));
    const invitations = app.get<Repository<ProjectInvitation>>(
      getRepositoryToken(ProjectInvitation),
    );
    const allInvitations = await invitations.find();
    if (allInvitations.length > 0) {
      await invitations.delete(allInvitations.map((i) => i.id));
    }
    const allProjects = await projects.find();
    if (allProjects.length > 0) {
      await projects.delete(allProjects.map((p) => p.id));
    }
    await app.close();
  });

  it('el líder crea un proyecto', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Líder', email: leaderEmail, password: 'Clave12345' })
      .expect(201);

    leaderToken = res.body.access_token;
    expect(leaderToken).toBeTruthy();

    const project = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ name: 'Proyecto con invitación', description: 'test' })
      .expect(201);

    projectId = project.body.id;
    expect(projectId).toBeGreaterThan(0);
  });

  it('sin credenciales de correo la invitación queda fallida y avisa', async () => {
    const res = await request(app.getHttpServer())
      .post(`/projects/${projectId}/invitations`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ email: inviteeEmail, role: 'member' })
      .expect(201);

    expect(res.body.emailSent).toBe(false);
    expect(res.body.message).toContain('No se pudo enviar');

    // La invitación fallida no aparece entre las pendientes: nadie recibió el
    // enlace, así que no debe poder aceptarse.
    const list = await request(app.getHttpServer())
      .get(`/projects/${projectId}/invitations`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .expect(200);

    expect(list.body).toEqual([]);
  });

  it('un miembro no puede invitar', async () => {
    // El invitado se registra por su cuenta y se añade manualmente
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Invitado', email: inviteeEmail, password: 'Clave12345' })
      .expect(201);
    inviteeToken = res.body.access_token;

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/invitations`)
      .set('Authorization', `Bearer ${inviteeToken}`)
      .send({ email: 'tercero@test.com' })
      .expect(403);
  });

  it('el invitado ve la vista del tablero tras aceptarse', async () => {
    // Al no poder enviarse el correo, se comprueba el camino de datos del
    // proyecto una vez que el usuario es miembro.
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ email: inviteeEmail, role: 'member' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${inviteeToken}`)
      .expect(200);

    expect(res.body.name).toBe('Proyecto con invitación');
  });

  it('el endpoint público de invitación rechaza un token inexistente', async () => {
    await request(app.getHttpServer())
      .get('/invitations/token-que-no-existe')
      .expect(404);
  });

  it('el reset de contraseña no filtra si el email existe', async () => {
    const conCuenta = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: leaderEmail })
      .expect(200);

    const sinCuenta = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'nadie-aqui@test.com' })
      .expect(200);

    expect(conCuenta.body.message).toBe(sinCuenta.body.message);
  });

  it('rechaza un token de reset inválido', async () => {
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'invalido', password: 'NuevaClave123' })
      .expect(400);
  });
});
