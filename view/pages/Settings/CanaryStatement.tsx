import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import LevelOneHeading from '../../components/Shared/LevelOneHeading';
import ProgressBar from '../../components/Shared/ProgressBar';
import { useCanaryStatementQuery } from '../../graphql/settings/queries/gen/CanaryStatement.gen';
import { formatDate } from '../../utils/time.utils';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

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

  const urlifyText = (text: string) =>
    text.replace(URL_REGEX, (url) => {
      return (
        '<a href="' +
        url +
        '" rel="noopener noreferrer" target="_blank" style="color:#e4e6ea;">' +
        url +
        '</a>'
      );
    });

  const renderStatement = () => {
    const { publicCanary } = data;

    if (!publicCanary || !publicCanary.statement) {
      return (
        <Typography>{t('canary.prompts.canaryStatementMissing')}</Typography>
      );
    }

    const body = urlifyText(publicCanary.statement);
    const formattedUpdatedAt = formatDate(publicCanary.updatedAt);
    const updatedAtMessage = t('canary.labels.updatedAt', {
      updatedAt: formattedUpdatedAt,
    });

    return (
      <Box paddingTop={1}>
        <Typography whiteSpace="pre-wrap" paddingBottom={3} lineHeight={1}>
          <Box component="span" dangerouslySetInnerHTML={{ __html: body }} />
        </Typography>

        <Typography color="text.secondary">{updatedAtMessage}</Typography>
      </Box>
    );
  };

  return (
    <>
      <LevelOneHeading header>
        {t('canary.headers.canaryStatement')}
      </LevelOneHeading>

      {renderStatement()}
    </>
  );
};

export default CanaryStatement;
