import React, { useEffect, useMemo } from 'react';
import { Box, makeStyles } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ZILO_DATA } from 'core/zilo/constants';
import { ILOCard, SampleILOCard, SampleILOCardv2, Text } from 'app/components';
import { TokenILOCard, TokenILOCardv2 } from 'app/components/TokenILOCard';
import ILOPage from 'app/layouts/ILOPage';
import { RootState, WalletState } from 'app/store/types';
import { AppTheme } from 'app/theme/types';
import { useNetwork, useBlockTime } from 'app/utils';

const useStyles = makeStyles((theme: AppTheme) => ({
  container: {
    padding: theme.spacing(4, 4, 0),
    [theme.breakpoints.down('xs')]: {
      padding: theme.spacing(4, 2, 0),
    },
  },
  secondaryText: {
    marginTop: theme.spacing(1),
  },
  link: {
    color: theme.palette.link,
    '&:hover': {
      textDecoration: 'underline',
    },
  },
}));

const CurrentView: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props: any) => {
  const { children, className, ...rest } = props;

  const classes = useStyles();
  const network = useNetwork();
  const walletState = useSelector<RootState, WalletState>(state => state.wallet);
  const [blockTime, currentBlock, currentTime] = useBlockTime();
  const ziloData = useMemo(
    () => ZILO_DATA[network!].filter(x => currentTime.isBefore(x.showUntil)),
    [network, currentTime]
  );

  useEffect(() => {
    // need to listen to wallet state
    // to trigger react component reload
    // when network changes.
  }, [walletState]);

  return (
    <ILOPage {...rest}>
      {ziloData.length === 0 ? (
        <ILOCard>
          <Box
            display="flex"
            flexDirection="column"
            className={classes.container}
            textAlign="center"
            mb={4}
          >
            <Text variant="h1">No active listings.</Text>
            <Text className={classes.secondaryText} color="textSecondary">
              Click{' '}
              <Link to="/zilo/past" className={classes.link}>
                here
              </Link>{' '}
              to view past ILOs.
            </Text>
          </Box>
        </ILOCard>
      ) : (
        ziloData.map(data =>
          data.comingSoon ? (
            data.version === 1 ? (
              <ILOCard>
                <SampleILOCard
                  key={data.contractAddress}
                  expanded={true}
                  data={data}
                  blockTime={blockTime}
                  currentBlock={currentBlock}
                  currentTime={currentTime}
                />
              </ILOCard>
            ) : (
              <ILOCard>
                <SampleILOCardv2
                  key={data.contractAddress}
                  expanded={true}
                  data={data}
                  blockTime={blockTime}
                  currentBlock={currentBlock}
                  currentTime={currentTime}
                />
              </ILOCard>
            )
          ) : (
            <ILOCard>
              {data.version === 1 ? (
                <TokenILOCard
                  key={data.contractAddress}
                  expanded={true}
                  data={data}
                  blockTime={blockTime}
                  currentBlock={currentBlock}
                  currentTime={currentTime}
                />
              ) : (
                <TokenILOCardv2
                  key={data.contractAddress}
                  expanded={true}
                  data={data}
                  blockTime={blockTime}
                  currentBlock={currentBlock}
                  currentTime={currentTime}
                />
              )}
            </ILOCard>
          )
        )
      )}
    </ILOPage>
  );
};

export default CurrentView;
