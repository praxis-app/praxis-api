import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/client";
import { Edit, Delete } from "@material-ui/icons";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardActions,
  Typography,
  makeStyles,
  CardHeader,
  CardMedia,
  Avatar,
} from "@material-ui/core";

import ImagesList from "../Images/List";
import { IMAGES_BY_POST_ID, USER } from "../../apollo/client/queries";

const useStyles = makeStyles({
  root: {
    maxWidth: 330,
    marginBottom: 12,
    backgroundColor: "rgb(65, 65, 65)",
  },
  title: {
    fontFamily: "Inter",
  },
});

const Post = ({ post: { id, userId, body }, deletePost }) => {
  const [user, setUser] = useState(null);
  const [images, setImages] = useState([]);
  const imagesRes = useQuery(IMAGES_BY_POST_ID, {
    variables: { postId: id },
  });
  const userRes = useQuery(USER, {
    variables: { id: userId },
  });
  const classes = useStyles();
  const router = useRouter();

  useEffect(() => {
    setUser(userRes.data ? userRes.data.user : null);
  }, [userRes.data]);

  useEffect(() => {
    setImages(imagesRes.data ? imagesRes.data.imagesByPostId : []);
  }, [imagesRes.data]);

  return (
    <div key={id}>
      <Card className={classes.root}>
        <CardHeader
          avatar={
            <Link href={`/users/${user?.name}`}>
              <a>
                <Avatar style={{ backgroundColor: "white", color: "black" }}>
                  {user?.name[0].charAt(0).toUpperCase()}
                </Avatar>
              </a>
            </Link>
          }
          title={
            <Link href={`/users/${user?.name}`}>
              <a>{user?.name}</a>
            </Link>
          }
          classes={{ title: classes.title }}
        />
        <CardContent>
          <Typography
            style={{
              color: "rgb(190, 190, 190)",
              marginTop: "-12px",
              fontFamily: "Inter",
            }}
          >
            {body}
          </Typography>
        </CardContent>

        <CardMedia>
          <ImagesList images={images} />
        </CardMedia>

        <CardActions>
          <Link href={`/posts/edit/${id}`}>
            <a>
              <Edit /> Edit
            </a>
          </Link>

          <Link href={router.asPath}>
            <a
              onClick={() =>
                window.confirm("Are you sure you want to delete this post?") &&
                deletePost(id)
              }
            >
              <Delete /> Delete
            </a>
          </Link>
        </CardActions>
      </Card>
    </div>
  );
};

export default Post;
