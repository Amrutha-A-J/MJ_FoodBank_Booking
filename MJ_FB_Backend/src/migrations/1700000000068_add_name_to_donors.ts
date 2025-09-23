import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.noTransaction();

  pgm.addColumn(
    'donors',
    {
      name: { type: 'text' },
    },
    { ifNotExists: true },
  );

  pgm.sql(`
    UPDATE donors
       SET name = COALESCE(
         NULLIF(
           BTRIM(
             CONCAT_WS(
               ' ',
               NULLIF(BTRIM(first_name), ''),
               NULLIF(BTRIM(last_name), '')
             )
           ),
           ''
         ),
         CONCAT('Donor ', id)
       )
  `);

  const rawDonorNames = [
    'AAWARRIORS',
    'MOOSE JAW ALLICANCE CHURCH',
    'A&W',
    'AVE LIVING',
    'AVONLEA SCHOOL',
    '15 WING',
    'BENTLY',
    'BETTER HOMES & GARDENS',
    'FOOD BANK BINS',
    'BUDGET BLINDS',
    'BUILDING BLOCKS DAY CARE',
    'BULK BARN',
    'BOUNCE A LOT CASINO',
    'CAE BASE',
    'CARONPORT/BRIERCREST SCHOOL',
    'CENTRAL BUTTE UNITED CHURCH',
    'CENTRAL COLLEGIATE SCHOOL',
    'CENTRAL LUTHERAN CHURCH',
    'SHERYL SCHOLAR',
    "CHARLOTTES CATERING",
    'CHAPLIN LUTHERAN CHURCH',
    'CHURCH OF CHRIST',
    'CHURCH OF OUR LADY',
    'CHURCH OF GOD',
    'COOPERATORS',
    'COO-OP GROCERY',
    'CO-OP BIN',
    'CO-OP(GOODBUY TO HUNGER)',
    'CORNACHE UNITED CHURCH',
    'CORNERSTONE CHRISTIAN SCHOOL',
    'CONEXUS',
    'COMMUNITY GARDENS',
    'CORONACH UNITED CHURCH',
    'CULTURAL CENTER',
    'DANCE IMAGES',
    'DOEPKER INDUSTRIES',
    'EMMANUAL LUTHERAN CHURCH',
    'EMPIRE SCHOOL',
    'EXTENDICARE',
    'ELECTRIC FOG',
    'FARM CREDIT',
    'FINEFOODS PRODUCE',
    'FRATURNAL ORDER OF EAGLES',
    'FRENCH SCHOOL DAYCARE',
    'FIRST BAPTIST CHURCH',
    'FOOD BANKS SASKATCHEWAN',
    'FOOD BANKS CANADA',
    'BAILDON COLONY',
    'FCC FOOD DRIVE',
    'GIRLGUIDES',
    'GIANT TIGER',
    'GATX RAIL',
    'JUDO CLUB SASK',
    'HILLCREST APOSTOLIC CHURCH(BETTER TOGETHER FOOD DRIVE)',
    'HERITAGE INN',
    'HUNGER IN MOOSE JAW',
    'HUB MEATS',
    'HUTTERITTES COLONLY',
    'CPKC HOLIDAY TRAIN',
    'INVESTORS GROUP',
    'KEONS',
    'KINSMEN SANTA PARADE',
    'KINSMEN MOVIE NIGHT',
    'KIMS TAE KWON DO',
    'KFC',
    'KING GEORGE SCHOOL',
    'LIVE STRONG FITNESS',
    'LABOUR DISTRIC COUNCIL',
    'LINDALE SCHOOL',
    'HUNGER IN MOOSE JAW',
    'MANKOTA UNITED CHURCH',
    'MAGIC BY CHRIS',
    'MINTO UNITED CHURCH',
    'MJ MINOR FOOTBALL',
    'MJ TRISKELIONS REGIONAL COUNCIL',
    'MJREFINERY',
    'MOOSE JAW CULTURAL CENTER',
    'MJWARRIORS',
    'MORTLACH SCHOOL',
    'MULLBERRY ESTATES',
    'MOSAIC FOOD FARM',
    'NUTTERS',
    'PAARISH & HEIMBECKER',
    'PARADE HOMETOWN',
    'PAMPERED CHEF',
    'PALLISER HEIGHTS SCHOOL',
    'PEACOCK SCHOOL',
    'PIONEER LODGE',
    'PETFOOD/PETVALUE',
    'PRAIRIE OASIS',
    'PRINCESS TEA',
    'PRINCE ARTHUR SCHOOL',
    'PRIVATE DONATIONS',
    'RIVERSIDE MISSION(SOULS HARBOUR)',
    'PRODUC PRIVATE HUTTERITE COLONIESE/5 FT CHALL',
    'PRODUCE SAFEWAY',
    'PRODUCE WALMART',
    'PRODUCE PRIVATE',
    'PRODUCE BTFD',
    'PRODUC PHARMASAVE',
    'FOOD SHARE REGINA',
    'NO FRILLS',
    'ROYAL BANK',
    'NEXT GEN CAR SHOW(SPRING)',
    'MAKE SPACE STORAGE',
    'NEXT GEN CAR SHOW (FALL)',
    'RIVERVIEW COLLEGIATE',
    'UNION SOUTH STEEL',
    'UNIION BBQ',
    'UNION GROCERY',
    'SACRED HEART SCHOOL',
    'SAFEWAY',
    'SAFEWAY (BINS)',
    'SASKTEL',
    'SASK ENERGY',
    'SASK WATER',
    'SASK SPCA',
    'SECOND CHANCE THRIFT STORE',
    'SIAST',
    'SEIU WEST',
    'SHOOPER DRUG MART (SECOND HARVEST)',
    'SOBEYS',
    'STARBUCKS',
    'ST.AGNUS SCHOOL',
    'ST. AIDEN SCHOOL',
    'ST. ANDREW CHURCH',
    'ST. BARNABAS CHURCH',
    'ST.JOSEPHS CHURCH',
    "ST.MARGARET SCHOOL",
    'ST.MARKS CHURCH',
    "ST.MARY'S SCHOOL",
    'ST.MICHAELS SCHOOL',
    'SUNNINGDALE SCHOOL',
    'SUPERSTORE SECOND HARVEST',
    'SUPERSTORE BIN',
    'SUPERSTORE(SPRING)FEED MORE FAMILIES',
    'SUPERSTORE(FILL THE VAN)',
    'SUPERSTORE',
    'SUPERSTORE (FALL)',
    'TRADE SHOW',
    'TRANSITION HOUSE',
    'TEMPLE GARDENS',
    'TOWN N COUNTRY MALL',
    'TRINITY UNITED CHURCH',
    'TWISTED SISTER ICE CREAM PARLOR',
    'VANIER COLLEGIATE',
    'VEROBAS',
    'VICTORIA TOWERS',
    'VILLAGE OF TUXFORD',
    'WAREHOUSE ONE JEANS',
    'WALMART',
    'WALMART(FIGHT HUNGER SPARK CHANGE)',
    'WALKAMOW VALLEY',
    'WELLS CAMERA A& SOUND',
    'WESTMOUNT SCHOOL',
    'WINDSOR SALT',
    'WILLIAM GRAYSON SCHOOL',
    'ZOMBIE WALK',
    'ZION CHURCH',
  ];
  const donorNames = Array.from(
    new Set(
      rawDonorNames
        .map(name => name.trim())
        .filter(name => name.length > 0),
    ),
  );

  if (donorNames.length > 0) {
    const donorArrayLiteral = donorNames
      .map(name => `'${name.replace(/'/g, "''")}'`)
      .join(',\n      ');

    pgm.sql(`
      INSERT INTO donors (name)
      SELECT DISTINCT donor_name
        FROM UNNEST(ARRAY[
          ${donorArrayLiteral}
        ]::text[]) AS donor_name
      WHERE donor_name <> ''
        AND NOT EXISTS (
          SELECT 1
            FROM donors existing
           WHERE existing.name = donor_name
        );
    `);
  }

  pgm.alterColumn('donors', 'name', { notNull: true });

  pgm.dropColumn('donors', 'first_name');
  pgm.dropColumn('donors', 'last_name');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('donors', {
    first_name: { type: 'text' },
    last_name: { type: 'text' },
  });

  pgm.sql(`
    UPDATE donors
       SET first_name = split_part(name, ' ', 1),
           last_name = COALESCE(
             NULLIF(
               BTRIM(REGEXP_REPLACE(name, '^\\s*[^\\s]+\\s*', '')),
               ''
             ),
             ''
           )
  `);

  pgm.alterColumn('donors', 'first_name', { notNull: true });
  pgm.alterColumn('donors', 'last_name', { notNull: true });

  pgm.dropColumn('donors', 'name');
}
