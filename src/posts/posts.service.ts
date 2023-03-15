import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FileUpload } from "graphql-upload";
import { FindOptionsWhere, In, Repository } from "typeorm";
import { deleteImageFile, saveImage } from "../images/image.utils";
import { ImagesService } from "../images/images.service";
import { Image } from "../images/models/image.model";
import { LikesService } from "../likes/likes.service";
import { User } from "../users/models/user.model";
import { CreatePostInput } from "./models/create-post.input";
import { Post } from "./models/post.model";
import { UpdatePostInput } from "./models/update-post.input";

type PostWithLikeCount = Post & { likeCount: number };

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private repository: Repository<Post>,
    private imagesService: ImagesService,
    private likesService: LikesService
  ) {}

  async getPost(id: number) {
    return this.repository.findOne({ where: { id } });
  }

  async getPosts(where?: FindOptionsWhere<Post>) {
    return this.repository.find({ where, order: { createdAt: "DESC" } });
  }

  async getPostImagesByBatch(postIds: number[]) {
    const images = await this.imagesService.getImages({
      postId: In(postIds),
    });
    const mappedImages = postIds.map(
      (id) =>
        images.filter((image: Image) => image.postId === id) ||
        new Error(`Could not load images for post: ${id}`)
    );
    return mappedImages;
  }

  async getPostLikesByBatch(postIds: number[]) {
    const likes = await this.likesService.getLikes({
      postId: In(postIds),
    });
    const mappedLikes = postIds.map(
      (id) =>
        likes.filter((image: Image) => image.postId === id) ||
        new Error(`Could not load likes for post: ${id}`)
    );
    return mappedLikes;
  }

  async getPostLikesCountByBatch(postIds: number[]) {
    const posts = (await this.repository
      .createQueryBuilder("post")
      .leftJoinAndSelect("post.likes", "like")
      .loadRelationCountAndMap("post.likeCount", "post.likes")
      .select(["post.id"])
      .whereInIds(postIds)
      .getMany()) as PostWithLikeCount[];

    return postIds.map((id) => {
      const post = posts.find((post: Post) => post.id === id);
      if (!post) {
        return new Error(`Could not load likes count: ${id}`);
      }
      return post.likeCount;
    });
  }

  async createPost({ images, ...postData }: CreatePostInput, user: User) {
    const post = await this.repository.save({ ...postData, userId: user.id });

    if (images) {
      try {
        await this.savePostImages(post.id, images);
      } catch (err) {
        await this.deletePost(post.id);
        throw new Error(err.message);
      }
    }
    return { post };
  }

  async updatePost({ id, images, ...data }: UpdatePostInput) {
    await this.repository.update(id, data);
    const post = await this.getPost(id);
    if (post && images) {
      await this.savePostImages(post.id, images);
    }
    return { post };
  }

  async savePostImages(postId: number, images: Promise<FileUpload>[]) {
    for (const image of images) {
      const filename = await saveImage(image);
      await this.imagesService.createImage({ filename, postId });
    }
  }

  async deletePost(postId: number) {
    const images = await this.imagesService.getImages({ postId });
    for (const { filename } of images) {
      await deleteImageFile(filename);
    }
    await this.repository.delete(postId);
    return true;
  }
}
