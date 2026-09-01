export function getAvatarUrl(seed, style = 'initials') {
  return https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed || 'default')}
}