import { Reference } from '@apollo/client';
import { PanTool, ThumbDown, ThumbsUpDown, ThumbUp } from '@mui/icons-material';
import { Menu, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { toastVar } from '../../graphql/cache';
import { ProposalCardFragment } from '../../graphql/proposals/fragments/gen/ProposalCard.gen';
import { useRolesByGroupIdLazyQuery } from '../../graphql/roles/queries/gen/RolesByGroupId.gen';
import {
  CreateVoteMutation,
  useCreateVoteMutation,
} from '../../graphql/votes/mutations/gen/CreateVote.gen';
import { useDeleteVoteMutation } from '../../graphql/votes/mutations/gen/DeleteVote.gen';
import {
  UpdateVoteMutation,
  useUpdateVoteMutation,
} from '../../graphql/votes/mutations/gen/UpdateVote.gen';
import {
  DecisionMakingModel,
  ProposalActionType,
  ProposalStage,
} from '../../constants/proposal.constants';
import { NavigationPaths } from '../../constants/shared.constants';
import { VoteTypes } from '../../constants/vote.constants';
import { Blurple } from '../../styles/theme';
import { getGroupPath } from '../../utils/group.utils';

const ICON_STYLES = {
  fontSize: 20,
  marginRight: 1,
};

interface Props {
  proposal: ProposalCardFragment;
  anchorEl: null | HTMLElement;
  onClose(): void;
}

const VoteMenu = ({ anchorEl, onClose, proposal }: Props) => {
  const [createVote] = useCreateVoteMutation();
  const [deleteVote] = useDeleteVoteMutation();
  const [updateVote] = useUpdateVoteMutation();

  const [getGroupRoles] = useRolesByGroupIdLazyQuery();

  const { pathname } = useLocation();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { myVote } = proposal;
  const isMajorityVote =
    proposal.settings.decisionMakingModel === DecisionMakingModel.MajorityVote;

  const getMenuItemStyles = (voteType: string) => {
    if (!myVote || myVote.voteType !== voteType) {
      return;
    }
    return { color: Blurple.Marina };
  };

  const handleCompleted = async (
    data: CreateVoteMutation | UpdateVoteMutation,
  ) => {
    const {
      vote: { proposal },
    } = 'createVote' in data ? data.createVote : data.updateVote;
    if (!proposal) {
      return;
    }
    const {
      action: { actionType },
      group,
      stage,
    } = proposal;

    const isRatified = stage === ProposalStage.Ratified;

    if (isRatified) {
      const isRoleProposal =
        actionType === ProposalActionType.CreateRole ||
        actionType === ProposalActionType.ChangeRole;

      // Load group roles if a role was added or changed
      if (isRoleProposal && group) {
        await getGroupRoles({ variables: { id: group.id } });
      }

      toastVar({
        status: 'info',
        title: t('proposals.toasts.ratifiedSuccess'),
      });
    }

    if (
      pathname.includes(NavigationPaths.Groups) &&
      actionType === ProposalActionType.ChangeName &&
      isRatified &&
      group
    ) {
      const groupPath = getGroupPath(group.name);
      navigate(groupPath);
    }
  };

  const handleCreate = async (voteType: string) =>
    await createVote({
      variables: {
        voteData: {
          proposalId: proposal.id,
          voteType,
        },
      },
      update(cache, { data }) {
        if (!data) {
          return;
        }
        const {
          createVote: { vote },
        } = data;

        cache.modify({
          id: cache.identify(proposal),
          fields: {
            votes(existingVoteRefs: Reference[], { toReference }) {
              return [toReference(vote), ...existingVoteRefs];
            },
          },
        });
      },
      onCompleted: handleCompleted,
      onError(err) {
        toastVar({
          status: 'error',
          title: err.message,
        });
      },
    });

  const handleUpdate = async (id: number, voteType: string) =>
    await updateVote({
      variables: {
        voteData: { id, voteType },
      },
      onCompleted: handleCompleted,
      onError(err) {
        toastVar({
          status: 'error',
          title: err.message,
        });
      },
    });

  const handleDelete = async (id: number) =>
    await deleteVote({
      variables: { id },
      update(cache) {
        cache.modify({
          id: cache.identify(proposal),
          fields: {
            votes(existingVoteRefs: Reference[], { readField }) {
              return existingVoteRefs.filter(
                (ref) => readField('id', ref) !== id,
              );
            },
            voteCount(existingCount: number) {
              return Math.max(0, existingCount - 1);
            },
          },
        });
      },
      onError(err) {
        toastVar({
          status: 'error',
          title: err.message,
        });
      },
    });

  const handleClick = (voteType: string) => async () => {
    onClose();

    if (myVote && myVote.voteType !== voteType) {
      await handleUpdate(myVote.id, voteType);
      return;
    }
    if (myVote) {
      await handleDelete(myVote.id);
      return;
    }
    await handleCreate(voteType);
  };

  return (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        horizontal: 'left',
        vertical: 'bottom',
      }}
      transformOrigin={{
        horizontal: 'left',
        vertical: 'top',
      }}
      onClose={onClose}
      open={!!anchorEl}
      keepMounted
    >
      <MenuItem
        onClick={handleClick(VoteTypes.Agreement)}
        sx={getMenuItemStyles(VoteTypes.Agreement)}
      >
        <ThumbUp sx={ICON_STYLES} />
        {t('votes.actions.agree')}
      </MenuItem>

      {isMajorityVote ? (
        <MenuItem
          onClick={handleClick(VoteTypes.Disagreement)}
          sx={getMenuItemStyles(VoteTypes.Disagreement)}
        >
          <ThumbDown sx={ICON_STYLES} />
          {t('votes.actions.disagree')}
        </MenuItem>
      ) : (
        [
          <MenuItem
            key={VoteTypes.StandAside}
            onClick={handleClick(VoteTypes.StandAside)}
            sx={getMenuItemStyles(VoteTypes.StandAside)}
          >
            <ThumbDown sx={ICON_STYLES} />
            {t('votes.actions.standAside')}
          </MenuItem>,

          <MenuItem
            key={VoteTypes.Reservations}
            onClick={handleClick(VoteTypes.Reservations)}
            sx={getMenuItemStyles(VoteTypes.Reservations)}
          >
            <ThumbsUpDown sx={ICON_STYLES} />
            {t('votes.actions.reservations')}
          </MenuItem>,

          <MenuItem
            key={VoteTypes.Block}
            onClick={handleClick(VoteTypes.Block)}
            sx={getMenuItemStyles(VoteTypes.Block)}
          >
            <PanTool sx={ICON_STYLES} />
            {t('votes.actions.block')}
          </MenuItem>,
        ]
      )}
    </Menu>
  );
};

export default VoteMenu;
