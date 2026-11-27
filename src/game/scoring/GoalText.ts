/** Shared wording for the win condition shown in setup and Rex's intro. */
export interface GoalLineContext {
  maxTurns: number;
  companyCount: number;
}

export function formatGoalLine({
  maxTurns,
  companyCount,
}: GoalLineContext): string {
  return `Goal: finish #1 in net worth among ${companyCount} companies after ${maxTurns} quarters`;
}
