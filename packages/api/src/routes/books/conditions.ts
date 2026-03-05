export const ALL_CONDITIONS = ['used', 'new', 'like new', 'good'] as const
export type Condition = (typeof ALL_CONDITIONS)[number]
