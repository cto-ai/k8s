import { sdk } from '@cto.ai/sdk'
import { TrackingData } from '../types'

export const track = (trackingData: TrackingData) => {
  try {
    const metadata = {
      interfaceType: sdk.getInterfaceType(),
      ...trackingData,
    }
    sdk.track(['track', 'delivery.sh', 'k8s'], metadata)
  } catch (err) {
    // uncomment when need to debug --otherwise will produce a lot of text
    // sdk.log(err.response)
  }
}
