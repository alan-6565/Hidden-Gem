export const CURRENT_USER_DISPLAY = {
  name: 'You',
  avatar: 'https://i.pravatar.cc/150?img=47',
};

export function getDisplayNameFromEmail(email?: string | null): string {
  return email?.split('@')[0] ?? CURRENT_USER_DISPLAY.name;
}
