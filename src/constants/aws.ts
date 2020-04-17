import * as path from 'path'

// export const AWS_CONFIG_DIR = '/ops/.aws'

const regionCodes = {
  'us-east-1': 'US East (N. Virginia)',
  'us-east-2': 'US East (Ohio)',
  'us-west-2': 'US West (Oregon)',
  // 'ap-east-1': 'Asia Pacific (Hong Kong)', - requires user opt-in
  'ap-south-1': 'Asian Pacific (Mumbai)',
  'ap-northeast-1': 'Asia Pacific (Tokyo)',
  // 'ap-northeast-2': 'Asia Pacific (Seoul)', - limited support
  'ap-southeast-1': 'Asia Pacific (Singapore)',
  'ap-southeast-2': 'Asia Pacific (Sydney)',
  'eu-central-1': 'EU (Frankfurt)',
  // 'eu-north-1': 'EU (Stockholm)', - limited support
  'eu-west-1': 'EU (Ireland)',
  'eu-west-2': 'EU (London)',
  'eu-west-3': 'EU (Paris)',
  // 'me-south-1': 'Middle East (Bahrain)', - requires user opt-in
  'sa-east-1': 'South America (São Paulo)',
}

const MAX_LEN_REGION_CODE = 18

// export const AWS_REGIONS = Object.entries(regionCodes).map(
//   ([code, longName]: [string, string]) => {
//     const nSpaces = Array.from({
//       length: MAX_LEN_REGION_CODE - code.length,
//     }).join(' ')
//     return {
//       name: `${code}${nSpaces}${longName}`,
//       value: code,
//       short: code,
//     }
//   },
// )

export const AWS_REGIONS = Object.keys(regionCodes)

