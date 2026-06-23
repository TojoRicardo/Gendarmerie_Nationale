import RouteProtegee from '../components/authentification/RouteProtegee'
import Layout from '../Layout'

const ProtectedLayout = () => (
  <RouteProtegee>
    <Layout />
  </RouteProtegee>
)

export default ProtectedLayout
