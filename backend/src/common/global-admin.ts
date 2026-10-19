import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

// Rol global con control total sobre la plataforma. Se usa como bypass en las
// comprobaciones de permisos de proyecto: un admin puede ver y gestionar
// cualquier proyecto aunque no sea miembro.
export const GLOBAL_ADMIN_ROLE = 'admin';

// Evalúa un usuario que ya viene cargado con su rol, sin tocar la BD.
export function isGlobalAdmin(user: User | null | undefined): boolean {
  return user?.role?.name === GLOBAL_ADMIN_ROLE;
}

// Consulta en BD si el usuario es admin global (el rol puede haber cambiado,
// así que no se confía en el JWT). Es el bypass que usan guardias y servicios
// cuando falla una comprobación de membresía o de rol de proyecto.
export async function userIsGlobalAdmin(
  userRepository: Repository<User>,
  userId: number | undefined,
): Promise<boolean> {
  if (!userId) return false;
  const user = await userRepository.findOne({
    where: { id: userId },
    relations: ['role'],
  });
  return isGlobalAdmin(user);
}
