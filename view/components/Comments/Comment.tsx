import { useReactiveVar } from '@apollo/client';
import { ThumbUp } from '@mui/icons-material';
import { Box, ButtonBase, SxProps, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TypeNames } from '../../constants/shared.constants';
import { isLoggedInVar, toastVar } from '../../graphql/cache';
import { CommentFragment } from '../../graphql/comments/fragments/gen/Comment.gen';
import { useDeleteCommentMutation } from '../../graphql/comments/mutations/gen/DeleteComment.gen';
import { useLikeCommentMutation } from '../../graphql/comments/mutations/gen/LikeComment.gen';
import { useDeleteLikeMutation } from '../../graphql/likes/mutations/gen/DeleteLike.gen';
import { useIsDesktop } from '../../hooks/shared.hooks';
import { Blurple } from '../../styles/theme';
import { urlifyText } from '../../utils/shared.utils';
import { timeAgo } from '../../utils/time.utils';
import { getUserProfilePath } from '../../utils/user.utils';
import AttachedImageList from '../Images/AttachedImageList';
import Flex from '../Shared/Flex';
import ItemMenu from '../Shared/ItemMenu';
import Link from '../Shared/Link';
import UserAvatar from '../Users/UserAvatar';
import CommentForm from './CommentForm';

interface Props {
  canManageComments: boolean;
  comment: CommentFragment;
  currentUserId?: number;
  postId?: number;
  proposalId?: number;
}

