import { getSimulation } from '@/features/cost-simulation/service'
import { CostSimulator } from './cost-simulator'

/** STEP 6: 原価・利益シミュレーション(要件37〜41)。 */
export default async function CostPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const simulation = await getSimulation(projectId)

  return (
    <CostSimulator
      projectId={projectId}
      initial={{
        sellingPrice: simulation.sellingPrice,
        manufacturingCost: simulation.manufacturingCost,
        shipping: simulation.shipping,
        importCost: simulation.importCost,
        tax: simulation.tax,
        packaging: simulation.packaging,
        amazonFeeRate: simulation.amazonFeeRate,
        fbaFee: simulation.fbaFee,
        advertisingRate: simulation.advertisingRate,
        returnRate: simulation.returnRate,
        otherCost: simulation.otherCost,
        monthlyUnits: simulation.monthlyUnits,
        fixedCost: simulation.fixedCost,
      }}
    />
  )
}
