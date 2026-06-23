import { Suspense } from 'react'
import LoadingFallback from '../components/LoadingFallback'

const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<LoadingFallback />}>
    {children}
  </Suspense>
)

export default SuspenseWrapper
