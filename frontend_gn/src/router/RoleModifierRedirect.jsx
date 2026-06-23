import { Navigate, useParams } from 'react-router-dom'

const RoleModifierRedirect = () => {
  const { id } = useParams()
  return <Navigate to={`/roles/modifier/${id}`} replace />
}

export default RoleModifierRedirect
