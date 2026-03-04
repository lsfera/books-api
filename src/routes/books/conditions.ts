export const ALL_CONDITIONS = ['new', 'used', 'refurbished'] as const
export type Condition = (typeof ALL_CONDITIONS)[number]
