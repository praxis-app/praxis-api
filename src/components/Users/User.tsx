import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/client";
import { makeStyles, Theme, createStyles } from "@material-ui/core/styles";
import {
  Card,
  CardActions,
  CardHeader,
  Avatar,
  CardContent,
} from "@material-ui/core";
import { Edit, Delete } from "@material-ui/icons";

import FollowButton from "../Follows/FollowButton";

import { FOLLOWERS, FOLLOWING } from "../../apollo/client/queries";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      maxWidth: 330,
      marginBottom: 12,
      backgroundColor: "rgb(65, 65, 65)",
    },
    title: {
      fontFamily: "Inter",
    },
    subheader: {
      fontFamily: "Inter",
      color: "rgb(195, 195, 195)",
    },
  })
);

interface Props {
  user: User;
  deleteUser: (id: string) => void;
}

const Show = ({ user, deleteUser }: Props) => {
  const { name, email, id, createdAt } = user;
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const followersRes = useQuery(FOLLOWERS, {
    variables: { userId: id },
  });
  const followingRes = useQuery(FOLLOWING, {
    variables: { userId: id },
  });

  const classes = useStyles();
  const date = new Date(parseInt(createdAt)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    setFollowers(followersRes.data ? followersRes.data.userFollowers : []);
  }, [followersRes.data]);

  useEffect(() => {
    setFollowing(followingRes.data ? followingRes.data.userFollowing : []);
  }, [followingRes.data]);

  return (
    <Card className={classes.root}>
      <CardHeader
        avatar={
          <Link href={`/users/${name}`}>
            <a>
              <Avatar style={{ backgroundColor: "white", color: "black" }}>
                {name[0].charAt(0).toUpperCase()}
              </Avatar>
            </a>
          </Link>
        }
        action={<FollowButton userId={id} />}
        title={
          <Link href={`/users/${name}`}>
            <a>
              {name} · {email}
            </a>
          </Link>
        }
        subheader={`Joined ${date}`}
        classes={{ title: classes.title, subheader: classes.subheader }}
      />

      <CardContent>
        <Link href={`/users/${name}/followers`}>
          <a>{followers?.length} Followers</a>
        </Link>

        <span style={{ color: "white" }}> · </span>

        <Link href={`/users/${name}/following`}>
          <a>{following?.length} Following</a>
        </Link>
      </CardContent>

      <CardActions>
        <Link href={`/users/edit/${name}`}>
          <a>
            <Edit /> Edit
          </a>
        </Link>

        <Link href="/users">
          <a
            onClick={() =>
              window.confirm("Are you sure you want to delete this user?") &&
              deleteUser(id)
            }
          >
            <Delete /> Delete
          </a>
        </Link>
      </CardActions>
    </Card>
  );
};

export default Show;
