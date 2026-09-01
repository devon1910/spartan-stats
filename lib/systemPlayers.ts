export const OWN_GOAL_NAME = 'Own Goal';

export function isSystemPlayerName(name: string): boolean {
  return name.trim().toLocaleLowerCase() === OWN_GOAL_NAME.toLocaleLowerCase();
}
