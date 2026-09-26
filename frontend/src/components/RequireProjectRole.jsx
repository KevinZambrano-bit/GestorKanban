export default function RequireProjectRole({ role, allowed = [], children }) {
  if (!allowed.includes(role)) return null

  return children
}
