import { Card, Tab, Tabs, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GroupsPageTabs } from '../../constants/group.constants';
import {
  DEFAULT_PAGE_SIZE,
  NavigationPaths,
  TAB_QUERY_PARAM,
} from '../../constants/shared.constants';
import { HomeFeedType } from '../../graphql/gen';
import { useHomeFeedLazyQuery } from '../../graphql/users/queries/gen/HomeFeed.gen';
import { isDeniedAccess } from '../../utils/error.utils';
import Feed from '../Shared/Feed';
import Link from '../Shared/Link';

const HomeFeed = () => {
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState(0);

  const [getHomeFeed, { data, loading, error }] = useHomeFeedLazyQuery();

  const { t } = useTranslation();

  const groupsPathPrefix = `${NavigationPaths.Groups}${TAB_QUERY_PARAM}`;
  const allGroupsTab = `${groupsPathPrefix}${GroupsPageTabs.AllGroups}`;

  const getFeedType = useCallback((): HomeFeedType => {
    switch (tab) {
      case 1:
        return 'PROPOSALS';
      case 2:
        return 'FOLLOWING';
      default:
        return 'YOUR_FEED';
    }
  }, [tab]);

  useEffect(() => {
    getHomeFeed({
      variables: {
        input: {
          limit: rowsPerPage,
          offset: page * rowsPerPage,
          feedType: getFeedType(),
        },
      },
    });
  }, [getHomeFeed, rowsPerPage, page, getFeedType]);

  const handleChangePage = async (newPage: number) => {
    await getHomeFeed({
      variables: {
        input: {
          limit: rowsPerPage,
          offset: newPage * rowsPerPage,
          feedType: getFeedType(),
        },
      },
    });
  };

  if (isDeniedAccess(error)) {
    return <Typography>{t('prompts.permissionDenied')}</Typography>;
  }
  if (error) {
    return <Typography>{t('errors.somethingWentWrong')}</Typography>;
  }

  return (
    <>
      <Feed
        feedItems={data?.me.homeFeed.nodes}
        isLoading={loading}
        onChangePage={handleChangePage}
        page={page}
        rowsPerPage={rowsPerPage}
        setPage={setPage}
        setRowsPerPage={setRowsPerPage}
        totalCount={data?.me.homeFeed.totalCount}
        tabs={
          <Card>
            <Tabs
              onChange={(_, n) => setTab(n)}
              textColor="inherit"
              value={tab}
              centered
            >
              <Tab label="Your feed" />
              <Tab label="Proposals" />
              <Tab label="Following" />
            </Tabs>
          </Card>
        }
        noContentMessage={
          <>
            <Typography variant="body1" textAlign="center">
              {`${t('users.prompts.readyToExplore')} `}
              <Link
                href={allGroupsTab}
                sx={{ fontFamily: 'Inter Bold', marginRight: '0.5ch' }}
              >
                Join groups
              </Link>
              to populate your feed.
            </Typography>
          </>
        }
      />
    </>
  );
};

export default HomeFeed;
