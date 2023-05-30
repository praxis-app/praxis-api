import { rule } from "graphql-shield";
import { UNAUTHORIZED } from "../../common/common.constants";
import { Context } from "../../common/common.types";
import { GroupPrivacy } from "../../groups/group-configs/models/group-config.model";
import { Group } from "../../groups/models/group.model";
import { UpdateGroupInput } from "../../groups/models/update-group.input";
import { CreateRoleInput } from "../../roles/models/create-role.input";
import { UpdateRoleInput } from "../../roles/models/update-role.input";
import {
  GroupPermission,
  ServerPermission,
} from "../../roles/permissions/permissions.constants";
import { CreateVoteInput } from "../../votes/models/create-vote.input";
import { getJti, getSub } from "../auth.utils";
import { hasPermission } from "./shield.utils";

export const canCreateInvites = rule()(
  async (_parent, _args, { permissions }: Context) =>
    hasPermission(permissions, ServerPermission.CreateInvites)
);

export const canManageInvites = rule()(
  async (_parent, _args, { permissions }: Context) =>
    hasPermission(permissions, ServerPermission.ManageInvites)
);

export const canManagePosts = rule()(
  async (_parent, _args, { permissions }: Context) =>
    hasPermission(permissions, ServerPermission.ManagePosts)
);

export const canManageServerRoles = rule()(
  async (_parent, _args, { permissions }: Context) =>
    hasPermission(permissions, ServerPermission.ManageRoles)
);

export const canBanMembers = rule()(
  async (_parent, _args, { permissions }: Context) =>
    hasPermission(permissions, ServerPermission.BanMembers)
);

export const canUpdateGroup = rule()(
  async (
    _parent,
    { groupData }: { groupData: UpdateGroupInput },
    { permissions }: Context
  ) => hasPermission(permissions, GroupPermission.UpdateGroup, groupData.id)
);

export const canDeleteGroup = rule()(
  async (_parent, args: { id: number }, { permissions }: Context) =>
    hasPermission(permissions, GroupPermission.DeleteGroup, args.id)
);

export const canManageGroupPosts = rule()(
  async (
    _parent,
    args: { id: number },
    { permissions, services: { postsService } }: Context
  ) => {
    const { groupId } = await postsService.getPost(args.id);
    return hasPermission(permissions, GroupPermission.ManagePosts, groupId);
  }
);

export const canManageGroupRoles = rule()(
  async (
    parent,
    args: { roleData: CreateRoleInput | UpdateRoleInput } | { id: number },
    { permissions, services: { rolesService } }: Context,
    info
  ) => {
    let groupId: number | undefined;

    if ("roleData" in args) {
      if (info.fieldName === "createRole" && "groupId" in args.roleData) {
        groupId = args.roleData.groupId;
      }
      if (info.fieldName === "updateRole" && "id" in args.roleData) {
        const role = await rolesService.getRole(args.roleData.id);
        groupId = role.groupId;
      }
    } else if (["role", "deleteRole"].includes(info.fieldName)) {
      const role = await rolesService.getRole(args.id);
      groupId = role.groupId;
    }
    if (info.fieldName === "roles") {
      const { id } = parent as Group;
      groupId = id;
    }

    return hasPermission(permissions, GroupPermission.ManageRoles, groupId);
  }
);

export const canApproveGroupMemberRequests = rule()(
  async (
    parent,
    args,
    { permissions, services: { memberRequestsService } }: Context,
    info
  ) => {
    let groupId: number | undefined;

    if (info.fieldName === "approveMemberRequest") {
      const memberRequest = await memberRequestsService.getMemberRequest(
        { id: args.id },
        ["group"]
      );
      groupId = memberRequest?.group.id;
    }
    if (
      ["memberRequests", "memberRequestCount"].includes(info.fieldName) &&
      info.parentType.name === Group.name
    ) {
      const group = parent as Group;
      groupId = group.id;
    }

    return hasPermission(
      permissions,
      GroupPermission.ApproveMemberRequests,
      groupId
    );
  }
);

export const isAuthenticated = rule({ cache: "contextual" })(
  async (_parent, _args, { user }: Context) => {
    if (!user) {
      return UNAUTHORIZED;
    }
    return true;
  }
);

export const hasValidRefreshToken = rule()(
  async (
    _parent,
    _args,
    {
      claims: { refreshTokenClaims },
      services: { refreshTokensService },
    }: Context
  ) => {
    const jti = getJti(refreshTokenClaims);
    const sub = getSub(refreshTokenClaims);
    if (!jti || !sub) {
      return UNAUTHORIZED;
    }
    return refreshTokensService.validateRefreshToken(jti, sub);
  }
);

export const isOwnPost = rule()(
  async (_parent, args, { user, services: { usersService } }: Context) => {
    if (!user) {
      return UNAUTHORIZED;
    }
    return usersService.isUsersPost(args.id, user.id);
  }
);

export const isPublicGroup = rule()(
  async (_parent, args, { services: { groupsService } }: Context) => {
    const group = await groupsService.getGroup(
      { id: args.id, name: args.name },
      ["config"]
    );
    return group.config.privacy === GroupPrivacy.Public;
  }
);

export const isPublicGroupPost = rule()(
  async (_parent, args, { services: { postsService } }: Context) => {
    const post = await postsService.getPost(args.id, ["group.config"]);
    if (!post.group) {
      return false;
    }
    return post.group.config.privacy === GroupPrivacy.Public;
  }
);

export const isPublicGroupProposal = rule()(
  async (_parent, args, { services: { proposalsService } }: Context) => {
    const proposal = await proposalsService.getProposal(args.id, [
      "group.config",
    ]);
    return proposal.group.config.privacy === GroupPrivacy.Public;
  }
);

export const isProposalGroupJoinedByMe = rule()(
  async (
    _parent,
    { voteData }: { voteData: CreateVoteInput },
    { user, services: { groupsService, proposalsService } }: Context
  ) => {
    if (!user) {
      return UNAUTHORIZED;
    }
    const { group } = await proposalsService.getProposal(voteData.proposalId, [
      "group",
    ]);
    if (group) {
      const isJoinedByUser = await groupsService.isJoinedByUser(
        group.id,
        user.id
      );
      if (!isJoinedByUser) {
        return "You must be a group member to vote on this proposal";
      }
    }
    return true;
  }
);
