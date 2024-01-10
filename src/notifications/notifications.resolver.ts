import { Inject } from '@nestjs/common';
import {
  Args,
  Context,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Dataloaders } from '../dataloader/dataloader.types';
import { Group } from '../groups/models/group.model';
import { Post } from '../posts/models/post.model';
import { Proposal } from '../proposals/models/proposal.model';
import { User } from '../users/models/user.model';
import { Notification } from './models/notification.model';
import { ReadNotificationsPayload } from './models/read-notifications.payload';
import { UpdateNotificationInput } from './models/update-notification.input';
import { UpdateNotificationPayload } from './models/update-notification.payload';
import { NotificationStatus } from './notifications.constants';
import { NotificationsService } from './notifications.service';

@Resolver(() => Notification)
export class NotificationsResolver {
  constructor(
    @Inject('PUB_SUB') private pubSub: PubSub,
    private notificationsService: NotificationsService,
  ) {}

  @Query(() => [Notification])
  notifications(
    @CurrentUser() user: User,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    return this.notificationsService.getNotifications(user.id, offset, limit);
  }

  @Query(() => Int)
  notificationsCount(@CurrentUser() user: User) {
    return this.notificationsService.getNotificationsCount({ userId: user.id });
  }

  @Query(() => Int)
  unreadNotificationsCount(@CurrentUser() user: User) {
    return this.notificationsService.getNotificationsCount({
      status: NotificationStatus.Unread,
      userId: user.id,
    });
  }

  @ResolveField(() => User, { nullable: true })
  otherUser(
    @Context() { loaders }: { loaders: Dataloaders },
    @Parent() { otherUserId }: Notification,
  ) {
    return otherUserId ? loaders.usersLoader.load(otherUserId) : null;
  }

  @ResolveField(() => Group, { nullable: true })
  group(
    @Context() { loaders }: { loaders: Dataloaders },
    @Parent() { groupId }: Notification,
  ) {
    return groupId ? loaders.groupsLoader.load(groupId) : null;
  }

  @ResolveField(() => Proposal, { nullable: true })
  proposal(
    @Context() { loaders }: { loaders: Dataloaders },
    @Parent() { proposalId }: Notification,
  ) {
    return proposalId ? loaders.proposalsLoader.load(proposalId) : null;
  }

  @ResolveField(() => Post, { nullable: true })
  post(
    @Context() { loaders }: { loaders: Dataloaders },
    @Parent() { postId }: Notification,
  ) {
    return postId ? loaders.postsLoader.load(postId) : null;
  }

  @Mutation(() => UpdateNotificationPayload)
  updateNotification(
    @Args('notificationData') notificationData: UpdateNotificationInput,
  ) {
    return this.notificationsService.updateNotification(notificationData);
  }

  @Mutation(() => ReadNotificationsPayload)
  readNotifications(
    @CurrentUser() user: User,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    return this.notificationsService.readNotifications(user.id, offset, limit);
  }

  @Mutation(() => Boolean)
  deleteNotification(@Args('id', { type: () => Int }) id: number) {
    return this.notificationsService.deleteNotification(id);
  }

  @Mutation(() => Boolean)
  clearNotifications(@CurrentUser() user: User) {
    return this.notificationsService.clearNotifications(user.id);
  }

  @Subscription(() => Notification)
  notification(@CurrentUser() user: User) {
    return this.pubSub.asyncIterator(`user-notification-${user.id}`);
  }
}
