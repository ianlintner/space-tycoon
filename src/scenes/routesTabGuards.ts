/**
 * The tutorial can call switchToActiveRoutesTab while RoutesScene has not been
 * created yet (or has already shut down). There is no tab strip to update then,
 * and TabGroup.setActiveTab throws on its destroyed children.
 */
export function canSwitchToActiveRoutesTab(
  sys: { isActive(): boolean } | undefined,
  hasTabGroup: boolean,
): boolean {
  return Boolean(sys?.isActive() && hasTabGroup);
}
