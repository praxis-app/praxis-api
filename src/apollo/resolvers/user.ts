import { UserInputError } from "apollo-server-micro";
import { GraphQLUpload } from "apollo-server-micro";
import saveImage from "../../utils/saveImage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import prisma from "../../utils/initPrisma";
import { validateSignup, validateLogin } from "../../utils/validation";
import { Common } from "../../constants";

const saveProfilePicture = async (user: any, image: any) => {
  if (image) {
    const path = await saveImage(image);
    await prisma.image.create({
      data: {
        user: {
          connect: {
            id: user.id,
          },
        },
        profilePicture: true,
        path,
      },
    });
  }
};

const userResolvers = {
  FileUpload: GraphQLUpload,

  Query: {
    homeFeed: async (_: any, { userId }: { userId: string }) => {
      try {
        let feed: BackendFeedItem[] = [];

        if (userId) {
          // Users own posts
          const ownPosts = await prisma.post.findMany({
            where: {
              userId: parseInt(userId),
            },
          });
          feed = [...feed, ...ownPosts];

          // Followed feed items
          const userWithFollowing = await prisma.user.findFirst({
            where: {
              id: parseInt(userId),
            },
            include: {
              following: true,
            },
          });
          if (userWithFollowing)
            for (const follow of userWithFollowing.following) {
              let userWithFeedItems;
              if (follow.userId)
                userWithFeedItems = await prisma.user.findFirst({
                  where: {
                    id: follow.userId,
                  },
                  include: {
                    posts: true,
                    motions: true,
                  },
                });
              if (userWithFeedItems)
                feed = [
                  ...feed,
                  ...userWithFeedItems.posts.filter(
                    (post) => post.groupId === null
                  ),
                  ...userWithFeedItems.motions.map((motion) => ({
                    ...motion,
                    __typename: Common.TypeNames.Motion,
                  })),
                ];
            }
          // Group feed items
          const groupMembers = await prisma.groupMember.findMany({
            where: {
              userId: parseInt(userId),
            },
          });
          for (const groupMember of groupMembers) {
            const whereGroupId = {
              where: {
                groupId: groupMember.groupId,
              },
            };
            const groupPosts = await prisma.post.findMany(whereGroupId);
            const groupMotions = await prisma.motion.findMany(whereGroupId);
            if (groupPosts.length) feed = [...feed, ...groupPosts];
            if (groupMotions.length)
              feed = [
                ...feed,
                ...groupMotions.map((motion) => ({
                  ...motion,
                  __typename: Common.TypeNames.Motion,
                })),
              ];
          }
          feed.forEach((item) => {
            if (!item.__typename) item.__typename = Common.TypeNames.Post;
          });
          const uniq: BackendFeedItem[] = [];
          for (const item of feed) {
            if (
              !uniq.find(
                (uniqItem) =>
                  item.id === uniqItem.id &&
                  item.__typename === uniqItem.__typename
              )
            )
              uniq.push(item);
          }
          feed = uniq;
        } else {
          // Logged out home feed
          const posts: BackendPost[] = await prisma.post.findMany();
          const motions: BackendMotion[] = await prisma.motion.findMany();
          posts.forEach((item) => {
            item.__typename = Common.TypeNames.Post;
          });
          motions.forEach((item) => {
            item.__typename = Common.TypeNames.Motion;
          });

          feed = [...posts, ...motions];
        }

        return feed.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        );
      } catch (error) {
        throw error;
      }
    },

    user: async (_: any, { id }: { id: string }) => {
      try {
        const user = await prisma.user.findFirst({
          where: {
            id: parseInt(id),
          },
        });
        return user;
      } catch (error) {
        throw error;
      }
    },

    userByName: async (_: any, { name }: { name: string }) => {
      try {
        const user = await prisma.user.findFirst({
          where: {
            name: name,
          },
        });
        return user;
      } catch (error) {
        throw error;
      }
    },

    allUsers: async () => {
      try {
        const users = await prisma.user.findMany();
        return users;
      } catch (error) {
        throw error;
      }
    },
  },

  Mutation: {
    async signUp(_: any, { input }: { input: SignUpInput }) {
      const { email, name, password, profilePicture } = input;
      const { errors, isValid } = validateSignup(input);

      if (!isValid) {
        throw new UserInputError(JSON.stringify(errors));
      }

      try {
        const userFound = await prisma.user.findMany({
          where: {
            email: email,
          },
        });

        if (userFound.length > 0) {
          throw new UserInputError("Email already exists.");
        }

        const hash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
          data: {
            email: email,
            name: name,
            password: hash,
          },
        });

        await saveProfilePicture(user, profilePicture);

        const jwtPayload = {
          id: user.id,
          name: user.name,
          email: user.email,
        };

        const token = jwt.sign(jwtPayload, process.env.JWT_KEY as string, {
          expiresIn: "90d",
        });

        return { user, token };
      } catch (err) {
        throw new Error(err);
      }
    },

    async signIn(_: any, { input }: { input: SignInInput }) {
      const { errors, isValid } = validateLogin(input);
      const { email, password } = input;

      if (!isValid) {
        throw new UserInputError(JSON.stringify(errors));
      }

      try {
        const user = await prisma.user.findFirst({
          where: {
            email: email,
          },
        });
        if (!user) {
          throw new UserInputError("No user exists with that email");
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
          const jwtPayload = {
            id: user.id,
            name: user.name,
            email: user.email,
          };
          const token = jwt.sign(jwtPayload, process.env.JWT_KEY as string, {
            expiresIn: "90d",
          });

          return { user, token };
        } else {
          throw new UserInputError("Wrong password. Try again");
        }
      } catch (err) {
        throw new Error(err);
      }
    },

    async updateUser(
      _: any,
      { id, input }: { id: string; input: SignUpInput }
    ) {
      const { email, name, profilePicture } = input;

      try {
        const user = await prisma.user.update({
          where: { id: parseInt(id) },
          data: { email: email, name: name },
        });

        if (!user) throw new Error("User not found.");

        await saveProfilePicture(user, profilePicture);

        const jwtPayload = {
          name: user.name,
          email: user.email,
          id: user.id,
        };

        const token = jwt.sign(jwtPayload, process.env.JWT_KEY as string, {
          expiresIn: "90d",
        });

        return { user, token };
      } catch (err) {
        throw new Error(err);
      }
    },

    async deleteUser(_: any, { id }: { id: string }) {
      try {
        await prisma.user.delete({
          where: { id: parseInt(id) },
        });
        return true;
      } catch (err) {
        throw new Error(err);
      }
    },
  },
};

export default userResolvers;
