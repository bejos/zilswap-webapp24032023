import React, { useEffect, useMemo, useState, Fragment } from "react";
import BigNumber from "bignumber.js"
import {
  Box, Checkbox, Container, FormControl, FormControlLabel, FormLabel,
  InputAdornment, OutlinedInput, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, useMediaQuery, useTheme, Popper, Button, CircularProgress,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { toBech32Address } from "@zilliqa-js/crypto";
import cls from "classnames";
import { useSelector } from "react-redux";
import { Link as RouterLink } from "react-router-dom";
import { ArrowDropDownRounded, ArrowDropUpRounded } from "@material-ui/icons";
import { ArkImageView, CurrencyLogo, Text } from "app/components";
import ArkPage from "app/layouts/ArkPage";
import { getBlockchain } from "app/saga/selectors";
import { CollectionPriceStat, CollectionTokenStat, CollectionWithStats } from "app/store/types";
import { AppTheme } from "app/theme/types";
import { ArkClient } from "core/utilities";
import { bnOrZero, hexToRGBA, useAsyncTask } from "app/utils";
import { REPORT_LEVEL_WARNING, REPORT_LEVEL_SUSPICIOUS } from "app/utils/constants";
import { ReactComponent as WarningIcon } from "app/assets/icons/warning.svg";
import { MoreOptionsPopper } from "./components";
import { ReactComponent as CheckedIcon } from "./checked-icon.svg";
import { ReactComponent as UncheckedIcon } from "./unchecked-icon.svg";
import { ReactComponent as VerifiedBadge } from "./verified-badge.svg";

interface SearchFilters {
  [prop: string]: boolean;
}

interface CollectionStatsKeys {
  priceStatKey: keyof CollectionPriceStat;
  tokenStatKey: keyof CollectionTokenStat;
}

const SEARCH_FILTERS = ["artist", "collection"]

type CellAligns = "right" | "left" | "inherit" | "center" | "justify" | undefined;
interface HeadersProp {
  align: CellAligns;
  value: string;
  statKey?: string;
}

const HEADERS: HeadersProp[] = [
  { align: "left", value: "Collection" },
  { align: "center", value: "7-Day Volume", statKey: "volume" },
  { align: "center", value: "All-Time Volume", statKey: "allTimeVolume" },
  { align: "center", value: "Floor", statKey: "floorPrice" },
  // { align: "center", value: "% Change (24hr / 7day)" },
  { align: "center", value: "Owners", statKey: "holderCount" },
  { align: "center", value: "Collection Size", statKey: "tokenCount" },
  { align: "center", value: "" },
]

const collectionNameIndex = HEADERS.findIndex(h => h.value === "Collection");
const volumeIndex = HEADERS.findIndex(h => h.value === "7-Day Volume");
const allTimeVolumeIndex = HEADERS.findIndex(h => h.value === "All-Time Volume");
const floorIndex = HEADERS.findIndex(h => h.value === "Floor");
const collectionSizeIndex = HEADERS.findIndex(h => h.value === "Collection Size");
const moreOptionsIndex = HEADERS.findIndex(h => h.value === "");

const defaultStatKey = `${HEADERS[allTimeVolumeIndex].statKey}`;

const Discover: React.FC<React.HTMLAttributes<HTMLDivElement>> = (
  props: any
) => {
  const { children, className, ...rest } = props;
  const classes = useStyles();
  const { network } = useSelector(getBlockchain);
  // const { exchangeInfo } = useSelector(getMarketplace);
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down('xs'));
  const [selectedSort, setSelectedSort] = useState<string>(`-${defaultStatKey}`);
  const [runQueryCollections, loading] = useAsyncTask("queryCollections");
  const [search, setSearch] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<SearchFilters>({
    profile: true,
    artist: true,
    collection: true,
  });
  const sortOrder = selectedSort[0] === '-' ? -1 : 1;

  // fetch collections (to use store instead)
  const [collections, setCollections] = useState<CollectionWithStats[]>([]);

  useEffect(() => {
    runQueryCollections(async () => {
      const arkClient = new ArkClient(network);
      const result = await arkClient.listCollection();
      setCollections(result.result.entries);
    });
  }, [network]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchFilter = (value: string) => {
    setSearchFilter(prevState => ({
      ...prevState,
      [value]: !prevState[value]
    }))
  }

  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popper' : undefined;

  const filteredSearch = useMemo(() => {
    const sorted = collections.sort((a, b) => bnOrZero(b.priceStat ? b.priceStat.volume : 0).comparedTo(a.priceStat ? a.priceStat.volume : 0))

    let filteredCollections: CollectionWithStats[] = sorted, filteredArtist: CollectionWithStats[] = sorted, filteredProfile: CollectionWithStats[] = [];

    if (!search.trim().length) return { filteredCollections, filteredArtist, filteredProfile };

    if (searchFilter.collection) {
      filteredCollections = sorted.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));
    }

    if (searchFilter.artist) {
      filteredArtist = sorted.filter(c => c.ownerName?.toLowerCase().includes(search.toLowerCase()));
    }

    return { filteredCollections, filteredArtist, filteredProfile };
  }, [collections, search, searchFilter]);

  const isSm = useMediaQuery((theme: AppTheme) => theme.breakpoints.down("sm"));

  const isSortPriceStats = () => {
    return selectedSort.includes(`${HEADERS[volumeIndex].statKey}`) ||
      selectedSort.includes(`${HEADERS[allTimeVolumeIndex].statKey}`) ||
      selectedSort.includes(`${HEADERS[floorIndex].statKey}`);
  }

  const sortByVolume = (a: CollectionWithStats, b: CollectionWithStats) => {
    const diff = bnOrZero(a.priceStat?.volume ?? 0).comparedTo(b.priceStat?.volume ?? 0);
    if (diff !== 0) return diff;
    return bnOrZero(a.priceStat?.allTimeVolume ?? 0).comparedTo(b.priceStat?.allTimeVolume ?? 0)
  }

  const sort = (a: CollectionWithStats, b: CollectionWithStats, key: CollectionStatsKeys) => {
    let isPriceStats = isSortPriceStats();
    if (isPriceStats && selectedSort.includes(`${HEADERS[volumeIndex].statKey}`)) return sortByVolume(a, b);
    else if (isPriceStats) return bnOrZero(a.priceStat?.[key.priceStatKey] ?? 0).comparedTo(b.priceStat?.[key.priceStatKey] ?? 0);
    return bnOrZero(a.tokenStat?.[key.tokenStatKey] ?? 0).comparedTo(b.tokenStat?.[key.tokenStatKey] ?? 0);
  }

  const collectionSorter = () => (a: CollectionWithStats, b: CollectionWithStats) => {
    let dir = sortOrder;
    let stringKey = selectedSort
    if (dir === -1) stringKey = selectedSort.substring(1);
    let keys = {
      priceStatKey: stringKey,
      tokenStatKey: stringKey
    } as CollectionStatsKeys;

    if (dir === 1) return sort(a, b, keys);
    return sort(b, a, keys);
  };

  const fullCollections = useMemo(() => {
    let collectionsToSort = [...collections];
    let sorted = collectionsToSort.sort(collectionSorter());

    const sortByReportLevel = sorted.sort((a, b) => {
      if (a.reportLevel === REPORT_LEVEL_SUSPICIOUS && b.reportLevel !== REPORT_LEVEL_SUSPICIOUS) return 1;
      if (a.reportLevel !== REPORT_LEVEL_SUSPICIOUS && b.reportLevel === REPORT_LEVEL_SUSPICIOUS) return -1;
      return 0;
    });
    return sortByReportLevel;
  }, [collections, selectedSort]); // eslint-disable-line

  const clearSearch = () => {
    setSearch("");
  }

  const isSorted = (statKey: string) => {
    return selectedSort.includes(statKey) || selectedSort.includes(`-${statKey}`);
  }

  const handleSort = (statKey: string) => {
    if (selectedSort.includes(statKey)) {
      if (selectedSort === `-${defaultStatKey}` && defaultStatKey !== statKey) setSelectedSort(`-${statKey}`);
      else if (sortOrder === 1) setSelectedSort(`-${defaultStatKey}`);
      else setSelectedSort(`${statKey}`);
    } else {
      setSelectedSort(`-${statKey}`);
    }
  }

  return (
    <ArkPage {...rest}>
      <Container className={classes.root} maxWidth="lg">
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
          <Typography className={classes.topBarTitle} variant="h1">Featured</Typography>
          <Typography className={classes.titleDescription} variant="h4">Top NFTs at a glance. Ranked by volume, price, number of owners, and assets.</Typography>
        </Box>

        <OutlinedInput
          placeholder="Search for an artist or a collection"
          value={search}
          fullWidth
          classes={{ input: classes.inputText }}
          className={classes.input}
          onClick={handleClick}
          onChange={(e) => setSearch(e.target.value)}
          endAdornment={

            <InputAdornment position="end">
              {!!search.length && (
                <Button onClick={() => clearSearch()} className={classes.closeIcon}>
                  {/* <CloseOutlined className={classes.closeIcon} /> */}
                  <Text>Clear</Text>
                </Button>
              )}
              {!isMobileView && (
                <FormControl component="fieldset" className={classes.formControl}>
                  <FormLabel focused className={classes.formLabel}>By</FormLabel>
                  {SEARCH_FILTERS.map((filter) => (
                    <FormControlLabel
                      key={filter}
                      className={classes.formControlLabel}
                      value={filter}
                      control={
                        <Checkbox
                          className={classes.radioButton}
                          onChange={(e) => {
                            handleSearchFilter(filter)
                          }}
                          checkedIcon={<CheckedIcon />}
                          icon={<UncheckedIcon />}
                          disableRipple
                          checked={searchFilter[filter]}
                        />
                      }
                      label={filter.toUpperCase()}
                    />
                  ))}
                </FormControl>)}
            </InputAdornment>

          }
        />
        <Popper
          id={id} open={open && !!search.length} anchorEl={anchorEl}
          className={classes.popover}
          placement="bottom"
        >
          <Container maxWidth="lg"
            className={classes.popoverContainer}
          >
            {isMobileView && (
              <Box padding={2} paddingBottom={0}>
                <FormControl component="fieldset" className={classes.formControl}>
                  <FormLabel focused className={classes.formLabel}>By</FormLabel>
                  {SEARCH_FILTERS.map((filter) => (
                    <FormControlLabel
                      key={filter}
                      className={classes.formControlLabel}
                      value={filter}
                      control={
                        <Checkbox
                          className={classes.radioButton}
                          onChange={(e) => {
                            e.preventDefault();
                            handleSearchFilter(filter)
                          }}
                          checkedIcon={<CheckedIcon />}
                          icon={<UncheckedIcon />}
                          disableRipple
                          checked={searchFilter[filter]}
                        />
                      }
                      label={filter.toUpperCase()}
                    />
                  ))}
                </FormControl>
              </Box>
            )}
            {!searchFilter.collection && !searchFilter.artist && (
              <Box className={classes.emptyRow} display="flex" justifyContent="space-between" alignItems="center">
                <Typography>No filter selected</Typography>
              </Box>
            )}
            {searchFilter.collection && (
              <Fragment>
                <Box className={classes.searchResultHeader}>Collections</Box>
                {filteredSearch?.filteredCollections.map((collection, index) => (
                  <RouterLink to={`/arky/collections/${toBech32Address(collection.address)}`} key={index}>
                    <Box className={classes.popoverRow} display="flex" justifyContent="space-between" alignItems="center">
                      <Box className={classes.resultCollectionName} display="flex" alignItems="center">
                        <ArkImageView
                          imageType="avatar"
                          className={classes.searchResultAvatar}
                          imageUrl={collection.profileImageUrl}
                        />
                        {collection.name}
                      </Box>
                      <Typography>{new BigNumber(collection.tokenStat.tokenCount).toFormat(0)} Arts</Typography>
                    </Box>
                  </RouterLink>
                ))}
                {filteredSearch.filteredCollections.length === 0 && (
                  <Box className={classes.emptyRow} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography>No records found</Typography>
                  </Box>
                )}
              </Fragment>
            )}
            {searchFilter.artist && (
              <Fragment>
                <Box className={classes.searchResultHeader}>Artist</Box>
                {filteredSearch?.filteredArtist.map((collection, index) => (
                  <RouterLink to={`/arky/collections/${toBech32Address(collection.address)}`} key={index}>
                    <Box className={classes.popoverRow} display="flex" justifyContent="space-between" alignItems="center">
                      <Box className={classes.resultCollectionName} display="flex" alignItems="center">
                        <ArkImageView
                          imageType="avatar"
                          className={classes.searchResultAvatar}
                          imageUrl={collection.profileImageUrl}
                        />
                        <Box display="flex" alignItems={isSm ? "flex-start" : "center"} flexDirection={isSm ? "column" : "row"}>
                          <Box display="flex" alignItems="center" marginRight={1}>
                            {collection.name}
                          </Box>
                          <Typography className={classes.artistName}>By&nbsp;<Typography className={classes.halfOpacity}>{collection.ownerName}</Typography></Typography>
                        </Box>
                      </Box>
                      <Typography>{new BigNumber(collection.tokenStat.tokenCount).toFormat(0)} Arts</Typography>
                    </Box>
                  </RouterLink>
                ))}
                {filteredSearch.filteredArtist.length === 0 && (
                  <Box className={classes.emptyRow} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography>No records found</Typography>
                  </Box>
                )}
              </Fragment>
            )}
          </Container>
        </Popper>

        <TableContainer>
          <Table className={classes.table}>
            <TableHead>
              <TableRow>
                {HEADERS.map((header, index) => (
                  <TableCell
                    key={`offers-${index}`}
                    className={cls(classes.headerCell, (header.value === HEADERS[collectionSizeIndex].value ? classes.minWidthHeader : className))}
                    align={header.align}>
                    <Box onClick={() => handleSort(`${header.statKey}`)}
                      className={cls(classes.headerCellBox, (index !== collectionNameIndex ? classes.sortableHeaderCell : className))}
                      justifyContent={(index !== collectionNameIndex ? 'center' : 'none')}>
                      {header.value}
                      <span className={classes.iconContainer}>
                        {(index !== collectionNameIndex && index !== moreOptionsIndex && isSorted(`${header.statKey}`)) && (
                          (sortOrder === 1) ? <ArrowDropUpRounded className={classes.arrowIcon} />
                            : <ArrowDropDownRounded className={classes.arrowIcon} />
                        )}
                      </span>
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>

              {fullCollections.map((collection, i) => {
                const collectionStats = ArkClient.parseCollectionStats(collection)
                return (
                  <TableRow
                    key={collection.address}
                    className={classes.tableRow}
                    component={RouterLink}
                    to={`/arky/collections/${toBech32Address(collection.address)}`}
                  >
                    <TableCell className={cls(classes.bodyCell, classes.firstCell)}>
                      <Box className={classes.collectionNameCell}>
                        <Box className={classes.index}>{i + 1}</Box>
                        <ArkImageView
                          imageType="avatar"
                          className={classes.avatar}
                          imageUrl={collection.profileImageUrl}
                        />
                        <Box className={classes.collectionNameContainer}>
                          <Box display="flex" alignItems="center">
                            <Box className={classes.collectionName}>{collection.name}</Box>
                            {collection.reportLevel ? <WarningIcon
                              className={cls(classes.icon, collection.reportLevel === REPORT_LEVEL_WARNING ? classes.warning : classes.suspicious)} />
                              : collection.verifiedAt && (<VerifiedBadge className={classes.icon} />)}
                          </Box>
                          <Typography className={classes.ownerName}>By {collection.ownerName}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center" className={classes.bodyCell}>
                      <Box display="flex" alignItems="center" justifyContent="center">
                        <strong className={classes.amount}>
                          {collectionStats.volume ?? "-"}
                        </strong>
                        <CurrencyLogo currency="ZIL" className={classes.currencyLogo} />
                      </Box>
                    </TableCell>
                    <TableCell align="center" className={classes.bodyCell}>
                      <Box display="flex" alignItems="center" justifyContent="center">
                        <strong className={classes.amount}>
                          {collectionStats.allTimeVolume ?? "-"}
                        </strong>
                        <CurrencyLogo currency="ZIL" className={classes.currencyLogo} />
                      </Box>
                    </TableCell>
                    <TableCell align="center" className={classes.bodyCell}>
                      <Box display="flex" alignItems="center" justifyContent="center">
                        <strong className={classes.amount}>
                          {collectionStats.floorPrice ?? "-"}
                        </strong>
                        <CurrencyLogo currency="ZIL" className={classes.currencyLogo} />
                      </Box>
                    </TableCell>
                    {/* <TableCell align="center" className={cls(classes.percentCell, { [classes.isNegative]: mockedDaily.isNegative() })}> */}
                    {/* {mockedDaily.isPositive() ? '+' : ''}{mockedDaily.toFormat(2)}% */}
                    {/* {mockedWeekly.isPositive() ? '+' : ''}{mockedWeekly.toFormat(2)}% */}
                    {/* </TableCell> */}
                    <TableCell align="center" className={classes.numberCell}>
                      {collectionStats.holderCount ?? "-"}
                    </TableCell>
                    <TableCell align="center" className={cls(classes.numberCell, classes.minWidth)}>
                      {collectionStats.tokenCount ?? "-"}
                    </TableCell>
                    <TableCell align="center" className={cls(classes.numberCell, classes.lastCell)}>
                      <MoreOptionsPopper collectionAddress={collection.address} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {loading && (
            <Box display="flex" justifyContent="center" padding={2}>
              <CircularProgress />
            </Box>
          )}
        </TableContainer>
      </Container>
    </ArkPage>
  );
};

export default Discover;

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
    [theme.breakpoints.down("xs")]: {
      padding: 0,
    },
    "& .MuiRadio-colorSecondary.Mui-checked": {
      color: "rgba(222, 255, 255, 0.5)",
    },
  },
  input: {
    paddingLeft: "8px",
    paddingRight: "8px",
    marginTop: theme.spacing(2),
    borderColor: theme.palette.type === "dark" ? "rgba(222, 255, 255, 0.5)" : "rgba(0, 51, 64, 0.2)",
    marginBottom: theme.spacing(5),
  },
  inputText: {
    fontSize: "16px!important",
    padding: "18.5px 14px!important",
  },
  formControl: {
    flexDirection: "row",
  },
  formLabel: {
    alignSelf: "center",
    fontWeight: 700,
    marginRight: theme.spacing(2),
    color: `${theme.palette.primary.light}!important`,
  },
  formControlLabel: {
    "& .MuiTypography-root": {
      fontFamily: "'Raleway', sans-serif",
      fontWeight: 900,
    },
  },
  radioButton: {
    padding: "6px",
    '& svg > path': {
      fill: theme.palette.type === "dark" ? undefined : "#003340",
    },
    "&:hover": {
      background: "transparent!important",
    },
  },
  titleDescription: {
    color: theme.palette.type === "dark" ? "#26D4FF" : "#003340",
    marginBottom: "20px",
    "-webkit-text-stroke-color": "rgba(107, 225, 255, 0.2)",
    "-webkit-text-stroke-width": "1px",
  },
  image: {
    borderRadius: "0px 0px 10px 10px!important",
  },
  headerCell: {
    color: theme.palette.type === "dark" ? "#DEFFFF80" : "#00334099",
    padding: "8px 0 0 0",
    fontFamily: 'Avenir Next',
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: '0.2px',
    // opacity: 0.5,
    borderBottom: 'none',
  },
  minWidthHeader: {
    minWidth: 140
  },
  headerCellBox: {
    verticalAlign: 'middle',
    display: 'flex'
  },
  sortableHeaderCell: {
    "&:hover": {
      color: theme.palette.type === "dark" ? "#00FFB0" : "#00D895",
      cursor: 'pointer',
    },
    "&:hover svg": {
      color: theme.palette.type === "dark" ? "#00FFB0" : "#00D895",
      cursor: 'pointer',
    }
  },
  tableRow: {
    padding: 12,
    height: 72,
    background: theme.palette.type === "dark" ? "linear-gradient(173.54deg, #12222C 42.81%, #002A34 94.91%)" : "rgba(222, 255, 255, 0.5)",
  },
  bodyCell: {
    padding: "8px 16px",
    margin: 0,
    borderTop: theme.palette.type === "dark" ? "1px solid #29475A" : "1px solid rgba(107, 225, 255, 0.2)",
    borderBottom: theme.palette.type === "dark" ? "1px solid #29475A" : "1px solid rgba(107, 225, 255, 0.2)",
    fontFamily: "'Raleway', sans-serif",
    fontWeight: 900,
    fontSize: "20px",
    lineHeight: "16px",
    color: theme.palette.text?.primary,
  },
  percentCell: {
    extend: 'bodyCell',
    fontSize: 18,
    color: '#00FFB0',
  },
  numberCell: {
    extend: 'bodyCell',
    fontSize: 18,
  },
  firstCell: {
    borderLeft: theme.palette.type === "dark" ? "1px solid #29475A" : "1px solid rgba(107, 225, 255, 0.2)",
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  lastCell: {
    borderRight: theme.palette.type === "dark" ? "1px solid #29475A" : "1px solid rgba(107, 225, 255, 0.2)",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    padding: 24
  },
  amount: {
    fontWeight: 800,
  },
  table: {
    borderCollapse: 'separate',
    borderSpacing: '0px 12px',
  },
  currencyLogo: {
    margin: theme.spacing(0, 1),
    "& svg": {
      display: "block",
    }
  },
  avatar: {
    height: 40,
    width: 40,
    [theme.breakpoints.down('md')]: {
      height: 24,
      width: 24,
    }
  },
  rowText: {
    fontFamily: "'Raleway', sans-serif",
    fontWeight: 900,
    fontSize: "18px",
    lineHeight: "16px",
    color: theme.palette.text?.primary,
  },
  icon: {
    marginLeft: "4px",
    marginTop: 2,
    width: "20px",
    height: "20px",
    verticalAlign: "text-top",
    alignSelf: 'flex-start',
    [theme.breakpoints.down('md')]: {
      height: 14,
      width: 14,
    }
  },
  index: {
    margin: "0px 14px",
  },
  collectionNameCell: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    minWidth: 240,
  },
  collectionNameContainer: {
    marginLeft: "14px",
    display: "flex",
    flexDirection: "column",
  },
  collectionName: {
    [theme.breakpoints.down('md')]: {
      fontSize: 14,
    }
  },
  ownerName: {
    marginTop: 2,
  },
  isNegative: {
    color: theme.palette.error.main,
  },
  topBarTitle: {
    fontSize: "48px",
    margin: "0 0 48px 0px",
  },
  popover: {
    marginTop: 8,
  },
  popoverContainer: {
    backgroundColor: theme.palette.type === "dark" ? "#223139" : "#D4FFF2",
    width: 1230,
    borderRadius: 12,
    border: theme.palette.type === "dark" ? "1px solid #29475A" : "1px solid rgba(107, 225, 255, 0.2)",
    padding: 0,
    maxHeight: 600,
    overflowY: "scroll",
    "&::-webkit-scrollbar": {
      width: "0.4rem"
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: `rgba${hexToRGBA(theme.palette.type === "dark" ? "#DEFFFF" : "#003340", 0.1)}`,
      borderRadius: 12
    },
    [theme.breakpoints.down("md")]: {
      width: 'calc(100vw - 128px)',
      maxHeight: 400,
    },
    [theme.breakpoints.down("xs")]: {
      width: '100%',
      maxHeight: 300,
    }
  },
  popoverRow: {
    padding: '12px 24px',
    fontFamily: 'Avenir Next',
    color: theme.palette.type === "dark" ? "#DEFFFF" : "#0D1B24",
    borderRadius: 12,
    fontWeight: 700,
    [theme.breakpoints.down('sm')]: {
      width: '92vw',
      padding: '10px 18px',
    },
    "&:hover": {
      backgroundColor: theme.palette.type === "dark" ? "#4E5A60" : "#A9CCC1",
    },
  },
  emptyRow: {
    padding: '12px 24px',
    fontFamily: 'Avenir Next',
    color: theme.palette.type === "dark" ? "#DEFFFF" : "#0D1B24",
    borderRadius: 12,
    fontWeight: 700,
    [theme.breakpoints.down('sm')]: {
      width: '92vw',
      padding: '10px 18px',
    },
    opacity: 0.5,
  },
  resultCollectionName: {
    fontFamily: 'Avenir Next',
    fontSize: 18,
    [theme.breakpoints.down('sm')]: {
      fontSize: 16,
    },
    fontWeight: 700,
  },
  searchResultHeader: {
    color: theme.palette.type === "dark" ? "#DEFFFF" : "#0D1B24",
    opacity: 0.5,
    textTransform: 'uppercase',
    padding: '20px 24px 6px 24px',
    fontWeight: 900,
    fontFamily: "'Raleway', sans-serif",
    [theme.breakpoints.down('sm')]: {
      padding: '14px 18px 4px 18px',
    },
  },
  searchResultAvatar: {
    height: 30,
    marginRight: 8,
    width: 30,
    [theme.breakpoints.down('md')]: {
      height: 20,
      width: 20,
    }
  },
  halfOpacity: {
    opacity: 0.5
  },
  artistName: {
    display: "flex",
  },
  closeIcon: {
    color: theme.palette.text?.primary,
    // fontSize: 18,
    marginRight: theme.spacing(.5),
  },
  minWidth: {
    minWidth: 100
  },
  warning: {
    color: theme.palette.warning.light
  },
  suspicious: {
    color: "#FF5252"
  },
  arrowIcon: {
    color: theme.palette.type === "dark" ? "#DEFFFF80" : "#00334099",
    marginRight: '0 !important',
  },
  iconContainer: {
    height: 24,
    width: 24
  }
}));
