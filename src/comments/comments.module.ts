import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Image } from '../images/models/image.model';
import { NotificationsModule } from '../notifications/notifications.module';
import { Post } from '../posts/models/post.model';
import { PostsModule } from '../posts/posts.module';
import { Proposal } from '../proposals/models/proposal.model';
import { ProposalsModule } from '../proposals/proposals.module';
import { CommentsResolver } from './comments.resolver';
import { CommentsService } from './comments.service';
import { Comment } from './models/comment.model';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, Image, Post, Proposal]),
    NotificationsModule,
    PostsModule,
    ProposalsModule,
  ],
  providers: [CommentsService, CommentsResolver],
  exports: [CommentsService],
})
export class CommentsModule {}
