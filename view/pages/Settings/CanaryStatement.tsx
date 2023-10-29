import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import LevelOneHeading from '../../components/Shared/LevelOneHeading';
import ProgressBar from '../../components/Shared/ProgressBar';
import { useCanaryStatementQuery } from '../../graphql/settings/queries/gen/CanaryStatement.gen';
import { formatDate } from '../../utils/time.utils';

const CanaryStatement = () => {
  const { data, loading, error } = useCanaryStatementQuery();
  const { t } = useTranslation();

  if (error) {
    return <Typography>{t('errors.somethingWentWrong')}</Typography>;
  }

  if (loading) {
    return <ProgressBar />;
  }

  if (!data) {
    return null;
  }

  const {
    serverConfig: { canaryStatement, showCanary, canaryUpdatedAt },
  } = data;

  const formattedUpdatedAt = formatDate(canaryUpdatedAt);
  const updatedAtMessage = t('canary.labels.updatedAt', {
    updatedAt: formattedUpdatedAt,
  });

  return (
    <>
      <LevelOneHeading header>
        {t('canary.headers.canaryStatement')}
      </LevelOneHeading>

      {showCanary && canaryStatement ? (
        <Box>
          <Typography marginBottom={1.5}>{canaryStatement}</Typography>
          <Typography color="text.secondary">{updatedAtMessage}</Typography>
        </Box>
      ) : (
        <Typography>{t('canary.prompts.canaryStatementMissing')}</Typography>
      )}
    </>
  );
};

export default CanaryStatement;