const Comment = ({
  comment,
  canManageComments,
  currentUserId,
  postId,
  proposalId,
}: Props) => {
  const isLoggedIn = useReactiveVar(isLoggedInVar);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [showItemMenu, setShowItemMenu] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [rightLikeCount, setRightLikeCount] = useState(false);

  const [deleteComment, { loading: deleteCommentLoading }] =
    useDeleteCommentMutation();

  const [likeComment, { loading: likeCommentLoading }] =
    useLikeCommentMutation();

  const [unlikeComment, { loading: unlikeCommentLoading }] =
    useDeleteLikeMutation();

  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();

  const {
    id,
    user,
    body,
    images,
    createdAt,
    isLikedByMe,
    likeCount,
    __typename,
  } = comment;

  useEffect(() => {
    if (likeCount && ref.current && ref.current.offsetWidth < 200) {
      setRightLikeCount(true);
    }
  }, [likeCount, ref.current?.offsetWidth]);

  const isMe = user.id === currentUserId;
  const deleteCommentPrompt = t('prompts.deleteItem', { itemType: 'comment' });
  const userPath = getUserProfilePath(user.name);
  const formattedDate = timeAgo(createdAt);

  const itemMenuStyles: SxProps = {
    alignSelf: 'center',
    marginLeft: 0.5,
    width: 40,
    height: 40,
  };

  const getLikeCountText = () => {
    if (likeCount > 99) {
      return '99+';
    }
    return likeCount;
  };

  // TODO: Account for when there are more than 9 likes
  const getLikeCountRightPosition = () => {
    if (rightLikeCount) {
      if (likeCount > 1) {
        return '-35px';
      }
      return '-16px';
    }
    return '0px';
  };

  const getCommentBodyRightMargin = () => {
    if (rightLikeCount) {
      if (likeCount > 1) {
        return '35px';
      }
      return '15px';
    }
    return '0px';
  };

  const handleLikeBtnClick = async () => {
    if (!isLoggedIn) {
      toastVar({
        title: t('posts.prompts.loginToLike'),
        status: 'info',
      });
      return;
    }
    const variables = { likeData: { commentId: id } };
    if (isLikedByMe) {
      unlikeComment({
        variables,
        update(cache) {
          const cacheId = cache.identify({ id, __typename });
          cache.modify({
            id: cacheId,
            fields: {
              isLikedByMe: () => false,
              likeCount: (existingCount: number) => existingCount - 1,
            },
          });
        },
      });
      return;
    }
    await likeComment({
      variables,
      update(cache) {
        const cacheId = cache.identify({ id, __typename });
        cache.modify({
          id: cacheId,
          fields: {
            isLikedByMe: () => true,
            likeCount: (existingCount: number) => existingCount + 1,
          },
        });
      },
    });
  };

  const handleDelete = async () =>
    await deleteComment({
      variables: { id },
      update(cache) {
        if (postId) {
          cache.modify({
            id: cache.identify({ id: postId, __typename: TypeNames.Post }),
            fields: {
              commentCount(existingCount: number) {
                return Math.max(0, existingCount - 1);
              },
            },
          });
        }
        if (proposalId) {
          cache.modify({
            id: cache.identify({
              id: proposalId,
              __typename: TypeNames.Proposal,
            }),
            fields: {
              commentCount(existingCount: number) {
                return Math.max(0, existingCount - 1);
              },
            },
          });
        }
        const cacheId = cache.identify({ __typename, id });
        cache.evict({ id: cacheId });
        cache.gc();
      },
      onCompleted() {
        setMenuAnchorEl(null);
      },
      onError(err) {
        toastVar({
          status: 'error',
          title: err.message,
        });
        setMenuAnchorEl(null);
      },
    });

  if (showEditForm) {
    return (
      <CommentForm
        editComment={comment}
        onSubmit={() => {
          setShowEditForm(false);
          setMenuAnchorEl(null);
        }}
        enableAutoFocus
        expanded
      />
    );
  }

  return (
    <Flex
      marginBottom={1.25}
      onMouseEnter={() => setShowItemMenu(true)}
      onMouseLeave={() => setShowItemMenu(false)}
    >
      <UserAvatar
        sx={{ marginRight: 1, marginTop: 0.2 }}
        user={user}
        size={35}
        withLink
      />

      <Box maxWidth={isDesktop ? 'calc(100% - 90px)' : undefined}>
        <Flex>
          <Box
            bgcolor="background.secondary"
            borderRadius={4}
            marginRight={getCommentBodyRightMargin()}
            minWidth="85px"
            paddingX={1.5}
            paddingY={1}
            position="relative"
            ref={ref}
          >
            <Link href={userPath} sx={{ fontFamily: 'Inter Medium' }}>
              {user.name}
            </Link>

            {body && (
              <Typography
                dangerouslySetInnerHTML={{ __html: urlifyText(body) }}
                whiteSpace="pre-wrap"
                lineHeight={1.2}
                paddingY={0.4}
              />
            )}

            {!!images.length && (
              <AttachedImageList
                images={images}
                width={250}
                paddingX={2}
                paddingBottom={1}
                paddingTop={1.5}
              />
            )}

            {!!likeCount && (
              <Flex
                position="absolute"
                right={getLikeCountRightPosition()}
                bottom={rightLikeCount ? '5px' : '-15px'}
                boxShadow={1}
                bgcolor="background.secondary"
                alignItems="center"
                borderRadius="50px"
                padding="2px"
                gap="6px"
              >
                <Box
                  bgcolor={Blurple.Marina}
                  borderRadius="50%"
                  display="inline-flex"
                  justifyContent="center"
                  width="22px"
                  height="22px"
                >
                  <ThumbUp
                    sx={{
                      fontSize: 13,
                      marginTop: 0.55,
                      marginLeft: '1px',
                      color: 'text.primary',
                    }}
                  />
                </Box>
                {likeCount > 1 && (
                  <Typography fontSize="13px" paddingRight="5px">
                    {getLikeCountText()}
                  </Typography>
                )}
              </Flex>
            )}
          </Box>

          {showItemMenu && (
            <ItemMenu
              anchorEl={menuAnchorEl}
              buttonStyles={itemMenuStyles}
              canDelete={isMe || canManageComments}
              canUpdate={isMe}
              deleteItem={handleDelete}
              deletePrompt={deleteCommentPrompt}
              loading={deleteCommentLoading}
              onEditButtonClick={() => setShowEditForm(true)}
              setAnchorEl={setMenuAnchorEl}
            />
          )}
        </Flex>

        <Flex paddingLeft="12px" paddingTop="4px" gap="8px">
          <Typography fontSize="13px" color="text.secondary" lineHeight={1}>
            {formattedDate}
          </Typography>
          <ButtonBase
            disabled={likeCommentLoading || unlikeCommentLoading}
            onClick={handleLikeBtnClick}
            sx={{
              borderRadius: '2px',
              color: isLikedByMe ? Blurple.Marina : 'text.secondary',
              fontFamily: 'Inter Medium',
              lineHeight: 1,
              paddingX: '4px',
            }}
          >
            {t('actions.like')}
          </ButtonBase>
        </Flex>
      </Box>
    </Flex>
  );
};

export default Comment;
