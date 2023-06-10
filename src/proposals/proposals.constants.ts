export const MIN_GROUP_SIZE_TO_RATIFY = 3;
export const MIN_VOTE_COUNT_TO_RATIFY = 2;

export const ProposalActionType = {
  ChangeCoverPhoto: "change-cover-photo",
  ChangeDescription: "change-description",
  ChangeName: "change-name",
  ChangeRole: "change-role",
  ChangeSettings: "change-settings",
  CreateRole: "create-role",
  PlanEvent: "plan-event",
  Test: "test",
} as const;

export const ProposalStage = {
  Ratified: "ratified",
  Revision: "revision",
  Voting: "voting",
} as const;
